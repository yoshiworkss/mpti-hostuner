import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../config/db.js'
import { DEFAULT_DEMO_PASSWORD } from '../db/seedData.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { mapInvoiceRow, mapLogRow, mapProductRow, mapUserRow } from '../utils/dto.js'
import { appendActivityLog, formatIdr, getIsoDateTime, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

// All /api/admin/* endpoints strictly require authenticated Admin role!
router.use(requireAuth, requireAdmin)

function buildSlug(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function validateAndNormalizeProductPayload(body, db, existingId = null) {
  const {
    categoryId,
    categorySlug,
    name,
    slug,
    priceMonthly,
    priceAnnual,
    displayCycle,
    diskSpace,
    bandwidth,
    specs,
    isFreeDomain,
    stockLabel,
    isFeatured,
  } = body || {}

  const errors = {}
  const cleanName = String(name || '').trim()
  if (cleanName.length < 3) {
    errors.name = 'Nama paket minimal 3 karakter.'
  }

  const monthlyNum = Number(priceMonthly)
  const annualNum = Number(priceAnnual)
  if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) {
    errors.priceMonthly = 'Harga bulanan harus berupa angka lebih dari 0.'
  }
  if (!Number.isFinite(annualNum) || annualNum <= 0) {
    errors.priceAnnual = 'Harga tahunan harus berupa angka lebih dari 0.'
  }

  const cleanDisk = String(diskSpace || '').trim()
  const cleanBw = String(bandwidth || '').trim()
  if (!cleanDisk) {
    errors.diskSpace = 'Kapasitas disk space wajib diisi.'
  }
  if (!cleanBw) {
    errors.bandwidth = 'Spesifikasi bandwidth wajib diisi.'
  }

  let parsedSpecs = []
  if (Array.isArray(specs)) {
    parsedSpecs = specs.map((s) => String(s).trim()).filter(Boolean)
  } else if (typeof specs === 'string') {
    parsedSpecs = specs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (parsedSpecs.length === 0) {
    errors.specs = 'Minimal 1 poin spesifikasi teknis wajib diisi.'
  }

  let catRow = null
  if (categorySlug) {
    catRow = db.prepare(`SELECT * FROM categories WHERE slug = ?`).get(String(categorySlug).trim())
  }
  if (!catRow && categoryId) {
    catRow = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(Number(categoryId))
  }
  if (!catRow) {
    errors.categorySlug = 'Kategori produk tidak valid atau tidak ditemukan.'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  let cleanSlug = buildSlug(slug || cleanName)
  const slugConflict = db
    .prepare(`SELECT id FROM products WHERE slug = ? AND (? IS NULL OR id != ?)`)
    .get(cleanSlug, existingId, existingId)
  if (slugConflict) {
    cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`
  }

  return {
    data: {
      categoryId: Number(catRow.id),
      categorySlug: catRow.slug,
      name: cleanName,
      slug: cleanSlug,
      priceMonthly: Math.round(monthlyNum),
      priceAnnual: Math.round(annualNum),
      displayCycle: displayCycle === 'annually' ? 'annually' : 'monthly',
      diskSpace: cleanDisk,
      bandwidth: cleanBw,
      specsJson: JSON.stringify(parsedSpecs),
      isFreeDomain: isFreeDomain ? 1 : 0,
      stockLabel: stockLabel && String(stockLabel).trim() ? String(stockLabel).trim() : null,
      isFeatured: isFeatured ? 1 : 0,
    },
  }
}

/**
 * POST /api/admin/products
 * Create a new hosting/VPS product (UC-05).
 */
router.post('/products', (req, res) => {
  const db = getDb()
  const { data, errors } = validateAndNormalizeProductPayload(req.body, db, null)
  if (errors) {
    return sendError(res, 422, 'Validasi data produk gagal.', errors)
  }

  const info = db
    .prepare(
      `INSERT INTO products (
        category_id, name, slug, price_monthly, price_annual,
        display_cycle, disk_space, bandwidth, specs,
        is_free_domain, stock_label, is_featured
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.categoryId,
      data.name,
      data.slug,
      data.priceMonthly,
      data.priceAnnual,
      data.displayCycle,
      data.diskSpace,
      data.bandwidth,
      data.specsJson,
      data.isFreeDomain,
      data.stockLabel,
      data.isFeatured
    )

  const row = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    )
    .get(Number(info.lastInsertRowid))

  appendActivityLog(
    'product',
    'CREATE',
    `${row.name} (${row.category_slug}) — ${formatIdr(row.price_monthly)}/bln ditambahkan oleh Admin`,
    db
  )

  return sendSuccess(res, 201, `Produk ${row.name} berhasil ditambahkan.`, mapProductRow(row))
})

/**
 * PUT /api/admin/products/:id
 * Update an existing hosting/VPS product (UC-05).
 */
router.put('/products/:id', (req, res) => {
  const productId = Number(req.params.id)
  const db = getDb()

  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId)
  if (!existing) {
    return sendError(res, 404, `Produk dengan ID ${productId} tidak ditemukan.`)
  }

  const { data, errors } = validateAndNormalizeProductPayload(req.body, db, productId)
  if (errors) {
    return sendError(res, 422, 'Validasi pembaruan produk gagal.', errors)
  }

  db.prepare(
    `UPDATE products
     SET category_id = ?, name = ?, slug = ?, price_monthly = ?, price_annual = ?,
         display_cycle = ?, disk_space = ?, bandwidth = ?, specs = ?,
         is_free_domain = ?, stock_label = ?, is_featured = ?
     WHERE id = ?`
  ).run(
    data.categoryId,
    data.name,
    data.slug,
    data.priceMonthly,
    data.priceAnnual,
    data.displayCycle,
    data.diskSpace,
    data.bandwidth,
    data.specsJson,
    data.isFreeDomain,
    data.stockLabel,
    data.isFeatured,
    productId
  )

  const updatedRow = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    )
    .get(productId)

  appendActivityLog(
    'product',
    'UPDATE',
    `${updatedRow.name} (${updatedRow.category_slug}) — ${formatIdr(updatedRow.price_monthly)}/bln diperbarui oleh Admin`,
    db
  )

  return sendSuccess(res, 200, `Produk ${updatedRow.name} berhasil diperbarui.`, mapProductRow(updatedRow))
})

/**
 * DELETE /api/admin/products/:id
 * Deletes a product (returns friendly 409 if referenced in order_items).
 */
router.delete('/products/:id', (req, res) => {
  const productId = Number(req.params.id)
  const db = getDb()

  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId)
  if (!existing) {
    return sendError(res, 404, `Produk dengan ID ${productId} tidak ditemukan.`)
  }

  const usedInOrder = db
    .prepare(`SELECT id FROM order_items WHERE product_id = ? LIMIT 1`)
    .get(productId)
  if (usedInOrder) {
    return sendError(
      res,
      409,
      `Paket "${existing.name}" tidak dapat dihapus karena sedang digunakan pada riwayat pesanan/layanan pelanggan.`
    )
  }

  db.prepare(`DELETE FROM products WHERE id = ?`).run(productId)
  appendActivityLog('product', 'DELETE', `Produk ${existing.name} dihapus oleh Admin`, db)

  return sendSuccess(res, 200, `Produk ${existing.name} berhasil dihapus.`, null)
})

/**
 * GET /api/admin/users
 * Lists all users (without password field).
 */
router.get('/users', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM users ORDER BY id ASC`).all()
  return sendSuccess(res, 200, 'Daftar pengguna berhasil dimuat.', rows.map(mapUserRow))
})

/**
 * POST /api/admin/users
 * Creates a new user account from Admin CRUD User (UC-06).
 */
router.post('/users', (req, res) => {
  const { name, email, password, phone, company, address, city, postcode, country, role, status } =
    req.body || {}

  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPhone = String(phone || '').trim()
  const cleanRole = role === 'admin' ? 'admin' : 'customer'
  const cleanStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'

  const errors = {}
  if (cleanName.length < 2) {
    errors.name = 'Nama lengkap wajib diisi minimal 2 karakter.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = 'Format alamat email tidak valid.'
  }
  if (cleanPhone.length < 8) {
    errors.phone = 'Nomor telepon minimal 8 digit.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi data user gagal.', errors)
  }

  const db = getDb()
  const duplicate = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (duplicate) {
    return sendError(res, 409, 'Alamat email sudah terdaftar pada akun lain.', {
      email: 'Gunakan alamat email lain.',
    })
  }

  const rawPass = password && String(password).trim().length >= 6 ? String(password).trim() : DEFAULT_DEMO_PASSWORD
  const passwordHash = bcrypt.hashSync(rawPass, 10)
  const createdAt = getIsoDateTime()

  const info = db
    .prepare(
      `INSERT INTO users (name, email, password, role, phone, company, address, city, postcode, country, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      cleanName,
      cleanEmail,
      passwordHash,
      cleanRole,
      cleanPhone,
      company ? String(company).trim() : null,
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      postcode ? String(postcode).trim() : null,
      country ? String(country).trim() : 'Indonesia',
      cleanStatus,
      createdAt
    )

  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(info.lastInsertRowid))
  appendActivityLog('user', 'CREATE', `Data akun ${row.name} (${row.role}) ditambahkan Admin`, db)

  return sendSuccess(res, 201, `User ${row.name} berhasil ditambahkan.`, mapUserRow(row))
})

/**
 * PUT /api/admin/users/:id
 * Updates user profile, role, or ACTIVE/SUSPENDED status (UC-06).
 */
router.put('/users/:id', (req, res) => {
  const userId = Number(req.params.id)
  const db = getDb()

  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId)
  if (!existing) {
    return sendError(res, 404, `User dengan ID ${userId} tidak ditemukan.`)
  }

  const { name, email, password, phone, company, address, city, postcode, country, role, status } =
    req.body || {}

  const cleanName = name !== undefined ? String(name).trim() : existing.name
  const cleanEmail = email !== undefined ? String(email).trim().toLowerCase() : existing.email
  const cleanPhone = phone !== undefined ? String(phone).trim() : existing.phone
  const cleanRole = role === 'admin' || role === 'customer' ? role : existing.role
  const cleanStatus = status === 'ACTIVE' || status === 'SUSPENDED' ? status : existing.status

  const errors = {}
  if (cleanName.length < 2) {
    errors.name = 'Nama lengkap wajib diisi minimal 2 karakter.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = 'Format alamat email tidak valid.'
  }
  if (cleanPhone.length < 8) {
    errors.phone = 'Nomor telepon minimal 8 digit.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi pembaruan user gagal.', errors)
  }

  const emailConflict = db
    .prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?`)
    .get(cleanEmail, userId)
  if (emailConflict) {
    return sendError(res, 409, 'Alamat email sudah terdaftar pada akun lain.', {
      email: 'Gunakan alamat email lain.',
    })
  }

  const nextPasswordHash =
    password && String(password).trim().length >= 6
      ? bcrypt.hashSync(String(password).trim(), 10)
      : existing.password

  db.prepare(
    `UPDATE users
     SET name = ?, email = ?, password = ?, role = ?, phone = ?,
         company = ?, address = ?, city = ?, postcode = ?, country = ?, status = ?
     WHERE id = ?`
  ).run(
    cleanName,
    cleanEmail,
    nextPasswordHash,
    cleanRole,
    cleanPhone,
    company !== undefined ? (company ? String(company).trim() : null) : existing.company,
    address !== undefined ? (address ? String(address).trim() : null) : existing.address,
    city !== undefined ? (city ? String(city).trim() : null) : existing.city,
    postcode !== undefined ? (postcode ? String(postcode).trim() : null) : existing.postcode,
    country !== undefined ? (country ? String(country).trim() : 'Indonesia') : existing.country,
    cleanStatus,
    userId
  )

  const updatedRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId)
  appendActivityLog('user', 'UPDATE', `Data akun ${updatedRow.name} (${updatedRow.role} • ${updatedRow.status}) diperbarui Admin`, db)

  return sendSuccess(res, 200, `User ${updatedRow.name} berhasil diperbarui.`, mapUserRow(updatedRow))
})

/**
 * DELETE /api/admin/users/:id
 * Deletes a user account with anti self-delete guard (`400` if `id === req.user.id`).
 */
router.delete('/users/:id', (req, res) => {
  const userId = Number(req.params.id)
  if (userId === Number(req.user.id)) {
    return sendError(
      res,
      400,
      'Proteksi keamanan: Akun Administrator yang sedang aktif masuk tidak dapat menghapus dirinya sendiri.'
    )
  }

  const db = getDb()
  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId)
  if (!existing) {
    return sendError(res, 404, `User dengan ID ${userId} tidak ditemukan.`)
  }

  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId)
  appendActivityLog('user', 'DELETE', `Akun ${existing.email} dihapus oleh Admin`, db)

  return sendSuccess(res, 200, `Akun ${existing.email} berhasil dihapus.`, null)
})

/**
 * GET /api/admin/invoices
 * Lists all invoices with customer details (optional `?status=unpaid|paid|expired`).
 */
router.get('/invoices', (req, res) => {
  const { status } = req.query || {}
  const db = getDb()

  let sql = `
    SELECT i.*, u.name AS customer_name, u.email AS customer_email
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    JOIN users u ON u.id = o.user_id
    WHERE 1=1
  `
  const params = []
  if (status && ['unpaid', 'paid', 'expired'].includes(String(status))) {
    sql += ` AND i.payment_status = ?`
    params.push(String(status))
  }
  sql += ` ORDER BY i.id DESC`

  const rows = db.prepare(sql).all(...params)
  return sendSuccess(res, 200, 'Daftar seluruh invoice berhasil dimuat.', rows.map(mapInvoiceRow))
})

/**
 * PATCH /api/admin/invoices/:id/pay
 * UC-08 Konfirmasi Lunas (`PAID`) via Atomic Transaction:
 * - Rejects 404 if invoice not found
 * - Rejects 400 if invoice is `expired`
 * - Updates `invoices.payment_status = 'paid'`, `paid_at = timestamp`
 * - Updates `orders.order_status = 'active'`
 */
router.patch('/invoices/:id/pay', (req, res) => {
  const rawParam = String(req.params.id || '').trim()
  const db = getDb()

  const invoiceRow = /^\d+$/.test(rawParam)
    ? db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(Number(rawParam))
    : db.prepare(`SELECT * FROM invoices WHERE LOWER(invoice_number) = LOWER(?)`).get(rawParam.replace(/^#/, ''))

  if (!invoiceRow) {
    return sendError(res, 404, `Invoice dengan ID "${rawParam}" tidak ditemukan.`)
  }

  if (invoiceRow.payment_status === 'expired') {
    return sendError(res, 400, 'Invoice yang sudah kedaluwarsa (expired) tidak dapat dikonfirmasi lunas.')
  }

  const confirmPayTx = db.transaction(() => {
    const paidAt = invoiceRow.paid_at || getIsoDateTime()

    db.prepare(
      `UPDATE invoices
       SET payment_status = 'paid', paid_at = ?
       WHERE id = ?`
    ).run(paidAt, Number(invoiceRow.id))

    db.prepare(
      `UPDATE orders
       SET order_status = 'active'
       WHERE id = ?`
    ).run(Number(invoiceRow.order_id))

    appendActivityLog(
      'payment',
      'PAID',
      `Invoice #${invoiceRow.invoice_number} (${formatIdr(invoiceRow.total_due_idr)}) dikonfirmasi LUNAS via QRIS Statis`,
      db
    )

    const updated = db
      .prepare(
        `SELECT i.*, u.name AS customer_name, u.email AS customer_email
         FROM invoices i
         JOIN orders o ON o.id = i.order_id
         JOIN users u ON u.id = o.user_id
         WHERE i.id = ?`
      )
      .get(Number(invoiceRow.id))

    return mapInvoiceRow(updated)
  })

  const updatedDto = confirmPayTx()
  return sendSuccess(
    res,
    200,
    `Invoice #${updatedDto.invoiceNumber} berhasil dikonfirmasi PAID dan layanan diaktifkan.`,
    updatedDto
  )
})

/**
 * GET /api/admin/logs
 * Lists activity logs for Figma Screen 41 — Log Activity.
 */
router.get('/logs', (req, res) => {
  const { type } = req.query || {}
  const db = getDb()

  let sql = `SELECT * FROM activity_logs WHERE 1=1`
  const params = []
  if (type && ['product', 'user', 'payment'].includes(String(type))) {
    sql += ` AND log_type = ?`
    params.push(String(type))
  }
  sql += ` ORDER BY id DESC LIMIT 100`

  const rows = db.prepare(sql).all(...params)
  return sendSuccess(res, 200, 'Log aktivitas berhasil dimuat.', rows.map(mapLogRow))
})

export default router
