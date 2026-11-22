import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../config/db.js'
import { clearAuthCookie, requireAuth, setAuthCookie, signAuthToken } from '../middleware/auth.js'
import { verifyTurnstile } from '../middleware/turnstile.js'
import { mapUserRow } from '../utils/dto.js'
import { appendActivityLog, getIsoDateTime, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

/**
 * GET /api/auth/me
 * Returns currently authenticated user from HttpOnly JWT cookie.
 */
router.get('/me', requireAuth, (req, res) => {
  return sendSuccess(res, 200, 'Sesi pengguna aktif.', mapUserRow(req.user))
})

/**
 * POST /api/auth/login
 * Validates credentials, Turnstile token, account status (ACTIVE vs SUSPENDED), and roleHint.
 */
router.post('/login', verifyTurnstile, (req, res) => {
  const { email, password, roleHint } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  const errors = {}
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    errors.email = 'Masukkan alamat email yang valid.'
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    errors.password = 'Password wajib diisi minimal 6 karakter.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi form login gagal.', errors)
  }

  const db = getDb()
  const userRow = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (!userRow || !bcrypt.compareSync(cleanPassword, userRow.password)) {
    return sendError(res, 401, 'Email atau password tidak valid.', {
      email: 'Email atau password yang Anda masukkan salah.',
    })
  }

  if (userRow.status === 'SUSPENDED') {
    return sendError(
      res,
      403,
      'Akun ini sedang berstatus SUSPENDED. Hubungi tim Support Hostuner.',
      { email: 'Akun ini sedang berstatus SUSPENDED.' }
    )
  }

  if (roleHint === 'admin' && userRow.role !== 'admin') {
    return sendError(
      res,
      403,
      'Akun ini tidak memiliki hak akses Administrator. Gunakan akun Admin atau kembali ke Login Client.',
      { email: 'Akun ini bukan Administrator.' }
    )
  }

  const token = signAuthToken(userRow)
  setAuthCookie(res, token)
  appendActivityLog(
    'user',
    'LOGIN',
    `${userRow.name} (${userRow.email}) berhasil masuk sebagai ${userRow.role.toUpperCase()}`,
    db
  )

  return sendSuccess(res, 200, 'Login berhasil.', mapUserRow(userRow))
})

/**
 * POST /api/auth/register
 * Registers a new customer account with bcrypt password hashing and sets HttpOnly JWT cookie.
 */
router.post('/register', verifyTurnstile, (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    company,
    address,
    city,
    postcode,
    country,
  } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')
  const cleanPhone = String(phone || '').trim()

  const errors = {}
  if (cleanName.length < 2) {
    errors.name = 'Nama lengkap wajib diisi minimal 2 karakter.'
  }
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    errors.email = 'Format alamat email tidak valid.'
  }
  if (cleanPassword.length < 6) {
    errors.password = 'Password wajib diisi minimal 6 karakter.'
  }
  if (cleanPhone.length < 8) {
    errors.phone = 'Nomor telepon wajib diisi minimal 8 karakter.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi data pendaftaran gagal.', errors)
  }

  const db = getDb()
  const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (existing) {
    return sendError(res, 409, 'Email sudah terdaftar.', {
      email: 'Alamat email ini sudah digunakan. Silakan login atau gunakan email lain.',
    })
  }

  const passwordHash = bcrypt.hashSync(cleanPassword, 10)
  const createdAt = getIsoDateTime()

  const info = db
    .prepare(
      `INSERT INTO users (name, email, password, role, phone, company, address, city, postcode, country, status, created_at)
       VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`
    )
    .run(
      cleanName,
      cleanEmail,
      passwordHash,
      cleanPhone,
      company ? String(company).trim() : null,
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      postcode ? String(postcode).trim() : null,
      country ? String(country).trim() : 'Indonesia',
      createdAt
    )

  const newUserRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(info.lastInsertRowid))
  const token = signAuthToken(newUserRow)
  setAuthCookie(res, token)

  appendActivityLog(
    'user',
    'REGISTER',
    `${newUserRow.name} (${newUserRow.email}) mendaftar akun pelanggan baru`,
    db
  )

  return sendSuccess(res, 201, 'Registrasi berhasil.', mapUserRow(newUserRow))
})

/**
 * POST /api/auth/logout
 * Clears HttpOnly JWT cookie.
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  return sendSuccess(res, 200, 'Anda telah keluar dari sesi.', null)
})

export default router
