import { Router } from 'express'
import { getDb } from '../config/db.js'
import { SEED_DOMAIN_TLDS } from '../db/seedData.js'
import { mapCategoryRow, mapProductRow } from '../utils/dto.js'
import { lookupTldInfo } from '../utils/pricing.js'
import { sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const RESERVED_DOMAINS = new Set([
  'hostuner.com',
  'billing.hostuner.com',
  'google.com',
  'facebook.com',
  'uns.ac.id',
])

/**
 * GET /api/categories
 * Lists all 9 Store categories ordered by id.
 */
router.get('/categories', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM categories ORDER BY id ASC`).all()
  return sendSuccess(res, 200, 'Daftar kategori berhasil dimuat.', rows.map(mapCategoryRow))
})

/**
 * GET /api/products
 * Optional query filters: `?category=:slug`, `?q=:keyword`, `?freeDomain=true`
 */
router.get('/products', (req, res) => {
  const { category, q, freeDomain } = req.query || {}
  const db = getDb()

  let sql = `
    SELECT p.*, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `
  const params = []

  if (category && String(category).trim() && String(category).trim() !== 'all') {
    sql += ` AND c.slug = ?`
    params.push(String(category).trim())
  }

  if (freeDomain === 'true' || freeDomain === '1') {
    sql += ` AND p.is_free_domain = 1`
  }

  if (q && String(q).trim()) {
    const keyword = `%${String(q).trim().toLowerCase()}%`
    sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(c.slug) LIKE ? OR LOWER(p.disk_space) LIKE ? OR LOWER(p.specs) LIKE ?)`
    params.push(keyword, keyword, keyword, keyword)
  }

  sql += ` ORDER BY p.id ASC`
  const rows = db.prepare(sql).all(...params)
  return sendSuccess(res, 200, 'Daftar produk berhasil dimuat.', rows.map(mapProductRow))
})

/**
 * GET /api/domain/check?domain=bisnisanda.com
 * Instant Domain Availability Checker (FR-03 / BPMN 06_Diagram_BPMN_Transaksi_Hostuner.svg).
 */
router.get('/domain/check', (req, res) => {
  const rawDomain = String(req.query?.domain || '').trim().toLowerCase()
  if (!rawDomain || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(rawDomain)) {
    return sendError(res, 422, 'Format nama domain tidak valid.', {
      domain: 'Masukkan nama domain lengkap dengan ekstensi (contoh: bisnisanda.com).',
    })
  }

  const db = getDb()
  const registeredInOrder = db
    .prepare(
      `SELECT oi.id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE LOWER(oi.domain_name) = LOWER(?) AND o.order_status != 'cancelled'
       LIMIT 1`
    )
    .get(rawDomain)

  const available = !RESERVED_DOMAINS.has(rawDomain) && !registeredInOrder
  const tldInfo = lookupTldInfo(rawDomain)

  return sendSuccess(
    res,
    200,
    available ? `Domain ${rawDomain} tersedia untuk didaftarkan.` : `Domain ${rawDomain} sudah terdaftar.`,
    {
      domain: rawDomain,
      available,
      tld: tldInfo.tld,
      newPriceIdr: tldInfo.newPriceIdr,
      transferPriceIdr: tldInfo.transferPriceIdr,
      renewalPriceIdr: tldInfo.renewalPriceIdr,
      note: tldInfo.note,
      supportedTlds: SEED_DOMAIN_TLDS,
    }
  )
})

export default router
