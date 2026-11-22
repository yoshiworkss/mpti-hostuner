import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { hostunerBackendApi, isBackendApiEnabled } from '../services/apiClient'
import {
  calculateBillingBreakdown,
  errorResponse,
  formatMoney,
  getNowTimestamp,
  okResponse,
  STATIC_DOMAIN_TLDS,
  type PersistedStoreState,
} from '../services/hostunerApi'
import {
  loadRevisionState,
  resetRevisionState,
  saveRevisionState,
  STATIC_QRIS_PAYMENT_METHOD,
  type RevisionPersistedState,
} from '../services/hostunerRevisionStore'
import type {
  AnnouncementItem,
  ApiResponse,
  BillingCycle,
  CartItem,
  CurrencyCode,
  HostingProduct,
  InvoiceRecord,
  KnowledgebaseArticle,
  LanguageCode,
  OrderRecord,
  PaymentMethod,
  SupportTicketItem,
  UserAccount,
  UserRole,
} from '../types/hostuner'
import { HostunerContext, type ToastMessage } from './useHostuner'
import { RevisionCartContext } from './useRevisionCart'

function lookupDomainTldPrice(domainName: string): number {
  const clean = domainName.trim().toLowerCase()
  const matched = STATIC_DOMAIN_TLDS.find((t) => clean.endsWith(t.tld))
  return matched ? matched.newPriceIdr : STATIC_DOMAIN_TLDS[0].newPriceIdr
}

function appendRevisionLog(
  prev: RevisionPersistedState,
  logType: 'product' | 'user' | 'payment',
  badge: string,
  message: string
) {
  return [
    {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      logType,
      timestamp: getNowTimestamp(),
      badge,
      message,
    },
    ...prev.logs,
  ]
}

/**
 * Revision 3.2 + Backend REST API Integrated Provider (`WBS 2.17`):
 * - All mutation methods return `Promise<ApiResponse<T>>` and await Backend responses BEFORE mutating auth/order/admin state.
 * - Prevents false optimistic login on HTTP 401/403/409/422.
 * - Automatically resets `activeUserId` to `null` if `/api/auth/me` returns HTTP 401 on bootstrap.
 * - Falls back cleanly to `localStorage` when `VITE_API_BASE_URL` is empty.
 */
export function HostunerRevisionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [revState, setRevState] = useState<RevisionPersistedState>(() => loadRevisionState())
  const [language, setLanguage] = useState<LanguageCode>('English')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const currentUser = revState.users.find((u) => u.id === revState.activeUserId) ?? null
  const role: UserRole = currentUser ? currentUser.role : 'guest'
  const userCartKey = currentUser ? String(currentUser.id) : null
  const activeCart: CartItem[] = userCartKey ? (revState.cartsByUserId[userCartKey] ?? []) : []

  const reviewItems: CartItem[] =
    revState.reviewSource === 'cart'
      ? activeCart.filter((item) => revState.reviewSelectedCartIds.includes(item.id))
      : revState.checkoutDraft

  useEffect(() => {
    saveRevisionState(revState)
  }, [revState])

  useLayoutEffect(() => {
    document.documentElement.dataset.authRole = role
  }, [role])

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, type, text }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  function applyPendingItemAfterAuth(
    prev: RevisionPersistedState,
    userId: number
  ): Pick<RevisionPersistedState, 'cartsByUserId' | 'checkoutDraft' | 'reviewSource' | 'pendingAuthItem'> {
    if (!prev.pendingAuthItem) {
      return {
        cartsByUserId: prev.cartsByUserId,
        checkoutDraft: prev.checkoutDraft,
        reviewSource: prev.reviewSource,
        pendingAuthItem: null,
      }
    }

    const { item, target } = prev.pendingAuthItem
    const uKey = String(userId)
    const existingCart = prev.cartsByUserId[uKey] ?? []

    if (target === 'checkout') {
      return {
        cartsByUserId: prev.cartsByUserId,
        checkoutDraft: [item],
        reviewSource: 'draft',
        pendingAuthItem: null,
      }
    }

    const alreadyInCart = existingCart.some(
      (c) => c.domainName.toLowerCase() === item.domainName.toLowerCase() && c.productId === item.productId
    )
    return {
      cartsByUserId: {
        ...prev.cartsByUserId,
        [uKey]: alreadyInCart ? existingCart : [...existingCart, item],
      },
      checkoutDraft: prev.checkoutDraft,
      reviewSource: prev.reviewSource,
      pendingAuthItem: null,
    }
  }

  const syncUserAndAdminDataFromBackend = useCallback(
    async (user: UserAccount, applyPending = false) => {
      if (!isBackendApiEnabled()) return
      const [ordersRes, invoicesRes, ticketsRes] = await Promise.all([
        hostunerBackendApi.orders.listMyOrders(),
        hostunerBackendApi.orders.listMyInvoices(),
        hostunerBackendApi.tickets.listMyTickets(),
      ])

      let adminUsers: UserAccount[] | null = null
      let adminInvoices: InvoiceRecord[] | null = null
      let adminLogs = null

      if (user.role === 'admin') {
        const [uRes, iRes, lRes] = await Promise.all([
          hostunerBackendApi.admin.listUsers(),
          hostunerBackendApi.admin.listInvoices(),
          hostunerBackendApi.admin.listLogs(),
        ])
        if (uRes.success && uRes.data) adminUsers = uRes.data
        if (iRes.success && iRes.data) adminInvoices = iRes.data
        if (lRes.success && lRes.data) adminLogs = lRes.data
      }

      setRevState((prev) => {
        const mergedPending = applyPending ? applyPendingItemAfterAuth(prev, user.id) : null
        const mergedUsers = adminUsers
          ? adminUsers
          : prev.users.some((u) => u.id === user.id)
            ? prev.users.map((u) => (u.id === user.id ? user : u))
            : [...prev.users, user]

        return {
          ...prev,
          ...(mergedPending ?? {}),
          users: mergedUsers,
          activeUserId: user.id,
          orders: ordersRes.success && ordersRes.data ? ordersRes.data : prev.orders,
          invoices:
            adminInvoices ??
            (invoicesRes.success && invoicesRes.data ? invoicesRes.data : prev.invoices),
          tickets: ticketsRes.success && ticketsRes.data ? ticketsRes.data : prev.tickets,
          logs: adminLogs ?? prev.logs,
        }
      })
    },
    []
  )

  // Bootstrap catalog, content, and active HttpOnly cookie session from Backend on initial load
  useEffect(() => {
    if (!isBackendApiEnabled()) return
    let active = true

    async function bootstrapFromBackend() {
      const [catRes, prodRes, annRes, kbRes, meRes] = await Promise.all([
        hostunerBackendApi.catalog.listCategories(),
        hostunerBackendApi.catalog.listProducts(),
        hostunerBackendApi.content.listAnnouncements(),
        hostunerBackendApi.content.listKbArticles(),
        hostunerBackendApi.auth.me(),
      ])

      if (!active) return

      setRevState((prev) => ({
        ...prev,
        categories: catRes.success && catRes.data?.length ? catRes.data : prev.categories,
        products: prodRes.success && prodRes.data?.length ? prodRes.data : prev.products,
        announcements: annRes.success && annRes.data?.length ? annRes.data : prev.announcements,
        kbArticles: kbRes.success && kbRes.data?.length ? kbRes.data : prev.kbArticles,
        // Reset stale localStorage activeUserId to null if Backend session is unauthenticated (401/403)
        activeUserId: meRes.success && meRes.data ? meRes.data.id : null,
      }))

      if (meRes.success && meRes.data) {
        await syncUserAndAdminDataFromBackend(meRes.data, false)
      }
    }

    void bootstrapFromBackend()
    return () => {
      active = false
    }
  }, [syncUserAndAdminDataFromBackend])

  function setCurrency(currency: CurrencyCode) {
    setRevState((prev) => ({ ...prev, currency }))
    showToast(`Mata uang diubah ke ${currency === 'IDR' ? 'IDR (Rp)' : 'USD ($)'}`, 'info')
  }

  function setIncludePpn11(includePpn11: boolean) {
    setRevState((prev) => ({ ...prev, includePpn11 }))
  }

  function formatPrice(amountIdr: number): string {
    return formatMoney(amountIdr, revState.currency)
  }

  async function loginUser(
    email: string,
    roleHint?: 'customer' | 'admin',
    options?: { password?: string; turnstileToken?: string }
  ): Promise<ApiResponse<UserAccount>> {
    const cleanEmail = email.trim().toLowerCase()

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.auth.login({
        email: cleanEmail,
        password: options?.password ?? '',
        roleHint,
        turnstileToken: options?.turnstileToken,
      })

      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }

      const serverUser = res.data
      await syncUserAndAdminDataFromBackend(serverUser, true)
      showToast(`Selamat datang, ${serverUser.name}!`)
      return okResponse('Login berhasil.', serverUser)
    }

    // Fallback localStorage mode (when VITE_API_BASE_URL is empty)
    const matched =
      revState.users.find((u) => u.email.toLowerCase() === cleanEmail) ??
      revState.users.find((u) => u.role === (roleHint ?? 'customer')) ??
      null

    if (!matched) {
      return errorResponse('Akun tidak ditemukan.', { email: 'Email tidak terdaftar.' })
    }
    if (roleHint === 'admin' && matched.role !== 'admin') {
      return errorResponse('Akun ini tidak memiliki hak akses Administrator.', {
        email: 'Bukan akun Administrator.',
      })
    }
    if (matched.status === 'SUSPENDED') {
      return errorResponse('Akun ini sedang berstatus SUSPENDED.', {
        email: 'Akun berstatus SUSPENDED.',
      })
    }

    setRevState((prev) => {
      const merged = applyPendingItemAfterAuth(prev, matched.id)
      return {
        ...prev,
        ...merged,
        activeUserId: matched.id,
        logs: appendRevisionLog(
          prev,
          'user',
          'LOGIN',
          `${matched.name} (${matched.email}) berhasil masuk sebagai ${matched.role.toUpperCase()}`
        ),
      }
    })
    showToast(`Selamat datang, ${matched.name}!`)
    return okResponse('Login berhasil.', matched)
  }

  function loginAsDemoCustomer() {
    void loginUser('budi@sman1solo.sch.id', 'customer', {
      password: 'Hostuner25!',
      turnstileToken: 'turnstile-local-verified',
    })
  }

  function loginAsDemoAdmin() {
    void loginUser('admin@hostuner.com', 'admin', {
      password: 'Hostuner25!',
      turnstileToken: 'turnstile-local-verified',
    })
  }

  async function registerCustomer(payload: {
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
  }): Promise<ApiResponse<UserAccount>> {
    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.auth.register({
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password ?? '',
        phone: payload.phone.trim(),
        company: payload.company?.trim(),
        address: payload.address?.trim(),
        city: payload.city?.trim(),
        postcode: payload.postcode?.trim(),
        country: payload.country?.trim() || 'Indonesia',
        turnstileToken: payload.turnstileToken,
      })

      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }

      const serverUser = res.data
      await syncUserAndAdminDataFromBackend(serverUser, true)
      showToast(`Pendaftaran berhasil! Selamat datang, ${serverUser.name}.`)
      return okResponse('Registrasi berhasil.', serverUser)
    }

    // Fallback localStorage mode
    if (revState.users.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())) {
      return errorResponse('Email sudah terdaftar.', { email: 'Gunakan email lain.' })
    }

    const newUser: UserAccount = {
      id: Date.now(),
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      company: payload.company?.trim(),
      address: payload.address?.trim(),
      city: payload.city?.trim(),
      postcode: payload.postcode?.trim(),
      country: payload.country?.trim() || 'Indonesia',
      role: 'customer',
      status: 'ACTIVE',
      createdAt: getNowTimestamp(),
    }

    setRevState((prev) => {
      const merged = applyPendingItemAfterAuth(prev, newUser.id)
      return {
        ...prev,
        ...merged,
        users: [...prev.users, newUser],
        activeUserId: newUser.id,
        logs: appendRevisionLog(
          prev,
          'user',
          'REGISTER',
          `${newUser.name} (${newUser.email}) mendaftar akun pelanggan baru`
        ),
      }
    })
    showToast(`Pendaftaran berhasil! Selamat datang, ${newUser.name}.`)
    return okResponse('Registrasi berhasil.', newUser)
  }

  function logoutUser() {
    const prevName = currentUser?.name
    setRevState((prev) => ({
      ...prev,
      activeUserId: null,
      checkoutDraft: [],
      reviewSelectedCartIds: [],
      logs: prevName ? appendRevisionLog(prev, 'user', 'LOGOUT', `${prevName} keluar dari sesi`) : prev.logs,
    }))
    if (isBackendApiEnabled()) {
      void hostunerBackendApi.auth.logout()
    }
    showToast('Anda telah keluar dari akun.', 'info')
  }

  function addToCart(item: CartItem) {
    if (!currentUser || !userCartKey) {
      const target: 'cart' | 'checkout' = item.type === 'hosting_domain' ? 'checkout' : 'cart'
      setRevState((prev) => ({
        ...prev,
        pendingAuthItem: { item, target },
      }))
      showToast('Silakan login terlebih dahulu untuk menambahkan layanan atau checkout.', 'info')
      const redirectUrl = target === 'checkout' ? '/login?redirect=/checkout' : '/login?redirect=/cart'
      navigate(redirectUrl, { replace: true })
      return
    }

    if (item.type === 'hosting_domain') {
      setRevState((prev) => ({
        ...prev,
        checkoutDraft: [item],
        reviewSource: 'draft',
      }))
      navigate('/checkout', { replace: true })
      return
    }

    setRevState((prev) => {
      const existing = prev.cartsByUserId[userCartKey] ?? []
      return {
        ...prev,
        cartsByUserId: {
          ...prev.cartsByUserId,
          [userCartKey]: [...existing, item],
        },
      }
    })
    showToast(`${item.productName ?? item.domainName} ditambahkan ke Shopping Cart.`)
  }

  function updateCartItemCycle(itemId: string, cycle: BillingCycle) {
    function patchItem(item: CartItem, products: HostingProduct[]): CartItem {
      if (item.id !== itemId || !item.productId) return item
      const prod = products.find((p) => p.id === item.productId)
      if (!prod) return item
      const unitPriceIdr = cycle === 'annually' ? prod.priceAnnual : prod.priceMonthly
      const isFreeDomainApplied = prod.isFreeDomain && cycle === 'annually' && item.domainAction === 'register'
      const domainPriceIdr =
        item.domainAction === 'existing'
          ? 0
          : isFreeDomainApplied
            ? 0
            : item.domainPriceIdr > 0
              ? item.domainPriceIdr
              : lookupDomainTldPrice(item.domainName)
      return {
        ...item,
        billingCycle: cycle,
        unitPriceIdr,
        subtotalIdr: unitPriceIdr,
        domainPriceIdr,
        isFreeDomainApplied,
      }
    }

    setRevState((prev) => {
      const nextCarts = { ...prev.cartsByUserId }
      if (userCartKey && nextCarts[userCartKey]) {
        nextCarts[userCartKey] = nextCarts[userCartKey].map((it) => patchItem(it, prev.products))
      }
      return {
        ...prev,
        cartsByUserId: nextCarts,
        checkoutDraft: prev.checkoutDraft.map((it) => patchItem(it, prev.products)),
      }
    })
  }

  function removeFromCart(itemId: string) {
    if (!userCartKey) return
    setRevState((prev) => ({
      ...prev,
      cartsByUserId: {
        ...prev.cartsByUserId,
        [userCartKey]: (prev.cartsByUserId[userCartKey] ?? []).filter((c) => c.id !== itemId),
      },
      reviewSelectedCartIds: prev.reviewSelectedCartIds.filter((id) => id !== itemId),
    }))
    showToast('Item dihapus dari Shopping Cart.', 'info')
  }

  function startReviewFromCartSelection(selectedIds: string[]) {
    setRevState((prev) => ({
      ...prev,
      reviewSource: 'cart',
      reviewSelectedCartIds: selectedIds,
    }))
  }

  function moveReviewDraftToCart() {
    if (!currentUser || !userCartKey || revState.checkoutDraft.length === 0) return
    setRevState((prev) => {
      const existing = prev.cartsByUserId[userCartKey] ?? []
      return {
        ...prev,
        cartsByUserId: {
          ...prev.cartsByUserId,
          [userCartKey]: [...existing, ...prev.checkoutDraft],
        },
        checkoutDraft: [],
        reviewSource: 'cart',
        reviewSelectedCartIds: prev.checkoutDraft.map((i) => i.id),
      }
    })
    showToast('Paket berhasil disimpan ke Shopping Cart.')
  }

  async function createOrderForItems(
    itemsToOrder: CartItem[],
    removeFromCartAfter: boolean
  ): Promise<ApiResponse<InvoiceRecord>> {
    if (!currentUser || !userCartKey) {
      return errorResponse('Silakan login terlebih dahulu sebelum menyelesaikan checkout.')
    }
    if (itemsToOrder.length === 0) {
      return errorResponse('Tidak ada item terpilih untuk dibayar.')
    }

    const checkedOutIds = new Set(itemsToOrder.map((i) => i.id))

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.orders.createOrder({
        items: itemsToOrder,
        paymentMethodId: 'qris-statis',
        includePpn11: true,
      })

      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }

      const srvInv = res.data
      const ordersRes = await hostunerBackendApi.orders.listMyOrders()

      setRevState((prev) => {
        const existingCart = prev.cartsByUserId[userCartKey] ?? []
        return {
          ...prev,
          orders: ordersRes.success && ordersRes.data ? ordersRes.data : prev.orders,
          invoices: [srvInv, ...prev.invoices.filter((i) => i.id !== srvInv.id)],
          cartsByUserId: removeFromCartAfter
            ? {
                ...prev.cartsByUserId,
                [userCartKey]: existingCart.filter((c) => !checkedOutIds.has(c.id)),
              }
            : prev.cartsByUserId,
          checkoutDraft: removeFromCartAfter ? prev.checkoutDraft : [],
          reviewSelectedCartIds: removeFromCartAfter ? [] : prev.reviewSelectedCartIds,
        }
      })

      showToast(`Pesanan dibuat! Nomor Invoice: ${srvInv.invoiceNumber}`)
      return okResponse('Invoice berhasil diterbitkan.', srvInv)
    }

    // Fallback localStorage mode
    const pm = STATIC_QRIS_PAYMENT_METHOD
    const breakdown = calculateBillingBreakdown(itemsToOrder, revState.includePpn11, 128)
    const nowTag = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const seq = String(revState.orders.length + 1).padStart(4, '0')
    const orderId = Date.now()
    const orderNumber = `ORD-${nowTag}-${seq}`
    const invoiceNumber = `INV-${nowTag}-${seq}`

    const order: OrderRecord = {
      id: orderId,
      userId: currentUser.id,
      customerName: currentUser.name,
      orderNumber,
      totalAmountIdr: breakdown.totalDueIdr,
      orderStatus: 'pending',
      createdAt: getNowTimestamp(),
      items: [...itemsToOrder],
    }

    const invoice: InvoiceRecord = {
      id: orderId + 1,
      orderId,
      invoiceNumber,
      customerName: currentUser.name,
      customerEmail: currentUser.email,
      paymentMethodId: pm.id,
      paymentMethodName: pm.name,
      paymentStatus: 'unpaid',
      breakdown,
      itemsSummary: itemsToOrder.map((c) =>
        c.productName ? `${c.productName} — ${c.domainName} (${c.billingCycle})` : `Domain ${c.domainName}`
      ),
      dueDate: '7 Hari Kalender',
      paidAt: null,
      createdAt: getNowTimestamp(),
    }

    setRevState((prev) => {
      const existingCart = prev.cartsByUserId[userCartKey] ?? []
      return {
        ...prev,
        orders: [order, ...prev.orders],
        invoices: [invoice, ...prev.invoices],
        cartsByUserId: removeFromCartAfter
          ? {
              ...prev.cartsByUserId,
              [userCartKey]: existingCart.filter((c) => !checkedOutIds.has(c.id)),
            }
          : prev.cartsByUserId,
        checkoutDraft: removeFromCartAfter ? prev.checkoutDraft : [],
        reviewSelectedCartIds: removeFromCartAfter ? [] : prev.reviewSelectedCartIds,
        logs: appendRevisionLog(
          prev,
          'payment',
          'UNPAID',
          `Invoice #${invoiceNumber} (${formatMoney(breakdown.totalDueIdr, 'IDR')}) via QRIS Statis diterbitkan untuk ${currentUser.name}`
        ),
      }
    })
    showToast(`Pesanan dibuat! Nomor Invoice: ${invoiceNumber}`)
    return okResponse('Invoice berhasil diterbitkan.', invoice)
  }

  function createOrderForReviewItems(): Promise<ApiResponse<InvoiceRecord>> {
    return createOrderForItems(reviewItems, revState.reviewSource === 'cart')
  }

  function createOrderAndInvoice(): Promise<ApiResponse<InvoiceRecord>> {
    return createOrderForItems(activeCart, true)
  }

  function clearPendingAuthItem() {
    setRevState((prev) => ({ ...prev, pendingAuthItem: null }))
  }

  async function submitTicket(payload: {
    department: SupportTicketItem['department']
    subject: string
    message: string
    invoiceNumber?: string
    userEmail?: string
    attachmentFile?: File | null
  }): Promise<ApiResponse<SupportTicketItem>> {
    if (!payload.subject.trim() || !payload.message.trim()) {
      return errorResponse('Subjek dan pesan tiket wajib diisi.')
    }

    if (isBackendApiEnabled()) {
      let apiPayload: FormData | Record<string, string | undefined>
      if (payload.attachmentFile) {
        const fd = new FormData()
        fd.append('department', payload.department)
        fd.append('subject', payload.subject.trim())
        fd.append('message', payload.message.trim())
        if (payload.invoiceNumber?.trim()) {
          fd.append('invoiceNumber', payload.invoiceNumber.trim())
        }
        fd.append('attachment', payload.attachmentFile)
        apiPayload = fd
      } else {
        apiPayload = {
          department: payload.department,
          subject: payload.subject.trim(),
          message: payload.message.trim(),
          invoiceNumber: payload.invoiceNumber?.trim() || undefined,
        }
      }

      const res = await hostunerBackendApi.tickets.createTicket(apiPayload)
      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }

      const srvTicket = res.data
      setRevState((prev) => ({
        ...prev,
        tickets: [srvTicket, ...prev.tickets.filter((t) => t.id !== srvTicket.id)],
      }))
      showToast(`Tiket bantuan ${srvTicket.ticketNumber} berhasil dikirim!`)
      return okResponse('Tiket terkirim.', srvTicket)
    }

    // Fallback localStorage mode
    const num = `#${Math.floor(100000 + Math.random() * 899999)}`
    const ticket: SupportTicketItem = {
      id: `t-${Date.now()}`,
      ticketNumber: num,
      userEmail: payload.userEmail?.trim().toLowerCase() || currentUser?.email.toLowerCase(),
      department: payload.department,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      invoiceNumber: payload.invoiceNumber?.trim() || undefined,
      status: 'Open',
      createdAt: getNowTimestamp(),
    }
    setRevState((prev) => ({
      ...prev,
      tickets: [ticket, ...prev.tickets],
      logs: appendRevisionLog(prev, 'payment', 'TICKET', `Tiket ${num} (${payload.department}) dikirim`),
    }))
    showToast(`Tiket bantuan ${num} berhasil dikirim!`)
    return okResponse('Tiket terkirim.', ticket)
  }

  async function saveProduct(
    product: Omit<HostingProduct, 'id'> & { id?: number }
  ): Promise<ApiResponse<HostingProduct>> {
    const isEdit = Boolean(product.id)

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.admin.saveProduct(product)
      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }
      const srvProd = res.data
      const logsRes = await hostunerBackendApi.admin.listLogs()
      setRevState((prev) => ({
        ...prev,
        products: isEdit
          ? prev.products.map((p) => (p.id === srvProd.id ? srvProd : p))
          : [srvProd, ...prev.products],
        logs: logsRes.success && logsRes.data ? logsRes.data : prev.logs,
      }))
      showToast(isEdit ? `Produk ${srvProd.name} diperbarui.` : `Produk ${srvProd.name} ditambahkan.`)
      return okResponse('Produk tersimpan.', srvProd)
    }

    const saved: HostingProduct = { ...product, id: product.id ?? Date.now() }
    setRevState((prev) => ({
      ...prev,
      products: isEdit ? prev.products.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev.products],
      logs: appendRevisionLog(
        prev,
        'product',
        isEdit ? 'UPDATE' : 'CREATE',
        `${saved.name} (${saved.categorySlug}) — ${formatMoney(saved.priceMonthly, 'IDR')}/bln`
      ),
    }))
    showToast(isEdit ? `Produk ${saved.name} diperbarui.` : `Produk ${saved.name} ditambahkan.`)
    return okResponse('Produk tersimpan.', saved)
  }

  async function deleteProduct(productId: number): Promise<ApiResponse<null>> {
    const target = revState.products.find((p) => p.id === productId)

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.admin.deleteProduct(productId)
      if (!res.success) {
        showToast(res.message, 'error')
        return res
      }
      const logsRes = await hostunerBackendApi.admin.listLogs()
      setRevState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
        logs: logsRes.success && logsRes.data ? logsRes.data : prev.logs,
      }))
      showToast(`Produk ${target?.name ?? ''} dihapus.`, 'info')
      return okResponse('Produk dihapus.', null)
    }

    setRevState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
      logs: target ? appendRevisionLog(prev, 'product', 'DELETE', `Produk ${target.name} dihapus oleh Admin`) : prev.logs,
    }))
    showToast(`Produk ${target?.name ?? ''} dihapus.`, 'info')
    return okResponse('Produk dihapus.', null)
  }

  async function saveUser(
    user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: number }
  ): Promise<ApiResponse<UserAccount>> {
    const isEdit = Boolean(user.id)

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.admin.saveUser(user)
      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }
      const srvUser = res.data
      const logsRes = await hostunerBackendApi.admin.listLogs()
      setRevState((prev) => ({
        ...prev,
        users: isEdit
          ? prev.users.map((u) => (u.id === srvUser.id ? srvUser : u))
          : [srvUser, ...prev.users],
        logs: logsRes.success && logsRes.data ? logsRes.data : prev.logs,
      }))
      showToast(`User ${srvUser.name} disimpan.`)
      return okResponse('User tersimpan.', srvUser)
    }

    const existing = user.id ? revState.users.find((u) => u.id === user.id) : undefined
    const saved: UserAccount = {
      ...user,
      id: user.id ?? Date.now(),
      createdAt: existing?.createdAt ?? getNowTimestamp(),
    }
    setRevState((prev) => ({
      ...prev,
      users: isEdit ? prev.users.map((u) => (u.id === saved.id ? saved : u)) : [saved, ...prev.users],
      logs: appendRevisionLog(prev, 'user', isEdit ? 'UPDATE' : 'CREATE', `Data akun ${saved.name} (${saved.role}) disimpan Admin`),
    }))
    showToast(`User ${saved.name} disimpan.`)
    return okResponse('User tersimpan.', saved)
  }

  async function deleteUser(userId: number): Promise<ApiResponse<null>> {
    const target = revState.users.find((u) => u.id === userId)

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.admin.deleteUser(userId)
      if (!res.success) {
        showToast(res.message, 'error')
        return res
      }
      const logsRes = await hostunerBackendApi.admin.listLogs()
      setRevState((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
        logs: logsRes.success && logsRes.data ? logsRes.data : prev.logs,
      }))
      showToast('User dihapus.', 'info')
      return okResponse('User dihapus.', null)
    }

    setRevState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
      logs: target ? appendRevisionLog(prev, 'user', 'DELETE', `Akun ${target.email} dihapus oleh Admin`) : prev.logs,
    }))
    showToast('User dihapus.', 'info')
    return okResponse('User dihapus.', null)
  }

  async function markInvoicePaid(invoiceId: number): Promise<ApiResponse<InvoiceRecord>> {
    const inv = revState.invoices.find((i) => i.id === invoiceId)

    if (isBackendApiEnabled()) {
      const res = await hostunerBackendApi.admin.confirmInvoicePaid(invoiceId)
      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return res
      }
      const srvInv = res.data
      const logsRes = await hostunerBackendApi.admin.listLogs()
      setRevState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? srvInv : i)),
        orders: prev.orders.map((o) =>
          o.id === srvInv.orderId ? { ...o, orderStatus: 'active' } : o
        ),
        logs: logsRes.success && logsRes.data ? logsRes.data : prev.logs,
      }))
      showToast(`Invoice #${srvInv.invoiceNumber} berstatus PAID & layanan aktif!`)
      return okResponse('Invoice berhasil dikonfirmasi PAID.', srvInv)
    }

    if (!inv) {
      return errorResponse('Invoice tidak ditemukan.')
    }
    const paidAt = getNowTimestamp()
    const updatedInv: InvoiceRecord = { ...inv, paymentStatus: 'paid', paidAt }
    setRevState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.id === invoiceId ? updatedInv : i)),
      orders: prev.orders.map((o) => (o.id === inv.orderId ? { ...o, orderStatus: 'active' } : o)),
      logs: appendRevisionLog(
        prev,
        'payment',
        'PAID',
        `Invoice #${inv.invoiceNumber} (${formatMoney(inv.breakdown.totalDueIdr, 'IDR')}) dikonfirmasi LUNAS via QRIS Statis`
      ),
    }))
    showToast(`Invoice #${inv.invoiceNumber} berstatus PAID & layanan aktif!`)
    return okResponse('Invoice berhasil dikonfirmasi PAID.', updatedInv)
  }

  function addPaymentMethod(pm: Omit<PaymentMethod, 'id'>): ApiResponse<PaymentMethod> {
    const newPm: PaymentMethod = { ...pm, id: `pm-${Date.now()}` }
    setRevState((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, newPm],
      logs: appendRevisionLog(prev, 'payment', 'CREATE', `Pengaturan pembayaran "${newPm.name}" diperbarui Admin`),
    }))
    showToast(`Pengaturan pembayaran ${newPm.name} ditambahkan.`)
    return okResponse('Payment method added.', newPm)
  }

  function togglePaymentMethod(pmId: string) {
    setRevState((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((p) => (p.id === pmId ? { ...p, active: !p.active } : p)),
    }))
    showToast('Status metode pembayaran diubah.', 'info')
  }

  function deletePaymentMethod(pmId: string) {
    setRevState((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((p) => p.id !== pmId),
    }))
    showToast('Metode pembayaran dihapus.', 'info')
  }

  function addAnnouncement(payload: { title: string; body: string }) {
    const tempId = `ann-${Date.now()}`
    const item: AnnouncementItem = {
      id: tempId,
      dateLabel: 'Nov 22nd',
      monthGroup: 'September 2026',
      title: payload.title,
      body: payload.body,
    }
    setRevState((prev) => ({
      ...prev,
      announcements: [item, ...prev.announcements],
      logs: appendRevisionLog(prev, 'product', 'NEWS', `Announcement baru "${payload.title}" dipublikasikan`),
    }))
    showToast('Pengumuman dipublikasikan.')

    if (isBackendApiEnabled()) {
      void hostunerBackendApi.content.createAnnouncement(payload).then((res) => {
        if (res.success && res.data) {
          const srvAnn = res.data
          setRevState((prev) => ({
            ...prev,
            announcements: prev.announcements.map((a) => (a.id === tempId ? srvAnn : a)),
          }))
        }
      })
    }
  }

  function addKbArticle(payload: { categorySlug: 'hosting' | 'vps'; title: string; content: string }) {
    const tempId = `kb-${Date.now()}`
    const item: KnowledgebaseArticle = {
      id: tempId,
      slug: payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categorySlug: payload.categorySlug,
      categoryLabel: payload.categorySlug === 'hosting' ? 'Hosting' : 'VPS',
      title: payload.title,
      snippet: payload.content.slice(0, 96) + '...',
      content: payload.content,
      views: 1,
      updatedAt: '2026-11-22',
    }
    setRevState((prev) => ({
      ...prev,
      kbArticles: [item, ...prev.kbArticles],
      logs: appendRevisionLog(prev, 'product', 'ARTICLE', `Artikel KB "${payload.title}" diterbitkan`),
    }))
    showToast('Artikel Knowledgebase diterbitkan.')

    if (isBackendApiEnabled()) {
      void hostunerBackendApi.content.createKbArticle(payload).then((res) => {
        if (res.success && res.data) {
          const srvKb = res.data
          setRevState((prev) => ({
            ...prev,
            kbArticles: prev.kbArticles.map((k) => (k.id === tempId ? srvKb : k)),
          }))
        }
      })
    }
  }

  function resetDemoData() {
    setRevState(resetRevisionState())
    showToast('Data Hostuner di-reset ke kondisi awal (QRIS Statis).', 'info')
  }

  const exposedState: PersistedStoreState = {
    users: revState.users,
    categories: revState.categories,
    products: revState.products,
    paymentMethods: revState.paymentMethods,
    announcements: revState.announcements,
    kbArticles: revState.kbArticles,
    downloads: revState.downloads,
    tickets: revState.tickets,
    orders: revState.orders,
    invoices: revState.invoices,
    logs: revState.logs,
    cart: activeCart,
    activeUserId: revState.activeUserId,
    currency: revState.currency,
    includePpn11: revState.includePpn11,
  }

  return (
    <HostunerContext.Provider
      value={{
        state: exposedState,
        currentUser,
        role,
        language,
        setLanguage,
        currency: revState.currency,
        setCurrency,
        includePpn11: revState.includePpn11,
        setIncludePpn11,
        formatPrice,
        toasts,
        showToast,
        dismissToast,
        loginUser,
        loginAsDemoCustomer,
        loginAsDemoAdmin,
        registerCustomer,
        logoutUser,
        addToCart,
        updateCartItemCycle,
        removeFromCart,
        createOrderAndInvoice,
        submitTicket,
        saveProduct,
        deleteProduct,
        saveUser,
        deleteUser,
        markInvoicePaid,
        addPaymentMethod,
        togglePaymentMethod,
        deletePaymentMethod,
        addAnnouncement,
        addKbArticle,
        resetDemoData,
      }}
    >
      <RevisionCartContext.Provider
        value={{
          reviewItems,
          reviewSource: revState.reviewSource,
          pendingAuthItem: revState.pendingAuthItem,
          startReviewFromCartSelection,
          moveReviewDraftToCart,
          createOrderForReviewItems,
          clearPendingAuthItem,
        }}
      >
        {children}
      </RevisionCartContext.Provider>
    </HostunerContext.Provider>
  )
}
