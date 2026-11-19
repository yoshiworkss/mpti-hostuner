import { createContext, useContext } from 'react'
import type {
  ApiResponse,
  BillingCycle,
  CartItem,
  CurrencyCode,
  HostingProduct,
  InvoiceRecord,
  LanguageCode,
  PaymentMethod,
  SupportTicketItem,
  UserAccount,
  UserRole,
} from '../types/hostuner'
import type { PersistedStoreState } from '../services/hostunerApi'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

export interface HostunerContextValue {
  state: PersistedStoreState
  currentUser: UserAccount | null
  role: UserRole
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  currency: CurrencyCode
  setCurrency: (cur: CurrencyCode) => void
  includePpn11: boolean
  setIncludePpn11: (v: boolean) => void
  formatPrice: (amountIdr: number) => string
  toasts: ToastMessage[]
  showToast: (text: string, type?: ToastMessage['type']) => void
  dismissToast: (id: string) => void

  // Auth & Role Actions
  loginUser: (
    email: string,
    roleHint?: 'customer' | 'admin',
    options?: { password?: string; turnstileToken?: string }
  ) => ApiResponse<UserAccount>
  loginAsDemoCustomer: () => void
  loginAsDemoAdmin: () => void
  registerCustomer: (payload: {
    name: string
    email: string
    password?: string
    phone: string
    company?: string
    address?: string
    city?: string
    postcode?: string
    country?: string
    turnstileToken?: string
  }) => ApiResponse<UserAccount>
  logoutUser: () => void

  // Cart & Order Actions
  addToCart: (item: CartItem) => void
  updateCartItemCycle: (itemId: string, cycle: BillingCycle) => void
  removeFromCart: (itemId: string) => void
  createOrderAndInvoice: (paymentMethodId: string) => ApiResponse<InvoiceRecord>

  // Support Actions
  submitTicket: (payload: {
    department: SupportTicketItem['department']
    subject: string
    message: string
    invoiceNumber?: string
    userEmail?: string
  }) => ApiResponse<SupportTicketItem>

  // Admin CRUD & Logs Actions (wired across Admin Portal)
  saveProduct: (product: Omit<HostingProduct, 'id'> & { id?: number }) => ApiResponse<HostingProduct>
  deleteProduct: (productId: number) => void
  saveUser: (user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: number }) => ApiResponse<UserAccount>
  deleteUser: (userId: number) => void
  markInvoicePaid: (invoiceId: number) => void
  addPaymentMethod: (pm: Omit<PaymentMethod, 'id'>) => ApiResponse<PaymentMethod>
  togglePaymentMethod: (pmId: string) => void
  deletePaymentMethod: (pmId: string) => void
  addAnnouncement: (payload: { title: string; body: string }) => void
  addKbArticle: (payload: { categorySlug: 'hosting' | 'vps'; title: string; content: string }) => void
  resetDemoData: () => void
}

export const HostunerContext = createContext<HostunerContextValue | null>(null)

export function useHostuner() {
  const ctx = useContext(HostunerContext)
  if (!ctx) {
    throw new Error('useHostuner must be used inside HostunerProvider')
  }
  return ctx
}
