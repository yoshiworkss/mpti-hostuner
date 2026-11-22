import type {
  ActivityLog,
  AnnouncementItem,
  ApiResponse,
  BillingBreakdown,
  CartItem,
  CurrencyCode,
  DownloadFileItem,
  HostingProduct,
  InvoiceRecord,
  KnowledgebaseArticle,
  OrderRecord,
  PaymentMethod,
  StoreCategory,
  SupportTicketItem,
  UserAccount,
} from '../types/hostuner'
import {
  SEED_ANNOUNCEMENTS,
  SEED_CATEGORIES,
  SEED_DOMAIN_TLDS,
  SEED_DOWNLOADS,
  SEED_INVOICES,
  SEED_KB_ARTICLES,
  SEED_LOGS,
  SEED_ORDERS,
  SEED_PAYMENT_METHODS,
  SEED_PRODUCTS,
  SEED_SERVER_NODES,
  SEED_TICKETS,
  SEED_USERS,
} from '../data/seedData'

export interface PersistedStoreState {
  users: UserAccount[]
  categories: StoreCategory[]
  products: HostingProduct[]
  paymentMethods: PaymentMethod[]
  announcements: AnnouncementItem[]
  kbArticles: KnowledgebaseArticle[]
  downloads: DownloadFileItem[]
  tickets: SupportTicketItem[]
  orders: OrderRecord[]
  invoices: InvoiceRecord[]
  logs: ActivityLog[]
  cart: CartItem[]
  activeUserId: number | null
  currency: CurrencyCode
  includePpn11: boolean
}

const STORAGE_KEY = 'hostuner_v6_frontend_state_v1'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

function buildInitialState(): PersistedStoreState {
  return {
    users: structuredClone(SEED_USERS),
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    paymentMethods: structuredClone(SEED_PAYMENT_METHODS),
    announcements: structuredClone(SEED_ANNOUNCEMENTS),
    kbArticles: structuredClone(SEED_KB_ARTICLES),
    downloads: structuredClone(SEED_DOWNLOADS),
    tickets: structuredClone(SEED_TICKETS),
    orders: structuredClone(SEED_ORDERS),
    invoices: structuredClone(SEED_INVOICES),
    logs: structuredClone(SEED_LOGS),
    cart: [],
    activeUserId: null,
    currency: 'IDR',
    includePpn11: true,
  }
}

export function loadPersistedState(): PersistedStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildInitialState()
    const parsed = JSON.parse(raw) as Partial<PersistedStoreState>
    const base = buildInitialState()
    return {
      ...base,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      products: parsed.products?.length ? parsed.products : base.products,
      users: parsed.users?.length ? parsed.users : base.users,
      paymentMethods: parsed.paymentMethods?.length ? parsed.paymentMethods : base.paymentMethods,
      announcements: parsed.announcements?.length ? parsed.announcements : base.announcements,
      kbArticles: parsed.kbArticles?.length ? parsed.kbArticles : base.kbArticles,
      downloads: parsed.downloads?.length ? parsed.downloads : base.downloads,
    }
  } catch {
    return buildInitialState()
  }
}

export function savePersistedState(state: PersistedStoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota issues in private browsing
  }
}

export function resetPersistedState(): PersistedStoreState {
  const initial = buildInitialState()
  savePersistedState(initial)
  return initial
}

const USD_RATE = 15800

export function formatMoney(amountIdr: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    const usd = amountIdr / USD_RATE
    return `$${usd.toFixed(2)} USD`
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountIdr)
  return `Rp ${formatted}`
}

export function calculateBillingBreakdown(
  items: CartItem[],
  includePpn11: boolean,
  uniqueCode = 128
): BillingBreakdown {
  let subtotalIdr = 0
  let domainPriceIdr = 0
  let annualDiscountSavedIdr = 0

  for (const item of items) {
    subtotalIdr += item.subtotalIdr
    if (item.type === 'hosting_domain' && !item.isFreeDomainApplied) {
      domainPriceIdr += item.domainPriceIdr
    }
    if (item.billingCycle === 'annually' && item.type === 'hosting_domain') {
      annualDiscountSavedIdr += Math.round(item.subtotalIdr * 0.15)
    }
  }

  const taxRatePercent = includePpn11 ? 11 : 0
  const baseTaxable = subtotalIdr + domainPriceIdr
  const taxAmountIdr = Math.round((baseTaxable * taxRatePercent) / 100)
  const uniqueVerificationCodeIdr = items.length > 0 ? uniqueCode : 0
  const totalDueIdr = baseTaxable + taxAmountIdr + uniqueVerificationCodeIdr

  return {
    subtotalIdr,
    annualDiscountSavedIdr,
    domainPriceIdr,
    setupFeeIdr: 0,
    taxRatePercent,
    taxAmountIdr,
    uniqueVerificationCodeIdr,
    totalDueIdr,
  }
}

export function getNowTimestamp(): string {
  const d = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm}`
}

export function okResponse<T>(message: string, data: T): ApiResponse<T> {
  return { success: true, message, data }
}

export function errorResponse<T = null>(
  message: string,
  errors?: Record<string, string>
): ApiResponse<T> {
  return { success: false, message, data: null, errors }
}

export const STATIC_DOMAIN_TLDS = SEED_DOMAIN_TLDS
export const STATIC_SERVER_NODES = SEED_SERVER_NODES
