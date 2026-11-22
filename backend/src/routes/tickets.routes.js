import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { getDb } from '../config/db.js'
import { BACKEND_ROOT } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
import { mapTicketRow } from '../utils/dto.js'
import { appendActivityLog, getIsoDateTime, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const uploadDir = path.join(BACKEND_ROOT, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase()
      cb(null, `proof-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max per Document 02
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!allowed.includes(ext)) {
      return cb(new Error('Format lampiran harus berupa JPG, PNG, atau PDF (maksimal 2 MB).'))
    }
    return cb(null, true)
  },
})

function optionalTicketUpload(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    return upload.single('attachment')(req, res, (err) => {
      if (err) {
        return sendError(res, 422, err.message, { attachment: err.message })
      }
      return next()
    })
  }
  return next()
}

/**
 * GET /api/tickets/me
 * Protected by `requireAuth` (aligned with `/tickets` and `/tickets/open` login gate).
 */
router.get('/me', requireAuth, (req, res) => {
  const db = getDb()
  const rows =
    req.user.role === 'admin'
      ? db.prepare(`SELECT * FROM tickets ORDER BY id DESC`).all()
      : db
          .prepare(`SELECT * FROM tickets WHERE user_id = ? OR LOWER(user_email) = LOWER(?) ORDER BY id DESC`)
          .all(Number(req.user.id), req.user.email)

  return sendSuccess(res, 200, 'Daftar tiket dukungan berhasil dimuat.', rows.map(mapTicketRow))
})

/**
 * POST /api/tickets
 * Protected by `requireAuth` (aligned with `/tickets/open` login gate).
 * Supports both `application/json` and `multipart/form-data`.
 */
router.post('/', requireAuth, optionalTicketUpload, (req, res) => {
  const { department, subject, message, invoiceNumber } = req.body || {}
  const cleanSubject = String(subject || '').trim()
  const cleanMessage = String(message || '').trim()
  const cleanDept =
    department === 'Konfirmasi Pembayaran' || department === 'Support'
      ? department
      : 'Konfirmasi Pembayaran'

  const errors = {}
  if (cleanSubject.length < 3) {
    errors.subject = 'Subjek tiket wajib diisi minimal 3 karakter.'
  }
  if (cleanMessage.length < 5) {
    errors.message = 'Isi pesan tiket wajib diisi minimal 5 karakter.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi form tiket gagal.', errors)
  }

  const db = getDb()
  const ticketUid = `t-${Date.now()}`
  const ticketNumber = `#${Math.floor(100000 + Math.random() * 899999)}`
  const createdAt = getIsoDateTime()
  const attachmentPath = req.file ? req.file.filename : null
  const cleanInvoice = invoiceNumber ? String(invoiceNumber).trim().replace(/^#/, '') : null

  const info = db
    .prepare(
      `INSERT INTO tickets (
        ticket_uid, ticket_number, user_id, user_email, department,
        subject, message, invoice_number, attachment_path, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)`
    )
    .run(
      ticketUid,
      ticketNumber,
      Number(req.user.id),
      req.user.email,
      cleanDept,
      cleanSubject,
      cleanMessage,
      cleanInvoice,
      attachmentPath,
      createdAt
    )

  const createdRow = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(Number(info.lastInsertRowid))
  appendActivityLog(
    'payment',
    'TICKET',
    `Tiket ${ticketNumber} (${cleanDept}) dikirim oleh ${req.user.email}`,
    db
  )

  return sendSuccess(res, 201, `Tiket bantuan ${ticketNumber} berhasil dikirim.`, mapTicketRow(createdRow))
})

export default router
