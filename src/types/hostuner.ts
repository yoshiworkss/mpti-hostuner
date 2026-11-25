export type UserRole = 'guest' | 'customer' | 'admin'
export type CurrencyCode = 'IDR' | 'USD'
export type LanguageCode = 'English' | 'Indonesia'
export type BillingCycle = 'monthly' | 'annually'

/**
 * Matches 05_SRS Section 5 (NFR-05) standard REST API JSON contract.
 */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  errors?: Record<string, string>
}

export interface UserAccount {
  id: number
  name: string
  email: string
  role: Exclude<UserRole, 'guest'>
  phone: string
  company?: string
  address?: string
  city?: string
  postcode?: string
  country?: string
  status: 'ACTIVE' | 'SUSPENDED'
  emailVerified?: boolean
  emailVerifiedAt?: string | null
  createdAt: string
}

export interface RegisterResult extends UserAccount {
  verificationRequired?: boolean
  deliveryMode?: 'smtp' | 'simulation'
  verificationPreviewUrl?: string | null
}

export interface ResendVerificationResult {
  email: string
  deliveryMode: 'smtp' | 'simulation'
  verificationPreviewUrl?: string | null
}

export interface StoreCategory {
  id: number
  gid: string
  slug: string
  name: string
  description: string
}

export interface HostingProduct {
  id: number
  categoryId: number
  categorySlug: string
  name: string
  slug: string
  priceMonthly: number
  priceAnnual: number
  displayCycle: BillingCycle
  diskSpace: string
  bandwidth: string
  specs: string[]
  isFreeDomain: boolean
  stockLabel?: string
  isFeatured: boolean
}

export interface DomainTldPrice {
  tld: string
  newPriceIdr: number
  transferPriceIdr: number
  renewalPriceIdr: number
  note: string
}

export interface CartItem {
  id: string
  type: 'hosting_domain' | 'domain_only' | 'domain_transfer'
  productId?: number
  productName?: string
  domainName: string
  domainAction?: 'register' | 'transfer' | 'existing'
  domainPriceIdr: number
  billingCycle: BillingCycle
  unitPriceIdr: number
  subtotalIdr: number
  isFreeDomainApplied?: boolean
}

export interface BillingBreakdown {
  subtotalIdr: number
  annualDiscountSavedIdr: number
  domainPriceIdr: number
  setupFeeIdr: number
  taxRatePercent: number
  taxAmountIdr: number
  uniqueVerificationCodeIdr: number
  totalDueIdr: number
}

export interface OrderRecord {
  id: number
  userId: number
  customerName: string
  orderNumber: string
  totalAmountIdr: number
  orderStatus: 'pending' | 'processing' | 'active' | 'cancelled'
  createdAt: string
  items: CartItem[]
}

export interface InvoiceRecord {
  id: number
  orderId: number
  invoiceNumber: string
  customerName: string
  customerEmail: string
  paymentMethodId: string
  paymentMethodName: string
  paymentStatus: 'unpaid' | 'paid' | 'expired'
  breakdown: BillingBreakdown
  itemsSummary: string[]
  dueDate: string
  paidAt: string | null
  createdAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  accountNumber: string
  accountHolder: string
  verificationType: string
  active: boolean
}

export interface ActivityLog {
  id: string
  logType: 'product' | 'user' | 'payment'
  timestamp: string
  badge: string
  message: string
}

export interface AnnouncementItem {
  id: string
  dateLabel: string
  monthGroup: 'September 2026' | 'Agustus 2025' | 'Oktober 2026'
  title: string
  body: string
}

export interface KnowledgebaseArticle {
  id: string
  slug: string
  categorySlug: 'hosting' | 'vps'
  categoryLabel: string
  title: string
  snippet: string
  content: string
  views: number
  updatedAt: string
}

export interface DownloadFileItem {
  id: string
  categorySlug: 'manuals' | 'empty'
  fileName: string
  description: string
  fileSize: string
  updatedAt: string
}

export interface SupportTicketItem {
  id: string
  ticketNumber: string
  userEmail?: string
  department: 'Konfirmasi Pembayaran' | 'Support'
  subject: string
  message: string
  invoiceNumber?: string
  status: 'Open' | 'Answered' | 'Customer-Reply' | 'Closed'
  createdAt: string
}

export interface ServerNodeStatus {
  id: string
  nodeName: string
  httpStatus: 'Online' | 'Maintenance'
  ftpStatus: 'Online' | 'Offline'
  pop3Status: 'Online' | 'Offline'
  uptime: string
  loadNote: string
}
