/**
 * DTO Mappers: snake_case SQLite rows -> 100% camelCase JSON matching src/types/hostuner.ts.
 * NEVER exposes `password` field on UserAccount!
 */

export function mapUserRow(row) {
  if (!row) return null
  const dto = {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
    status: row.status || 'ACTIVE',
    emailVerified: Boolean(row.email_verified),
    emailVerifiedAt: row.email_verified_at || null,
    createdAt: row.created_at,
  }
  if (row.company) dto.company = row.company
  if (row.address) dto.address = row.address
  if (row.city) dto.city = row.city
  if (row.postcode) dto.postcode = row.postcode
  if (row.country) dto.country = row.country
  return dto
}

export function mapCategoryRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    gid: String(row.gid ?? row.id),
    slug: row.slug,
    name: row.name,
    description: row.description || '',
  }
}

export function mapProductRow(row) {
  if (!row) return null
  let specs = []
  try {
    specs = typeof row.specs === 'string' ? JSON.parse(row.specs) : Array.isArray(row.specs) ? row.specs : []
  } catch {
    specs = []
  }
  const dto = {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    categorySlug: row.category_slug || '',
    name: row.name,
    slug: row.slug,
    priceMonthly: Number(row.price_monthly),
    priceAnnual: Number(row.price_annual),
    displayCycle: row.display_cycle || 'monthly',
    diskSpace: row.disk_space,
    bandwidth: row.bandwidth,
    specs,
    isFreeDomain: Boolean(row.is_free_domain),
    isFeatured: Boolean(row.is_featured),
  }
  if (row.stock_label) {
    dto.stockLabel = row.stock_label
  }
  return dto
}

export function mapOrderItemRow(row) {
  if (!row) return null
  const dto = {
    id: row.item_uid || `item-${row.id}`,
    type: row.item_type || (row.product_id ? 'hosting_domain' : 'domain_only'),
    domainName: row.domain_name,
    domainAction: row.domain_action || 'register',
    domainPriceIdr: Number(row.domain_price || 0),
    billingCycle: row.billing_cycle || 'annually',
    unitPriceIdr: Number(row.unit_price),
    subtotalIdr: Number(row.subtotal),
    isFreeDomainApplied: Boolean(row.is_free_domain_applied),
  }
  if (row.product_id !== null && row.product_id !== undefined) {
    dto.productId = Number(row.product_id)
  }
  if (row.product_name) {
    dto.productName = row.product_name
  }
  return dto
}

export function mapOrderRow(row, itemRows = []) {
  if (!row) return null
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    customerName: row.customer_name || '',
    orderNumber: row.order_number,
    totalAmountIdr: Number(row.total_amount),
    orderStatus: row.order_status,
    createdAt: row.created_at,
    items: itemRows.map(mapOrderItemRow),
  }
}

export function mapInvoiceRow(row) {
  if (!row) return null
  let itemsSummary = []
  try {
    itemsSummary =
      typeof row.items_summary === 'string'
        ? JSON.parse(row.items_summary)
        : Array.isArray(row.items_summary)
          ? row.items_summary
          : []
  } catch {
    itemsSummary = []
  }
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    paymentMethodId: 'qris-statis',
    paymentMethodName: row.payment_method_name || 'QRIS Statis Resmi Hostuner',
    paymentStatus: row.payment_status,
    breakdown: {
      subtotalIdr: Number(row.subtotal_idr),
      annualDiscountSavedIdr: Number(row.annual_discount_saved_idr || 0),
      domainPriceIdr: Number(row.domain_price_idr || 0),
      setupFeeIdr: Number(row.setup_fee_idr || 0),
      taxRatePercent: Number(row.tax_rate_percent ?? 11),
      taxAmountIdr: Number(row.tax_amount_idr),
      uniqueVerificationCodeIdr: Number(row.unique_code_idr ?? 128),
      totalDueIdr: Number(row.total_due_idr),
    },
    itemsSummary,
    dueDate: row.due_date,
    paidAt: row.paid_at || null,
    createdAt: row.created_at,
  }
}

export function mapTicketRow(row) {
  if (!row) return null
  const dto = {
    id: row.ticket_uid || `t-${row.id}`,
    ticketNumber: row.ticket_number,
    userEmail: row.user_email,
    department: row.department,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }
  if (row.invoice_number) {
    dto.invoiceNumber = row.invoice_number
  }
  return dto
}

export function mapLogRow(row) {
  if (!row) return null
  return {
    id: row.log_uid || `log-${row.id}`,
    logType: row.log_type,
    timestamp: row.timestamp,
    badge: row.badge,
    message: row.message,
  }
}

export function mapAnnouncementRow(row) {
  if (!row) return null
  return {
    id: row.ann_uid || `ann-${row.id}`,
    dateLabel: row.date_label,
    monthGroup: row.month_group,
    title: row.title,
    body: row.body,
  }
}

export function mapKbRow(row) {
  if (!row) return null
  return {
    id: row.kb_uid || `kb-${row.id}`,
    slug: row.slug,
    categorySlug: row.category_slug,
    categoryLabel: row.category_label,
    title: row.title,
    snippet: row.snippet,
    content: row.content,
    views: Number(row.views || 1),
    updatedAt: row.updated_at,
  }
}
