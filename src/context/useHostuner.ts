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
  RegisterResult,
  ResendVerificationResult,
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

  // Auth & Role Actions (async Promise<ApiResponse<T>> for Backend API verification & rollback)
  loginUser: (
    email: string,
    roleHint?: 'customer' | 'admin',
    options?: { password?: string; turnstileToken?: string }
  ) => Promise<ApiResponse<UserAccount>>
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
    redirectTo?: string
    turnstileToken?: string
  }) => Promise<ApiResponse<RegisterResult>>
  verifyEmailToken: (token: string) => Promise<ApiResponse<UserAccount>>
  resendVerificationEmail: (
    email: string,
    redirectTo?: string
  ) => Promise<ApiResponse<ResendVerificationResult>>
  logoutUser: () => void

  // Cart & Order Actions
  addToCart: (item: CartItem) => void
  updateCartItemCycle: (itemId: string, cycle: BillingCycle) => void
  removeFromCart: (itemId: string) => void
  createOrderAndInvoice: (paymentMethodId: string) => Promise<ApiResponse<InvoiceRecord>>

  // Support Actions
  submitTicket: (payload: {
    department: SupportTicketItem['department']
    subject: string
    message: string
    invoiceNumber?: string
    userEmail?: string
    attachmentFile?: File | null
  }) => Promise<ApiResponse<SupportTicketItem>>

  // Admin CRUD & Logs Actions (wired across Admin Portal)
  saveProduct: (
    product: Omit<HostingProduct, 'id'> & { id?: number }
  ) => Promise<ApiResponse<HostingProduct>>
  deleteProduct: (productId: number) => Promise<ApiResponse<null>>
  saveUser: (
    user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: number }
  ) => Promise<ApiResponse<UserAccount>>
  deleteUser: (userId: number) => Promise<ApiResponse<null>>
  markInvoicePaid: (invoiceId: number) => Promise<ApiResponse<InvoiceRecord>>
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
