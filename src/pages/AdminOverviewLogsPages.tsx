import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminAccessGuard } from '../components/admin/AdminAccessGuard'
import { FigmaIcon, type FigmaIconName } from '../components/icons/FigmaIcon'
import { ConfirmModal } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import type { ActivityLog, InvoiceRecord } from '../types/hostuner'

function getLogBadgeClass(badge: string): string {
  const b = badge.toUpperCase()
  if (b === 'PAID' || b === 'CREATE') {
    return 'bg-green-soft text-green-cta border-green-cta/30'
  }
  if (b === 'DELETE' || b === 'LOGOUT') {
    return 'bg-amber-soft text-charcoal border-salmon-border'
  }
  if (b === 'LOGIN' || b === 'REGISTER' || b === 'NEWS' || b === 'ARTICLE' || b === 'TICKET') {
    return 'bg-mint-strip text-teal border-teal/20'
  }
  return 'bg-salmon-tint text-coral border-salmon'
}

function getLogTypeTag(logType: ActivityLog['logType']): { label: string; style: string } {
  if (logType === 'product') {
    return { label: 'LOG PRODUCT', style: 'bg-salmon-tint text-coral border-salmon-border' }
  }
  if (logType === 'user') {
    return { label: 'LOG USER', style: 'bg-mint-strip text-teal border-teal/20' }
  }
  return { label: 'LOG PAYMENT', style: 'bg-green-soft text-charcoal border-green-cta/30' }
}

interface OverviewModuleCard {
  title: string
  description: string
  to: string
  icon: FigmaIconName
  meta: string
}

/**
 * Figma V6 Screen 40 — Admin Dashboard Overview (`/admin`)
 */
export function AdminOverviewPage() {
  const { state, currentUser, resetDemoData } = useHostuner()
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const activePaymentCount = state.paymentMethods.filter((pm) => pm.active).length
  const unpaidInvoices = state.invoices.filter((inv) => inv.paymentStatus === 'unpaid')
  const totalContentCount = state.announcements.length + state.kbArticles.length

  const latestProductLog = state.logs.find((l) => l.logType === 'product')
  const latestUserLog = state.logs.find((l) => l.logType === 'user')
  const latestPaymentLog = state.logs.find((l) => l.logType === 'payment')
  const latestSummaryLogs = [latestProductLog, latestUserLog, latestPaymentLog].filter(
    (item): item is ActivityLog => Boolean(item)
  )

  const kpiCards = [
    {
      value: state.products.length,
      label: 'Produk & Paket (CRUD)',
      sublabel: `${state.categories.length} Kategori Store`,
      tone: 'text-coral',
      to: '/admin/products',
    },
    {
      value: state.users.length,
      label: 'User Terdaftar (CRUD)',
      sublabel: `${state.users.filter((u) => u.status === 'ACTIVE').length} Akun Aktif`,
      tone: 'text-teal',
      to: '/admin/users',
    },
    {
      value: totalContentCount,
      label: 'News & Artikel (CRUD)',
      sublabel: `${state.announcements.length} News · ${state.kbArticles.length} KB`,
      tone: 'text-teal',
      to: '/admin/content',
    },
    {
      value: activePaymentCount,
      label: 'Kanal QRIS Aktif',
      sublabel: `${unpaidInvoices.length} Tagihan UNPAID`,
      tone: unpaidInvoices.length > 0 ? 'text-coral' : 'text-green-cta',
      to: '/admin/payments',
    },
  ]

  const modules: OverviewModuleCard[] = [
    {
      title: 'CRUD Product',
      description: 'Tambah, ubah harga, stok, spesifikasi, atau hapus paket Hosting IIX, Paket Sekolah, dan Proxmox VPS.',
      to: '/admin/products',
      icon: 'spanner',
      meta: `${state.products.length} paket terdaftar`,
    },
    {
      title: 'CRUD User',
      description: 'Kelola data akun pelanggan, hak akses role (Client / Admin), serta status akun aktif maupun suspend.',
      to: '/admin/users',
      icon: 'user-filled',
      meta: `${state.users.length} akun terdaftar`,
    },
    {
      title: 'CRUD News & Artikel',
      description: 'Publikasikan pengumuman resmi Announcements dan artikel panduan teknis Knowledgebase Hosting & VPS.',
      to: '/admin/content',
      icon: 'announcement',
      meta: `${totalContentCount} konten aktif`,
    },
    {
      title: 'Pengaturan Pembayaran QRIS',
      description: 'Kelola konfigurasi QRIS Statis resmi Hostuner (+ Kode Unik Rp 128) dan konfirmasi tagihan menjadi PAID.',
      to: '/admin/payments',
      icon: 'credit-card',
      meta: `${unpaidInvoices.length} tagihan menunggu`,
    },
  ]

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'Overview' }]}
      backTo="/"
      returnPath="/admin"
    >
      <div className="space-y-6">
        {/* Heading */}
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            Admin Dashboard Overview
          </h1>
          <p className="text-[13px] text-teal-muted">
            Pusat kendali operasional Hostuner — kelola katalog produk, akun pelanggan, publikasi konten, dan verifikasi pembayaran QRIS Statis.
          </p>
        </header>

        {/* 4 KPI Cards (Matches Figma 40) */}
        <section aria-label="Ringkasan Metrik Admin" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-[16px] border border-salmon-border bg-white p-5 shadow-soft transition-colors hover:border-coral"
            >
              <p className={`text-[32px] leading-none font-bold ${card.tone}`}>{card.value}</p>
              <p className="mt-2.5 text-[13px] font-bold text-teal group-hover:text-coral">{card.label}</p>
              <p className="mt-1 text-[11px] font-medium text-teal-muted">{card.sublabel}</p>
            </Link>
          ))}
        </section>

        {/* Unpaid Invoice Alert Strip (UC-08 Direct Entry) */}
        {unpaidInvoices.length > 0 && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-salmon bg-salmon-tint px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-white">
                <FigmaIcon name="credit-card-white" size={16} />
              </span>
              <div>
                <p className="text-[13px] font-bold text-coral">
                  {unpaidInvoices.length} Tagihan QRIS Statis Menunggu Konfirmasi Pembayaran
                </p>
                <p className="text-[12px] text-charcoal">
                  Verifikasi mutasi QRIS + Kode Unik Rp 128 lalu tandai tagihan sebagai PAID agar layanan pelanggan langsung aktif.
                </p>
              </div>
            </div>
            <Link
              to="/admin/payments"
              className="rounded-full bg-coral px-5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              Verifikasi Tagihan →
            </Link>
          </section>
        )}

        {/* Ringkasan Aktivitas Terbaru Card (Matches Figma 40) */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                Ringkasan Aktivitas Terbaru (Log Product, Log User, Log Payment)
              </h2>
              <p className="text-[12px] text-teal-muted">
                Rekaman otomatis perubahan data terbaru dari seluruh modul sistem.
              </p>
            </div>
            <Link
              to="/admin/logs"
              className="rounded-full border border-salmon bg-salmon-tint px-4 py-1.5 text-[12px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
            >
              Buka Log Activity →
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {latestSummaryLogs.map((log) => {
              const tag = getLogTypeTag(log.logType)
              return (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 rounded-[12px] border border-border-soft bg-blush px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tag.style}`}
                    >
                      {tag.label}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${getLogBadgeClass(log.badge)}`}
                    >
                      {log.badge}
                    </span>
                    <p className="text-[13px] font-medium text-charcoal">{log.message}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-teal-muted">{log.timestamp}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Modul Manajemen Admin 2x2 Grid (Matches Figma 40) */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">Modul Manajemen Admin (Sesuai Spesifikasi Sistem)</h2>
          <p className="mt-1 text-[12px] text-teal-muted">
            Pilih modul di bawah ini untuk mengelola data layanan yang langsung terhubung ke etalase dan area pelanggan.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {modules.map((mod) => (
              <article
                key={mod.title}
                className="flex flex-col justify-between rounded-[16px] border border-salmon-border bg-blush p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-salmon-border bg-white text-coral">
                      <FigmaIcon name={mod.icon} size={18} />
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-teal-muted">
                      {mod.meta}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[16px] font-bold text-teal">{mod.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-teal-muted">{mod.description}</p>
                </div>
                <div className="mt-4">
                  <Link
                    to={mod.to}
                    className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-coral-hover"
                  >
                    <span>Buka Modul →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Session Info & Safe Demo Reset Strip */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-border-soft bg-white px-5 py-4 shadow-soft">
          <div className="text-[12px] text-teal-muted">
            Sesi aktif: <strong className="text-teal">{currentUser?.name}</strong> ({currentUser?.email}) · Total{' '}
            <strong className="text-teal">{state.logs.length}</strong> catatan log tersimpan lokal.
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="rounded-full border border-border-soft bg-blush px-4 py-1.5 text-[12px] font-semibold text-teal transition-colors hover:border-coral hover:text-coral"
          >
            Reset Data Awal Demo
          </button>
        </section>
      </div>

      <ConfirmModal
        open={confirmResetOpen}
        title="Reset Data Demo Hostuner?"
        description="Seluruh perubahan produk, akun user, berita, artikel KB, dan status tagihan pada browser ini akan dikembalikan ke data awal QRIS Statis. Sesi login Anda juga akan di-reset."
        confirmLabel="Ya, Reset Data"
        cancelLabel="Batal"
        tone="coral"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false)
          resetDemoData()
        }}
      />
    </AdminAccessGuard>
  )
}

/**
 * Figma V6 Screen 41 — Log Activity (Product, User & Payment) (`/admin/logs`)
 * Includes live UC-08 quick confirmation for unpaid QRIS invoices.
 */
export function AdminLogsPage() {
  const { state, formatPrice, markInvoicePaid } = useHostuner()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'user' | 'payment'>('all')
  const [invoiceToConfirm, setInvoiceToConfirm] = useState<InvoiceRecord | null>(null)

  const q = searchQuery.trim().toLowerCase()
  const matchesQuery = (log: ActivityLog) =>
    !q ||
    log.message.toLowerCase().includes(q) ||
    log.badge.toLowerCase().includes(q) ||
    log.timestamp.toLowerCase().includes(q)

  const productLogs = state.logs.filter((l) => l.logType === 'product' && matchesQuery(l))
  const userLogs = state.logs.filter((l) => l.logType === 'user' && matchesQuery(l))
  const paymentLogs = state.logs.filter((l) => l.logType === 'payment' && matchesQuery(l))

  const filterTabs: Array<{ key: 'all' | 'product' | 'user' | 'payment'; label: string; count: number }> = [
    { key: 'all', label: 'Semua Log', count: productLogs.length + userLogs.length + paymentLogs.length },
    { key: 'product', label: '1. Log Product', count: productLogs.length },
    { key: 'user', label: '2. Log User', count: userLogs.length },
    { key: 'payment', label: '3. Log Payment', count: paymentLogs.length },
  ]

  function renderLogGroup(title: string, subtitle: string, items: ActivityLog[]) {
    return (
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-bold text-teal">{title}</h2>
            <p className="text-[12px] text-teal-muted">{subtitle}</p>
          </div>
          <span className="rounded-full bg-blush px-3 py-1 text-[11px] font-bold text-teal-muted">
            {items.length} catatan
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {items.length === 0 ? (
            <p className="rounded-[12px] border border-border-soft bg-blush px-4 py-5 text-center text-[13px] text-teal-muted">
              Tidak ada catatan aktivitas yang sesuai dengan filter pencarian.
            </p>
          ) : (
            items.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 rounded-[12px] border border-border-soft bg-blush px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getLogBadgeClass(log.badge)}`}
                  >
                    {log.badge}
                  </span>
                  <p className="text-[13px] font-medium text-charcoal">{log.message}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-teal-muted">{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </section>
    )
  }

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'Log Activity' }]}
      backTo="/admin"
      returnPath="/admin/logs"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            Log Activity (Product, User &amp; Payment)
          </h1>
          <p className="text-[13px] text-teal-muted">
            Pantau riwayat perubahan katalog layanan, aktivitas autentikasi pelanggan, dan status transaksi QRIS Statis.
          </p>
        </header>

        {/* Filter & Search Bar */}
        <section className="rounded-[18px] border border-salmon-border bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-teal-muted">
                <FigmaIcon name="search" size={15} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor invoice, nama produk, email user, atau kata kunci log..."
                aria-label="Cari catatan log aktivitas"
                className="w-full rounded-[12px] border border-border-soft bg-input-bg py-2.5 pr-4 pl-10 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-coral focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => {
                const active = typeFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTypeFilter(tab.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      active
                        ? 'border-coral bg-coral text-white'
                        : 'border-border-soft bg-blush text-teal hover:border-salmon'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Live UC-08 Payment Confirmation Strip */}
        {(typeFilter === 'all' || typeFilter === 'payment') && (
          <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-bold text-teal">
                  Konfirmasi Pembayaran QRIS Statis (UC-08)
                </h2>
                <p className="text-[12px] text-teal-muted">
                  Verifikasi tagihan pelanggan agar status invoice berubah menjadi PAID dan tercatat pada Log Payment.
                </p>
              </div>
              <Link
                to="/admin/payments"
                className="text-[12px] font-semibold text-coral hover:underline"
              >
                Kelola Pengaturan QRIS →
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {state.invoices.map((inv) => {
                const isPaid = inv.paymentStatus === 'paid'
                return (
                  <div
                    key={inv.id}
                    className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-teal">#{inv.invoiceNumber}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            isPaid ? 'bg-green-soft text-green-cta' : 'bg-salmon-tint text-coral'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-muted">
                          {inv.paymentMethodName}
                        </span>
                      </div>
                      <p className="text-[12px] text-charcoal">
                        {inv.customerName} ({inv.customerEmail}) · Nominal:{' '}
                        <strong>{formatPrice(inv.breakdown.totalDueIdr)}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/checkout/invoice/${inv.invoiceNumber}`}
                        className="rounded-full border border-border-soft bg-white px-3.5 py-1.5 text-[12px] font-semibold text-teal transition-colors hover:border-salmon"
                      >
                        Lihat Invoice
                      </Link>
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceToConfirm(inv)}
                          className="rounded-full bg-green-cta px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                        >
                          ✓ Tandai Lunas (PAID)
                        </button>
                      ) : (
                        <span className="rounded-full bg-green-soft px-3.5 py-1.5 text-[12px] font-semibold text-green-cta">
                          Lunas · {inv.paidAt ?? 'Terkonfirmasi'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 3 Grouped Log Cards (Matches Figma 41) */}
        {(typeFilter === 'all' || typeFilter === 'product') &&
          renderLogGroup(
            '1. Log Product',
            'Catatan penambahan, pembaruan harga/stok, penghapusan produk, serta publikasi konten.',
            productLogs
          )}

        {(typeFilter === 'all' || typeFilter === 'user') &&
          renderLogGroup(
            '2. Log User',
            'Catatan login, registrasi akun baru, logout, serta perubahan data akun oleh Admin.',
            userLogs
          )}

        {(typeFilter === 'all' || typeFilter === 'payment') &&
          renderLogGroup(
            '3. Log Payment',
            'Catatan penerbitan invoice QRIS Statis, tiket konfirmasi pembayaran, dan pelunasan tagihan.',
            paymentLogs
          )}
      </div>

      <ConfirmModal
        open={Boolean(invoiceToConfirm)}
        title={`Konfirmasi Pelunasan #${invoiceToConfirm?.invoiceNumber ?? ''}?`}
        description={
          invoiceToConfirm
            ? `Pastikan mutasi QRIS Statis dari ${invoiceToConfirm.customerName} sebesar ${formatPrice(invoiceToConfirm.breakdown.totalDueIdr)} (termasuk kode unik Rp 128) telah diterima. Status pesanan pelanggan akan otomatis menjadi ACTIVE.`
            : ''
        }
        confirmLabel="Konfirmasi PAID"
        cancelLabel="Batal"
        tone="green"
        onCancel={() => setInvoiceToConfirm(null)}
        onConfirm={() => {
          if (invoiceToConfirm) {
            markInvoicePaid(invoiceToConfirm.id)
          }
          setInvoiceToConfirm(null)
        }}
      />
    </AdminAccessGuard>
  )
}
