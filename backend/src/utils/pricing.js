import { ENV } from '../config/env.js'
import { SEED_DOMAIN_TLDS } from '../db/seedData.js'

/**
 * Looks up official Hostuner TLD price (sorted by longest TLD suffix first so `.sch.id` & `.co.id` match before `.id`).
 */
export function lookupTldInfo(domainName) {
  const clean = String(domainName || '').trim().toLowerCase()
  const sortedTlds = [...SEED_DOMAIN_TLDS].sort((a, b) => b.tld.length - a.tld.length)
  const matched = sortedTlds.find((t) => clean.endsWith(t.tld))
  return matched || SEED_DOMAIN_TLDS[0]
}

/**
 * Server-side price validation & breakdown calculator (`POST /api/orders`).
 * Never trusts client-submitted `subtotalIdr` or `unitPriceIdr`:
 * - Fetches actual product prices from SQLite `products` table.
 * - Applies free domain (`Rp 0`) ONLY when `product.is_free_domain && billingCycle === 'annually' && domainAction === 'register'`.
 * - Enforces PPN 11% (`ENV.PPN_RATE_PERCENT = 11`) + Kode Unik QRIS Statis `Rp 128` (`ENV.UNIQUE_VERIFICATION_CODE_IDR = 128`).
 */
export function buildServerVerifiedOrder(rawItems, db) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('Keranjang pesanan tidak boleh kosong.')
    err.statusCode = 422
    err.errors = { items: 'Minimal 1 item layanan atau domain wajib dipilih.' }
    throw err
  }

  const getProductById = db.prepare(`SELECT * FROM products WHERE id = ?`)
  const normalizedItems = []
  let subtotalIdr = 0
  let domainPriceIdr = 0
  let annualDiscountSavedIdr = 0

  for (let idx = 0; idx < rawItems.length; idx += 1) {
    const raw = rawItems[idx] || {}
    const domainName = String(raw.domainName || '').trim().toLowerCase()
    if (!domainName || !domainName.includes('.')) {
      const err = new Error(`Nama domain pada item ke-${idx + 1} tidak valid.`)
      err.statusCode = 422
      err.errors = { domainName: 'Masukkan nama domain yang valid (contoh: bisnisanda.com).' }
      throw err
    }

    const tldInfo = lookupTldInfo(domainName)
    const hasProduct = raw.productId !== null && raw.productId !== undefined && raw.productId !== ''
    const itemType =
      raw.type && ['hosting_domain', 'domain_only', 'domain_transfer'].includes(raw.type)
        ? raw.type
        : hasProduct
          ? 'hosting_domain'
          : 'domain_only'

    const billingCycle = raw.billingCycle === 'monthly' ? 'monthly' : 'annually'
    const domainAction =
      raw.domainAction && ['register', 'transfer', 'existing'].includes(raw.domainAction)
        ? raw.domainAction
        : itemType === 'domain_transfer'
          ? 'transfer'
          : 'register'

    if (hasProduct && itemType === 'hosting_domain') {
      const product = getProductById.get(Number(raw.productId))
      if (!product) {
        const err = new Error(`Produk hosting dengan ID ${raw.productId} tidak ditemukan.`)
        err.statusCode = 404
        err.errors = { productId: 'Paket hosting tidak ditemukan di database.' }
        throw err
      }

      const unitPriceIdr =
        billingCycle === 'annually' ? Number(product.price_annual) : Number(product.price_monthly)
      const itemSubtotalIdr = unitPriceIdr
      const isFreeDomainApplied =
        Boolean(product.is_free_domain) && billingCycle === 'annually' && domainAction === 'register'

      const itemDomainPriceIdr =
        domainAction === 'existing'
          ? 0
          : isFreeDomainApplied
            ? 0
            : domainAction === 'transfer'
              ? tldInfo.transferPriceIdr
              : tldInfo.newPriceIdr

      subtotalIdr += itemSubtotalIdr
      if (!isFreeDomainApplied) {
        domainPriceIdr += itemDomainPriceIdr
      }
      if (billingCycle === 'annually') {
        annualDiscountSavedIdr += Math.round(itemSubtotalIdr * 0.15)
      }

      normalizedItems.push({
        id: raw.id || `item-${Date.now()}-${idx + 1}`,
        type: 'hosting_domain',
        productId: Number(product.id),
        productName: product.name,
        domainName,
        domainAction,
        domainPriceIdr: itemDomainPriceIdr,
        billingCycle,
        unitPriceIdr,
        subtotalIdr: itemSubtotalIdr,
        isFreeDomainApplied,
      })
    } else {
      // Domain-only or Domain-transfer order item (`product_id = NULL` in order_items!)
      const effectiveType =
        itemType === 'domain_transfer' || domainAction === 'transfer' ? 'domain_transfer' : 'domain_only'
      const effectiveAction = effectiveType === 'domain_transfer' ? 'transfer' : 'register'
      const tldPrice =
        effectiveAction === 'transfer' ? tldInfo.transferPriceIdr : tldInfo.newPriceIdr

      subtotalIdr += tldPrice

      normalizedItems.push({
        id: raw.id || `domain-${Date.now()}-${idx + 1}`,
        type: effectiveType,
        productId: null,
        productName:
          raw.productName ||
          (effectiveType === 'domain_transfer'
            ? `Transfer Domain (${tldInfo.tld})`
            : `Registrasi Domain (${tldInfo.tld})`),
        domainName,
        domainAction: effectiveAction,
        domainPriceIdr: tldPrice,
        billingCycle: 'annually',
        unitPriceIdr: tldPrice,
        subtotalIdr: tldPrice,
        isFreeDomainApplied: false,
      })
    }
  }

  // PPN is locked at 11% in production & backend contract (05_SRS & 01_FRONTEND_STATUS_DECISIONS_AND_GAPS.md)
  const taxRatePercent = ENV.PPN_RATE_PERCENT
  const baseTaxable = subtotalIdr + domainPriceIdr
  const taxAmountIdr = Math.round((baseTaxable * taxRatePercent) / 100)
  const uniqueVerificationCodeIdr = ENV.UNIQUE_VERIFICATION_CODE_IDR
  const totalDueIdr = baseTaxable + taxAmountIdr + uniqueVerificationCodeIdr

  const breakdown = {
    subtotalIdr,
    annualDiscountSavedIdr,
    domainPriceIdr,
    setupFeeIdr: 0,
    taxRatePercent,
    taxAmountIdr,
    uniqueVerificationCodeIdr,
    totalDueIdr,
  }

  const itemsSummary = normalizedItems.map((c) =>
    c.productId
      ? `${c.productName} — ${c.domainName} (${c.billingCycle})`
      : `${c.productName || 'Domain'} — ${c.domainName} (${c.billingCycle})`
  )

  return {
    normalizedItems,
    breakdown,
    itemsSummary,
  }
}
