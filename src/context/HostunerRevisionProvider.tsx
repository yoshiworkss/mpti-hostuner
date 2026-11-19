import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
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
 * Revision 3.1 drop-in Provider implementing the exact untouched `HostunerContext` contract
 * plus `RevisionCartContext`:
 * - Static QRIS-only payment method + Kode Unik Rp 128 (`v2` storage key)
 * - Per-user isolated Shopping Carts (`cartsByUserId`)
 * - Login gate before Add to Cart / Review & Checkout (preserving pending item across login)
 * - Separate Shopping Cart (`/cart`) vs Review & Checkout (`/checkout`) with selective item checkout
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

  function showToast(text: string, type: ToastMessage['type'] = 'success') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, type, text }])
    window.setTimeout(() => dismissToast(id), 3600)
  }

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

  function loginUser(
    email: string,
    roleHint?: 'customer' | 'admin',
    options?: { password?: string; turnstileToken?: string }
  ): ApiResponse<UserAccount> {
    // Reserved for Backend Node.js API handoff (`hostunerBackendApi.auth.login`)
    void options
    const cleanEmail = email.trim().toLowerCase()
    const matched =
      revState.users.find((u) => u.email.toLowerCase() === cleanEmail) ??
      revState.users.find((u) => u.role === (roleHint ?? 'customer')) ??
      null

    if (!matched) {
      return errorResponse('Akun tidak ditemukan.', { email: 'Email tidak terdaftar.' })
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
    loginUser('budi@sman1solo.sch.id', 'customer')
  }

  function loginAsDemoAdmin() {
    loginUser('admin@hostuner.com', 'admin')
  }

  function registerCustomer(payload: {
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
  }): ApiResponse<UserAccount> {
    // Password & turnstileToken are carried in payload for `hostunerBackendApi.auth.register`
    void payload.password
    void payload.turnstileToken
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
    showToast('Anda telah keluar dari akun.', 'info')
  }

  function addToCart(item: CartItem) {
    // Q3: Guests must login before adding to cart or proceeding to checkout
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

    // Hosting/VPS configurator items open isolated Review & Checkout first
    // so users can either pay immediately or click "Add to Cart" below Checkout.
    if (item.type === 'hosting_domain') {
      setRevState((prev) => ({
        ...prev,
        checkoutDraft: [item],
        reviewSource: 'draft',
      }))
      navigate('/checkout', { replace: true })
      return
    }

    // Domain Register / Transfer items go into the logged-in user's Shopping Cart list
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

  function createOrderForItems(itemsToOrder: CartItem[], removeFromCartAfter: boolean): ApiResponse<InvoiceRecord> {
    if (!currentUser || !userCartKey) {
      return errorResponse('Silakan login terlebih dahulu sebelum menyelesaikan checkout.')
    }
    if (itemsToOrder.length === 0) {
      return errorResponse('Tidak ada item terpilih untuk dibayar.')
    }

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

    const checkedOutIds = new Set(itemsToOrder.map((i) => i.id))

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

  function createOrderForReviewItems(): ApiResponse<InvoiceRecord> {
    return createOrderForItems(reviewItems, revState.reviewSource === 'cart')
  }

  function createOrderAndInvoice(): ApiResponse<InvoiceRecord> {
    return createOrderForItems(activeCart, true)
  }

  function clearPendingAuthItem() {
    setRevState((prev) => ({ ...prev, pendingAuthItem: null }))
  }

  function submitTicket(payload: {
    department: SupportTicketItem['department']
    subject: string
    message: string
    invoiceNumber?: string
    userEmail?: string
  }): ApiResponse<SupportTicketItem> {
    if (!payload.subject.trim() || !payload.message.trim()) {
      return errorResponse('Subjek dan pesan tiket wajib diisi.')
    }
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

  function saveProduct(product: Omit<HostingProduct, 'id'> & { id?: number }): ApiResponse<HostingProduct> {
    const isEdit = Boolean(product.id)
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

  function deleteProduct(productId: number) {
    const target = revState.products.find((p) => p.id === productId)
    setRevState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
      logs: target ? appendRevisionLog(prev, 'product', 'DELETE', `Produk ${target.name} dihapus oleh Admin`) : prev.logs,
    }))
    showToast(`Produk ${target?.name ?? ''} dihapus.`, 'info')
  }

  function saveUser(user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: number }): ApiResponse<UserAccount> {
    const isEdit = Boolean(user.id)
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

  function deleteUser(userId: number) {
    const target = revState.users.find((u) => u.id === userId)
    setRevState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
      logs: target ? appendRevisionLog(prev, 'user', 'DELETE', `Akun ${target.email} dihapus oleh Admin`) : prev.logs,
    }))
    showToast('User dihapus.', 'info')
  }

  function markInvoicePaid(invoiceId: number) {
    const inv = revState.invoices.find((i) => i.id === invoiceId)
    if (!inv) return
    const paidAt = getNowTimestamp()
    setRevState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, paymentStatus: 'paid', paidAt } : i)),
      orders: prev.orders.map((o) => (o.id === inv.orderId ? { ...o, orderStatus: 'active' } : o)),
      logs: appendRevisionLog(
        prev,
        'payment',
        'PAID',
        `Invoice #${inv.invoiceNumber} (${formatMoney(inv.breakdown.totalDueIdr, 'IDR')}) dikonfirmasi LUNAS via QRIS Statis`
      ),
    }))
    showToast(`Invoice #${inv.invoiceNumber} berstatus PAID & layanan aktif!`)
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
    const item: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      dateLabel: 'Nov 19th',
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
  }

  function addKbArticle(payload: { categorySlug: 'hosting' | 'vps'; title: string; content: string }) {
    const item: KnowledgebaseArticle = {
      id: `kb-${Date.now()}`,
      slug: payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      categorySlug: payload.categorySlug,
      categoryLabel: payload.categorySlug === 'hosting' ? 'Hosting' : 'VPS',
      title: payload.title,
      snippet: payload.content.slice(0, 96) + '...',
      content: payload.content,
      views: 1,
      updatedAt: '2026-11-19',
    }
    setRevState((prev) => ({
      ...prev,
      kbArticles: [item, ...prev.kbArticles],
      logs: appendRevisionLog(prev, 'product', 'ARTICLE', `Artikel KB "${payload.title}" diterbitkan`),
    }))
    showToast('Artikel Knowledgebase diterbitkan.')
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
