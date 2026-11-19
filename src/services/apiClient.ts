import type {
  ApiResponse,
  CartItem,
  HostingProduct,
  InvoiceRecord,
  OrderRecord,
  StoreCategory,
  SupportTicketItem,
  UserAccount,
} from '../types/hostuner'

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
export const BACKEND_API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '')

/**
 * Returns true when `VITE_API_BASE_URL` is configured (Backend Node.js REST API mode).
 * When false, the frontend runs in self-contained localStorage mode for previews & UAT.
 */
export function isBackendApiEnabled(): boolean {
  return BACKEND_API_BASE_URL.length > 0
}

/**
 * Standard JSON HTTP client aligned with 05_SRS Section 5 (NFR-05):
 * - Always sends `credentials: 'include'` for HttpOnly JWT cookies.
 * - Normalizes responses into `{ success, message, data, errors }`.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!isBackendApiEnabled()) {
    return {
      success: false,
      message: 'VITE_API_BASE_URL belum dikonfigurasi. Aplikasi berjalan dalam mode data lokal.',
      data: null,
    }
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}${normalizedPath}`, {
      ...init,
      headers,
      credentials: 'include',
    })

    const json = (await response.json().catch(() => null)) as Partial<ApiResponse<T>> | null
    if (!response.ok || !json || json.success === false) {
      return {
        success: false,
        message: json?.message || `Permintaan gagal (HTTP ${response.status}).`,
        data: null,
        errors: json?.errors,
      }
    }

    return {
      success: true,
      message: json.message ?? 'OK',
      data: (json.data ?? null) as T | null,
      errors: json.errors,
    }
  } catch {
    return {
      success: false,
      message: 'Tidak dapat terhubung ke server API Hostuner. Periksa koneksi atau status server backend.',
      data: null,
    }
  }
}

export interface LoginApiPayload {
  email: string
  password: string
  roleHint?: 'customer' | 'admin'
  turnstileToken?: string
}

export interface RegisterApiPayload {
  name: string
  email: string
  password: string
  phone: string
  company?: string
  address?: string
  city?: string
  postcode?: string
  country?: string
  turnstileToken?: string
}

export interface CreateOrderApiPayload {
  items: CartItem[]
  paymentMethodId: 'qris-statis'
  includePpn11: boolean
}

/**
 * Typed REST API Endpoint Contract for Backend Handoff (Muhammad Hanif — Node.js + SQLite/PostgreSQL).
 * Matches 05_SRS (FR-01..FR-10) & 09_Skema_Database.sql (6 core tables + optional support endpoints).
 */
export const hostunerBackendApi = {
  auth: {
    me: () => apiRequest<UserAccount>('/auth/me', { method: 'GET' }),
    login: (payload: LoginApiPayload) =>
      apiRequest<UserAccount>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    register: (payload: RegisterApiPayload) =>
      apiRequest<UserAccount>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logout: () => apiRequest<null>('/auth/logout', { method: 'POST' }),
  },
  catalog: {
    listCategories: () => apiRequest<StoreCategory[]>('/categories', { method: 'GET' }),
    listProducts: (categorySlug?: string) =>
      apiRequest<HostingProduct[]>(
        categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : '/products',
        { method: 'GET' }
      ),
  },
  orders: {
    listMyOrders: () => apiRequest<OrderRecord[]>('/orders/me', { method: 'GET' }),
    listMyInvoices: () => apiRequest<InvoiceRecord[]>('/invoices/me', { method: 'GET' }),
    getInvoice: (invoiceNumber: string) =>
      apiRequest<InvoiceRecord>(`/invoices/${encodeURIComponent(invoiceNumber)}`, { method: 'GET' }),
    createOrder: (payload: CreateOrderApiPayload) =>
      apiRequest<InvoiceRecord>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  tickets: {
    listMyTickets: () => apiRequest<SupportTicketItem[]>('/tickets/me', { method: 'GET' }),
    createTicket: (payload: FormData | Record<string, string | undefined>) =>
      apiRequest<SupportTicketItem>('/tickets', {
        method: 'POST',
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      }),
  },
  admin: {
    saveProduct: (product: Omit<HostingProduct, 'id'> & { id?: number }) =>
      apiRequest<HostingProduct>(
        product.id ? `/admin/products/${product.id}` : '/admin/products',
        {
          method: product.id ? 'PUT' : 'POST',
          body: JSON.stringify(product),
        }
      ),
    deleteProduct: (productId: number) =>
      apiRequest<null>(`/admin/products/${productId}`, { method: 'DELETE' }),
    listUsers: () => apiRequest<UserAccount[]>('/admin/users', { method: 'GET' }),
    saveUser: (user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: number }) =>
      apiRequest<UserAccount>(
        user.id ? `/admin/users/${user.id}` : '/admin/users',
        {
          method: user.id ? 'PUT' : 'POST',
          body: JSON.stringify(user),
        }
      ),
    deleteUser: (userId: number) =>
      apiRequest<null>(`/admin/users/${userId}`, { method: 'DELETE' }),
    confirmInvoicePaid: (invoiceId: number) =>
      apiRequest<InvoiceRecord>(`/admin/invoices/${invoiceId}/pay`, { method: 'PATCH' }),
  },
}
