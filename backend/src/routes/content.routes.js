import { Router } from 'express'
import { getDb } from '../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { mapAnnouncementRow, mapKbRow } from '../utils/dto.js'
import { appendActivityLog, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

/**
 * GET /api/announcements
 */
router.get('/announcements', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM announcements ORDER BY id DESC`).all()
  return sendSuccess(res, 200, 'Daftar pengumuman berhasil dimuat.', rows.map(mapAnnouncementRow))
})

/**
 * POST /api/admin/announcements
 */
router.post('/admin/announcements', requireAuth, requireAdmin, (req, res) => {
  const { title, body, dateLabel, monthGroup } = req.body || {}
  const cleanTitle = String(title || '').trim()
  const cleanBody = String(body || '').trim()

  if (cleanTitle.length < 3 || cleanBody.length < 5) {
    return sendError(res, 422, 'Judul dan isi pengumuman wajib diisi.', {
      title: cleanTitle.length < 3 ? 'Judul minimal 3 karakter.' : undefined,
      body: cleanBody.length < 5 ? 'Isi pengumuman minimal 5 karakter.' : undefined,
    })
  }

  const db = getDb()
  const annUid = `ann-${Date.now()}`
  const info = db
    .prepare(
      `INSERT INTO announcements (ann_uid, date_label, month_group, title, body)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(annUid, dateLabel || 'Nov 22nd', monthGroup || 'Oktober 2026', cleanTitle, cleanBody)

  const row = db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(Number(info.lastInsertRowid))
  appendActivityLog('product', 'NEWS', `Announcement baru "${cleanTitle}" dipublikasikan`, db)

  return sendSuccess(res, 201, 'Pengumuman berhasil dipublikasikan.', mapAnnouncementRow(row))
})

/**
 * GET /api/kb
 */
router.get('/kb', (req, res) => {
  const { category } = req.query || {}
  const db = getDb()

  let sql = `SELECT * FROM kb_articles WHERE 1=1`
  const params = []
  if (category && ['hosting', 'vps'].includes(String(category))) {
    sql += ` AND category_slug = ?`
    params.push(String(category))
  }
  sql += ` ORDER BY id ASC`

  const rows = db.prepare(sql).all(...params)
  return sendSuccess(res, 200, 'Daftar artikel Knowledgebase berhasil dimuat.', rows.map(mapKbRow))
})

/**
 * POST /api/admin/kb
 */
router.post('/admin/kb', requireAuth, requireAdmin, (req, res) => {
  const { categorySlug, title, content } = req.body || {}
  const cleanTitle = String(title || '').trim()
  const cleanContent = String(content || '').trim()
  const cleanCat = categorySlug === 'vps' ? 'vps' : 'hosting'

  if (cleanTitle.length < 3 || cleanContent.length < 10) {
    return sendError(res, 422, 'Judul dan konten artikel Knowledgebase wajib diisi.')
  }

  const db = getDb()
  const kbUid = `kb-${Date.now()}`
  const slug = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-4)}`
  const snippet = `${cleanContent.slice(0, 96)}...`
  const updatedAt = new Date().toISOString().slice(0, 10)

  const info = db
    .prepare(
      `INSERT INTO kb_articles (kb_uid, slug, category_slug, category_label, title, snippet, content, views, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(
      kbUid,
      slug,
      cleanCat,
      cleanCat === 'hosting' ? 'Hosting' : 'VPS',
      cleanTitle,
      snippet,
      cleanContent,
      updatedAt
    )

  const row = db.prepare(`SELECT * FROM kb_articles WHERE id = ?`).get(Number(info.lastInsertRowid))
  appendActivityLog('product', 'ARTICLE', `Artikel KB "${cleanTitle}" diterbitkan`, db)

  return sendSuccess(res, 201, 'Artikel Knowledgebase berhasil diterbitkan.', mapKbRow(row))
})

/**
 * POST /api/contact
 */
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {}
  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim()
  const cleanSubject = String(subject || '').trim()
  const cleanMessage = String(message || '').trim()

  if (!cleanName || !cleanEmail || !cleanSubject || !cleanMessage) {
    return sendError(res, 422, 'Seluruh kolom pesan kontak wajib diisi.')
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO contact_messages (name, email, subject, message)
     VALUES (?, ?, ?, ?)`
  ).run(cleanName, cleanEmail, cleanSubject, cleanMessage)

  return sendSuccess(res, 201, 'Pesan Anda telah diterima oleh tim Pre-Sales Hostuner.', null)
})

export default router
