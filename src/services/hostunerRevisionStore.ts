import {
  SEED_ANNOUNCEMENTS,
  SEED_CATEGORIES,
  SEED_DOWNLOADS,
  SEED_KB_ARTICLES,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_TICKETS,
  SEED_USERS,
} from '../data/seedData'
import type { PersistedStoreState } from './hostunerApi'
import type {
  ActivityLog,
  CartItem,
  InvoiceRecord,
  PaymentMethod,
  SupportTicketItem,
} from '../types/hostuner'

export const REVISION_STORAGE_KEY = 'hostuner_v6_frontend_state_v3'

export const STATIC_QRIS_PAYMENT_METHOD: PaymentMethod = {
  id: 'qris-statis',
  name: 'QRIS Statis Resmi Hostuner',
  accountNumber: 'ID1025008941203',
  accountHolder: 'PT Hostuner Webhosting Indonesia',
  verificationType: 'QRIS Statis + Kode Unik Rp 128',
  active: true,
}

export interface PendingAuthItem {
  item: CartItem
  target: 'cart' | 'checkout'
}

export interface RevisionPersistedState extends Omit<PersistedStoreState, 'cart'> {
  cartsByUserId: Record<string, CartItem[]>
  checkoutDraft: CartItem[]
  reviewSource: 'draft' | 'cart'
  reviewSelectedCartIds: string[]
  pendingAuthItem: PendingAuthItem | null
}

function buildQrisSeedTickets(): SupportTicketItem[] {
  return SEED_TICKETS.map((t) =>
    t.id === 't-1'
      ? {
          ...t,
          subject: 'Konfirmasi Pembayaran QRIS Invoice #INV-2026-0892',
          message:
            'Sudah melakukan pembayaran via QRIS Statis Hostuner sebesar Rp 399.728 (termasuk PPN 11% Rp 39.600 & kode unik Rp 128) untuk Paket Hosting Pro + domain portalbisniskami.com.',
        }
      : { ...t }
  )
}

function buildQrisSeedInvoices(): InvoiceRecord[] {
  return [
    {
      id: 1,
      orderId: 101,
      invoiceNumber: 'INV-2026-0892',
      customerName: 'Budi Santoso',
      customerEmail: 'budi@sman1solo.sch.id',
      paymentMethodId: STATIC_QRIS_PAYMENT_METHOD.id,
      paymentMethodName: STATIC_QRIS_PAYMENT_METHOD.name,
      paymentStatus: 'unpaid',
      breakdown: {
        subtotalIdr: 360000,
        annualDiscountSavedIdr: 54000,
        domainPriceIdr: 0,
        setupFeeIdr: 0,
        taxRatePercent: 11,
        taxAmountIdr: 39600,
        uniqueVerificationCodeIdr: 128,
        totalDueIdr: 399728,
      },
      itemsSummary: [
        'Hosting Pro (600 MB Space, Unmetered, Siklus 1 Tahun)',
        'Registrasi Domain Resmi (portalbisniskami.com — 1 Tahun)',
      ],
      dueDate: '25 Nov 2026',
      paidAt: null,
      createdAt: '2026-11-18 11:25',
    },
  ]
}

function buildQrisSeedLogs(): ActivityLog[] {
  return [
    {
      id: 'log-1',
      logType: 'product',
      timestamp: '18 Nov 2026 • 11:40',
      badge: 'UPDATE',
      message: 'Paket Web Sekolah (gid=20): Stok diperbarui menjadi 59 Available — Rp 900.000/yr',
    },
    {
      id: 'log-2',
      logType: 'product',
      timestamp: '18 Nov 2026 • 10:15',
      badge: 'CREATE',
      message: 'Hosting Premier (gid=1): Paket 150 MB Space ditambahkan — Rp 150.000/yr',
    },
    {
      id: 'log-3',
      logType: 'user',
      timestamp: '18 Nov 2026 • 11:50',
      badge: 'LOGIN',
      message: 'Budi Santoso (budi@sman1solo.sch.id) berhasil Login (Verification Verified)',
    },
    {
      id: 'log-4',
      logType: 'user',
      timestamp: '18 Nov 2026 • 09:30',
      badge: 'REGISTER',
      message: 'Siti Aminah (siti@bisniskami.co.id) mendaftar akun pelanggan baru',
    },
    {
      id: 'log-5',
      logType: 'payment',
      timestamp: '18 Nov 2026 • 11:55',
      badge: 'PENDING',
      message: 'Invoice #INV-2026-0892 (Rp 399.728) — Menunggu verifikasi QRIS Statis (#948201)',
    },
    {
      id: 'log-6',
      logType: 'payment',
      timestamp: '17 Nov 2026 • 14:10',
      badge: 'PAID',
      message: 'Invoice #INV-2026-0880 (Rp 900.000 — Paket Sekolah) — Lunas via QRIS Statis',
    },
  ]
}

export function buildRevisionInitialState(): RevisionPersistedState {
  return {
    users: structuredClone(SEED_USERS),
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    paymentMethods: [structuredClone(STATIC_QRIS_PAYMENT_METHOD)],
    announcements: structuredClone(SEED_ANNOUNCEMENTS),
    kbArticles: structuredClone(SEED_KB_ARTICLES),
    downloads: structuredClone(SEED_DOWNLOADS),
    tickets: buildQrisSeedTickets(),
    orders: structuredClone(SEED_ORDERS),
    invoices: buildQrisSeedInvoices(),
    logs: buildQrisSeedLogs(),
    cartsByUserId: {},
    checkoutDraft: [],
    reviewSource: 'draft',
    reviewSelectedCartIds: [],
    pendingAuthItem: null,
    activeUserId: null,
    currency: 'IDR',
    includePpn11: true,
  }
}

const LEGACY_BANK_IDS = new Set(['bca', 'mandiri', 'bni', 'bri'])

function sanitizeQrisPaymentMethods(saved?: PaymentMethod[]): PaymentMethod[] {
  const validExtras = (saved ?? []).filter(
    (pm) =>
      pm.id !== STATIC_QRIS_PAYMENT_METHOD.id &&
      !LEGACY_BANK_IDS.has(pm.id.toLowerCase()) &&
      !/\b(bca|mandiri|bni|bri|transfer bank)\b/i.test(pm.name)
  )
  const savedPrimary = (saved ?? []).find((pm) => pm.id === STATIC_QRIS_PAYMENT_METHOD.id)
  return [
    savedPrimary ? { ...STATIC_QRIS_PAYMENT_METHOD, active: savedPrimary.active } : structuredClone(STATIC_QRIS_PAYMENT_METHOD),
    ...validExtras,
  ]
}

export function loadRevisionState(): RevisionPersistedState {
  try {
    const raw = localStorage.getItem(REVISION_STORAGE_KEY)
    if (!raw) return buildRevisionInitialState()
    const parsed = JSON.parse(raw) as Partial<RevisionPersistedState>
    const base = buildRevisionInitialState()
    return {
      ...base,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      products: parsed.products?.length ? parsed.products : base.products,
      users: parsed.users?.length ? parsed.users : base.users,
      // Keep primary Static QRIS + persist admin-added QRIS channels while stripping any legacy bank transfer entries
      paymentMethods: sanitizeQrisPaymentMethods(parsed.paymentMethods),
      announcements: parsed.announcements?.length ? parsed.announcements : base.announcements,
      kbArticles: parsed.kbArticles?.length ? parsed.kbArticles : base.kbArticles,
      downloads: parsed.downloads?.length ? parsed.downloads : base.downloads,
      tickets: (parsed.tickets?.length ? parsed.tickets : base.tickets).map((t) =>
        t.id === 't-1' || t.id === 't-2' || t.id === 't-3'
          ? { ...t, userEmail: t.userEmail ?? 'budi@sman1solo.sch.id' }
          : t
      ),
      cartsByUserId: parsed.cartsByUserId ?? {},
      checkoutDraft: Array.isArray(parsed.checkoutDraft) ? parsed.checkoutDraft : [],
      reviewSource: parsed.reviewSource === 'cart' ? 'cart' : 'draft',
      reviewSelectedCartIds: Array.isArray(parsed.reviewSelectedCartIds) ? parsed.reviewSelectedCartIds : [],
      pendingAuthItem: parsed.pendingAuthItem ?? null,
      // Enforce PPN 11% in production per 05_SRS & 08_Use_Case; DEV mode keeps optional preview toggle
      includePpn11: import.meta.env.DEV ? (parsed.includePpn11 ?? true) : true,
    }
  } catch {
    return buildRevisionInitialState()
  }
}

export function saveRevisionState(state: RevisionPersistedState): void {
  try {
    localStorage.setItem(REVISION_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota issues in private browsing
  }
}

export function resetRevisionState(): RevisionPersistedState {
  const initial = buildRevisionInitialState()
  saveRevisionState(initial)
  return initial
}
