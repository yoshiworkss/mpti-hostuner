import { Router } from 'express'
import { getDb } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { mapInvoiceRow, mapOrderRow } from '../utils/dto.js'
import { buildServerVerifiedOrder } from '../utils/pricing.js'
import { appendActivityLog, formatIdr, getIsoDateTime, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

function getDueDatePlusDays(days = 7) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * POST /api/orders
 * Atomic order & QRIS Statis invoice creation (`FR-06`, `FR-07`, `UC-04`).
 * - Rejects non-QRIS payment methods (`paymentMethodId !== 'qris-statis'`).
 * - Recalculates prices server-side from SQLite `products` & TLD rates.
 * - Enforces PPN 11% + Kode Unik QRIS Rp 128.
 * - Supports both hosting+domain and domain-only (`productId: null`).
 */
router.post('/orders', requireAuth, (req, res) => {
  const { items, paymentMethodId } = req.body || {}

  if (paymentMethodId !== undefined && paymentMethodId !== 'qris-statis') {
    return sendError(
      res,
      422,
      'Metode pembayaran tidak valid. Hostuner-25 hanya menerima QRIS Statis Resmi Hostuner (qris-statis).',
      { paymentMethodId: 'Hanya metode pembayaran qris-statis yang diizinkan.' }
    )
  }

  const db = getDb()
  let verifiedOrder
  try {
    verifiedOrder = buildServerVerifiedOrder(items, db)
  } catch (err) {
    return sendError(res, err.statusCode || 422, err.message, err.errors)
  }

  const { normalizedItems, breakdown, itemsSummary } = verifiedOrder

  const createOrderTx = db.transaction(() => {
    const nowTag = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const { maxId } = db.prepare(`SELECT COALESCE(MAX(id), 100) AS maxId FROM orders`).get()
    const nextSeq = Number(maxId) + 1
    const seqStr = String(nextSeq).padStart(4, '0')
    const randSuffix = Math.floor(100 + Math.random() * 900)

    let orderNumber = `ORD-${nowTag}-${seqStr}`
    let invoiceNumber = `INV-${nowTag}-${seqStr}`

    // Ensure uniqueness if multiple orders happen rapidly
    const existsOrd = db.prepare(`SELECT id FROM orders WHERE order_number = ?`).get(orderNumber)
    if (existsOrd) {
      orderNumber = `ORD-${nowTag}-${seqStr}-${randSuffix}`
      invoiceNumber = `INV-${nowTag}-${seqStr}-${randSuffix}`
    }

    const createdAt = getIsoDateTime()
    const dueDate = getDueDatePlusDays(7)

    const ordResult = db
      .prepare(
        `INSERT INTO orders (user_id, order_number, total_amount, order_status, created_at)
         VALUES (?, ?, ?, 'pending', ?)`
      )
      .run(Number(req.user.id), orderNumber, breakdown.totalDueIdr, createdAt)

    const orderId = Number(ordResult.lastInsertRowid)

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        item_uid, order_id, product_id, item_type, product_name,
        domain_name, domain_action, domain_price, billing_cycle,
        unit_price, subtotal, is_free_domain_applied
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const item of normalizedItems) {
      insertItem.run(
        item.id,
        orderId,
        item.productId ?? null,
        item.type,
        item.productName ?? null,
        item.domainName,
        item.domainAction ?? 'register',
        item.domainPriceIdr,
        item.billingCycle,
        item.unitPriceIdr,
        item.subtotalIdr,
        item.isFreeDomainApplied ? 1 : 0
      )
    }

    const invResult = db
      .prepare(
        `INSERT INTO invoices (
          order_id, invoice_number, payment_method, payment_method_name,
          payment_status, subtotal_idr, annual_discount_saved_idr, domain_price_idr,
          setup_fee_idr, tax_rate_percent, tax_amount_idr, unique_code_idr,
          total_due_idr, items_summary, due_date, paid_at, created_at
        )
        VALUES (?, ?, 'qris-statis', 'QRIS Statis Resmi Hostuner', 'unpaid', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, ?)`
      )
      .run(
        orderId,
        invoiceNumber,
        breakdown.subtotalIdr,
        breakdown.annualDiscountSavedIdr,
        breakdown.domainPriceIdr,
        breakdown.taxRatePercent,
        breakdown.taxAmountIdr,
        breakdown.uniqueVerificationCodeIdr,
        breakdown.totalDueIdr,
        JSON.stringify(itemsSummary),
        dueDate,
        createdAt
      )

    const invoiceId = Number(invResult.lastInsertRowid)

    appendActivityLog(
      'payment',
      'UNPAID',
      `Invoice #${invoiceNumber} (${formatIdr(breakdown.totalDueIdr)}) via QRIS Statis diterbitkan untuk ${req.user.name}`,
      db
    )

    const fullInvoiceRow = db
      .prepare(
        `SELECT i.*, u.name AS customer_name, u.email AS customer_email
         FROM invoices i
         JOIN orders o ON o.id = i.order_id
         JOIN users u ON u.id = o.user_id
         WHERE i.id = ?`
      )
      .get(invoiceId)

    return mapInvoiceRow(fullInvoiceRow)
  })

  const createdInvoice = createOrderTx()
  return sendSuccess(res, 201, 'Pesanan dan Invoice QRIS Statis berhasil diterbitkan.', createdInvoice)
})

/**
 * GET /api/orders/me
 * Lists orders for the logged-in user (or all orders if admin? Note: per contract, returns orders of req.user.id, or if admin all/own; let's return own orders for customer and all orders for admin so both Client Area and Admin work seamlessly).
 */
router.get('/orders/me', requireAuth, (req, res) => {
  const db = getDb()
  const orderRows =
    req.user.role === 'admin'
      ? db
          .prepare(
            `SELECT o.*, u.name AS customer_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             ORDER BY o.id DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT o.*, u.name AS customer_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.user_id = ?
             ORDER BY o.id DESC`
          )
          .all(Number(req.user.id))

  const getItems = db.prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`)
  const orders = orderRows.map((ord) => mapOrderRow(ord, getItems.all(Number(ord.id))))
  return sendSuccess(res, 200, 'Daftar pesanan berhasil dimuat.', orders)
})

/**
 * GET /api/invoices/me
 * Lists invoices belonging to `req.user.id` (or all invoices if `role === 'admin'`).
 */
router.get('/invoices/me', requireAuth, (req, res) => {
  const db = getDb()
  const rows =
    req.user.role === 'admin'
      ? db
          .prepare(
            `SELECT i.*, u.name AS customer_name, u.email AS customer_email
             FROM invoices i
             JOIN orders o ON o.id = i.order_id
             JOIN users u ON u.id = o.user_id
             ORDER BY i.id DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT i.*, u.name AS customer_name, u.email AS customer_email
             FROM invoices i
             JOIN orders o ON o.id = i.order_id
             JOIN users u ON u.id = o.user_id
             WHERE o.user_id = ?
             ORDER BY i.id DESC`
          )
          .all(Number(req.user.id))

  return sendSuccess(res, 200, 'Daftar invoice berhasil dimuat.', rows.map(mapInvoiceRow))
})

/**
 * GET /api/invoices/:invoiceNumber
 * Strict ownership check:
 * - Guest -> 401 (via requireAuth)
 * - Other customer -> 403
 * - Non-existent -> 404
 * - Owner or Admin -> 200
 */
router.get('/invoices/:invoiceNumber', requireAuth, (req, res) => {
  const rawNum = String(req.params.invoiceNumber || '').trim().replace(/^#/, '')
  const db = getDb()

  const row = db
    .prepare(
      `SELECT i.*, o.user_id, u.name AS customer_name, u.email AS customer_email
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       JOIN users u ON u.id = o.user_id
       WHERE LOWER(i.invoice_number) = LOWER(?)`
    )
    .get(rawNum)

  if (!row) {
    return sendError(res, 404, `Invoice #${rawNum} tidak ditemukan.`)
  }

  if (req.user.role !== 'admin' && Number(row.user_id) !== Number(req.user.id)) {
    return sendError(
      res,
      403,
      'Akses ditolak. Anda tidak memiliki izin untuk mengakses invoice milik pelanggan lain.'
    )
  }

  return sendSuccess(res, 200, 'Detail invoice berhasil dimuat.', mapInvoiceRow(row))
})

export default router
