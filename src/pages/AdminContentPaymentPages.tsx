import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AdminAccessGuard } from '../components/admin/AdminAccessGuard'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { ConfirmModal, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import type { InvoiceRecord, PaymentMethod } from '../types/hostuner'

/**
 * Figma V6 Screen 44 — CRUD News & Artikel (`/admin/content`, UC-07)
 */
export function AdminContentPage() {
  const { state, addAnnouncement, addKbArticle } = useHostuner()

  const [contentType, setContentType] = useState<'announcement' | 'kb'>('announcement')
  const [kbCategory, setKbCategory] = useState<'hosting' | 'vps'>('hosting')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'announcements' | 'kb' | 'downloads'>('announcements')

  function handlePublish(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (title.trim().length < 5) {
      nextErrors.title = 'Judul konten minimal 5 karakter.'
    }
    if (body.trim().length < 15) {
      nextErrors.body = 'Isi konten minimal 15 karakter.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (contentType === 'announcement') {
      addAnnouncement({ title: title.trim(), body: body.trim() })
      setActiveTab('announcements')
    } else {
      addKbArticle({ categorySlug: kbCategory, title: title.trim(), content: body.trim() })
      setActiveTab('kb')
    }

    setTitle('')
    setBody('')
    setErrors({})
  }

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'CRUD News & Artikel' }]}
      backTo="/admin"
      returnPath="/admin/content"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            CRUD News &amp; Artikel (Announcements, KB &amp; Files)
          </h1>
          <p className="text-[13px] text-teal-muted">
            Publikasikan pengumuman resmi Hostuner atau artikel dokumentasi Knowledgebase yang langsung tampil pada halaman publik.
          </p>
        </header>

        {/* Publish News / KB Form Card (Matches Figma 44) */}
        <form
          onSubmit={handlePublish}
          noValidate
          className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
        >
          <h2 className="text-[17px] font-bold text-teal">
            + Publikasikan News / Artikel Knowledgebase Baru
          </h2>
          <p className="mt-1 text-[12px] text-teal-muted">
            Pilih tipe publikasi dan lengkapi judul beserta isi konten.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="cnt-type" className="block text-[12px] font-semibold text-teal">
                Tipe Konten *
              </label>
              <select
                id="cnt-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'announcement' | 'kb')}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              >
                <option value="announcement">Announcement / News</option>
                <option value="kb">Artikel Knowledgebase</option>
              </select>
            </div>

            {contentType === 'kb' ? (
              <div>
                <label htmlFor="cnt-kb-cat" className="block text-[12px] font-semibold text-teal">
                  Folder Kategori Knowledgebase *
                </label>
                <select
                  id="cnt-kb-cat"
                  value={kbCategory}
                  onChange={(e) => setKbCategory(e.target.value as 'hosting' | 'vps')}
                  className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                >
                  <option value="hosting">Hosting (Panduan cPanel, SSL, Email)</option>
                  <option value="vps">VPS (Proxmox, SSH, Firewall)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-end">
                <div className="w-full rounded-[12px] border border-border-soft bg-blush px-3.5 py-2.5 text-[12px] text-teal-muted">
                  Akan diterbitkan ke halaman publik{' '}
                  <Link to="/announcements" className="font-semibold text-coral hover:underline">
                    /announcements
                  </Link>
                  .
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="cnt-title" className="block text-[12px] font-semibold text-teal">
                Judul News / Artikel *
              </label>
              <input
                id="cnt-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  contentType === 'announcement'
                    ? 'Contoh: Promo Akhir Tahun Hosting IIX & Maintenance Terjadwal'
                    : 'Contoh: Cara Instalasi SSL dan Firewall UFW di Proxmox VPS'
                }
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.title} />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="cnt-body" className="block text-[12px] font-semibold text-teal">
                Isi Konten / Ringkasan Panduan *
              </label>
              <textarea
                id="cnt-body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tuliskan isi pengumuman lengkap atau langkah-langkah teknis panduan pelanggan..."
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.body} />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              className="rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              + Publikasikan {contentType === 'announcement' ? 'Announcement' : 'Artikel Knowledgebase'}
            </button>
          </div>
        </form>

        {/* Live Published Content Directory */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-teal">Daftar Konten Terpublikasi</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  activeTab === 'announcements'
                    ? 'border-coral bg-coral text-white'
                    : 'border-border-soft bg-blush text-teal hover:border-salmon'
                }`}
              >
                Announcements ({state.announcements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kb')}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  activeTab === 'kb'
                    ? 'border-coral bg-coral text-white'
                    : 'border-border-soft bg-blush text-teal hover:border-salmon'
                }`}
              >
                Knowledgebase ({state.kbArticles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('downloads')}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  activeTab === 'downloads'
                    ? 'border-coral bg-coral text-white'
                    : 'border-border-soft bg-blush text-teal hover:border-salmon'
                }`}
              >
                Downloads Manuals ({state.downloads.length})
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {activeTab === 'announcements' &&
              state.announcements.map((ann) => (
                <article
                  key={ann.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-salmon-tint px-2.5 py-0.5 text-[10px] font-bold text-coral uppercase">
                        {ann.dateLabel} · {ann.monthGroup}
                      </span>
                      <h3 className="text-[14px] font-bold text-teal">{ann.title}</h3>
                    </div>
                    <p className="line-clamp-2 text-[12px] text-teal-muted">{ann.body}</p>
                  </div>
                  <Link
                    to="/announcements"
                    className="shrink-0 rounded-full border border-border-soft bg-white px-4 py-1.5 text-[12px] font-semibold text-teal hover:border-salmon"
                  >
                    Lihat di Situs →
                  </Link>
                </article>
              ))}

            {activeTab === 'kb' &&
              state.kbArticles.map((art) => (
                <article
                  key={art.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-mint-strip px-2.5 py-0.5 text-[10px] font-bold text-teal uppercase">
                        {art.categoryLabel}
                      </span>
                      <h3 className="text-[14px] font-bold text-teal">{art.title}</h3>
                    </div>
                    <p className="text-[12px] text-teal-muted">
                      {art.snippet} · {art.views} tayangan · Diperbarui {art.updatedAt}
                    </p>
                  </div>
                  <Link
                    to={`/knowledgebase/article/${art.slug}`}
                    className="shrink-0 rounded-full border border-border-soft bg-white px-4 py-1.5 text-[12px] font-semibold text-teal hover:border-salmon"
                  >
                    Buka Artikel →
                  </Link>
                </article>
              ))}

            {activeTab === 'downloads' &&
              state.downloads.map((dl) => (
                <article
                  key={dl.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-teal-muted uppercase">
                        {dl.fileSize}
                      </span>
                      <h3 className="text-[14px] font-bold text-teal">{dl.fileName}</h3>
                    </div>
                    <p className="text-[12px] text-teal-muted">
                      {dl.description} · Diperbarui {dl.updatedAt}
                    </p>
                  </div>
                  <Link
                    to="/downloads/manuals"
                    className="shrink-0 rounded-full border border-border-soft bg-white px-4 py-1.5 text-[12px] font-semibold text-teal hover:border-salmon"
                  >
                    Lihat Downloads →
                  </Link>
                </article>
              ))}
          </div>
        </section>
      </div>
    </AdminAccessGuard>
  )
}

/**
 * Figma V6 Screen 45 adapted to Q1 & Q2 (Static QRIS Only + Kode Unik Rp 128)
 * plus live UC-08 Invoice Payment Verification (`/admin/payments`).
 */
export function AdminPaymentsPage() {
  const { state, formatPrice, addPaymentMethod, togglePaymentMethod, deletePaymentMethod, markInvoicePaid } =
    useHostuner()

  const [channelName, setChannelName] = useState('')
  const [nmid, setNmid] = useState('')
  const [merchantName, setMerchantName] = useState('PT Hostuner Webhosting Indonesia')
  const [verificationNote, setVerificationNote] = useState('QRIS Statis + Kode Unik Rp 128')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [pmToDelete, setPmToDelete] = useState<PaymentMethod | null>(null)
  const [invoiceToConfirm, setInvoiceToConfirm] = useState<InvoiceRecord | null>(null)

  const activeCount = state.paymentMethods.filter((pm) => pm.active).length

  function handleAddQrisChannel(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (channelName.trim().length < 4) {
      nextErrors.channelName = 'Nama kanal QRIS minimal 4 karakter.'
    }
    if (nmid.trim().length < 6) {
      nextErrors.nmid = 'NMID / Merchant ID QRIS wajib diisi (minimal 6 karakter).'
    }
    if (merchantName.trim().length < 3) {
      nextErrors.merchantName = 'Nama merchant wajib diisi.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    addPaymentMethod({
      name: channelName.trim(),
      accountNumber: nmid.trim(),
      accountHolder: merchantName.trim(),
      verificationType: verificationNote.trim() || 'QRIS Statis + Kode Unik Rp 128',
      active: true,
    })

    setChannelName('')
    setNmid('')
    setErrors({})
  }

  const filteredInvoices = state.invoices.filter((inv) => {
    if (invoiceFilter === 'unpaid') return inv.paymentStatus === 'unpaid'
    if (invoiceFilter === 'paid') return inv.paymentStatus === 'paid'
    return true
  })

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'Pengaturan QRIS' }]}
      backTo="/admin"
      returnPath="/admin/payments"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            Pengaturan Pembayaran QRIS Statis &amp; Verifikasi Tagihan
          </h1>
          <p className="text-[13px] text-teal-muted">
            Hostuner hanya memproses pembayaran melalui <strong>QRIS Statis Resmi</strong> dengan verifikasi kode unik{' '}
            <strong>Rp 128</strong>. Konfirmasi pelunasan tagihan pelanggan pada panel di bawah ini.
          </p>
        </header>

        {/* Primary Static QRIS Policy Banner */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-salmon-tint text-coral">
                <FigmaIcon name="credit-card" size={20} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-bold text-teal">Kanal Utama: QRIS Statis Resmi Hostuner</h2>
                  <span className="rounded-full bg-green-soft px-2.5 py-0.5 text-[10px] font-bold text-green-cta uppercase">
                    AKTIF · DEFAULT CHECKOUT
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-teal-muted">
                  Seluruh transaksi checkout pelanggan diarahkan ke kode QRIS Statis resmi dengan penambahan kode unik{' '}
                  <strong>Rp 128</strong> untuk mempercepat pencocokan mutasi pembayaran.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-[12px] border border-border-soft bg-blush p-3.5">
              <p className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">Nama Merchant</p>
              <p className="mt-1 text-[13px] font-bold text-teal">PT Hostuner Webhosting Indonesia</p>
            </div>
            <div className="rounded-[12px] border border-border-soft bg-blush p-3.5">
              <p className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">NMID Resmi</p>
              <p className="mt-1 font-mono text-[13px] font-bold text-charcoal">ID1025008941203</p>
            </div>
            <div className="rounded-[12px] border border-border-soft bg-blush p-3.5">
              <p className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">Mode Verifikasi</p>
              <p className="mt-1 text-[13px] font-bold text-coral">QRIS Statis + Kode Unik Rp 128</p>
            </div>
          </div>
        </section>

        {/* UC-08 Live QRIS Invoice Verification Panel */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                Verifikasi Pembayaran Tagihan QRIS (UC-08)
              </h2>
              <p className="text-[12px] text-teal-muted">
                Cocokkan mutasi QRIS masuk lalu klik Tandai Lunas agar invoice berubah menjadi PAID dan layanan pelanggan aktif.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'all', label: `Semua (${state.invoices.length})` },
                  {
                    key: 'unpaid',
                    label: `UNPAID (${state.invoices.filter((i) => i.paymentStatus === 'unpaid').length})`,
                  },
                  {
                    key: 'paid',
                    label: `PAID (${state.invoices.filter((i) => i.paymentStatus === 'paid').length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setInvoiceFilter(tab.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    invoiceFilter === tab.key
                      ? 'border-coral bg-coral text-white'
                      : 'border-border-soft bg-blush text-teal hover:border-salmon'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredInvoices.length === 0 ? (
              <p className="rounded-[12px] border border-border-soft bg-blush px-4 py-6 text-center text-[13px] text-teal-muted">
                Tidak ada tagihan pada status filter ini.
              </p>
            ) : (
              filteredInvoices.map((inv) => {
                const isPaid = inv.paymentStatus === 'paid'
                return (
                  <article
                    key={inv.id}
                    className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-teal">#{inv.invoiceNumber}</span>
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
                        <strong>{inv.customerName}</strong> ({inv.customerEmail}) · Jatuh Tempo: {inv.dueDate}
                      </p>
                      <p className="text-[12px] text-teal-muted">
                        {inv.itemsSummary.join(' · ')}
                      </p>
                      <p className="text-[13px] font-bold text-coral">
                        Total Bayar QRIS: {formatPrice(inv.breakdown.totalDueIdr)}{' '}
                        <span className="text-[11px] font-normal text-teal-muted">
                          (termasuk kode unik Rp {inv.breakdown.uniqueVerificationCodeIdr})
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/checkout/invoice/${inv.invoiceNumber}`}
                        className="rounded-full border border-border-soft bg-white px-4 py-2 text-[12px] font-semibold text-teal hover:border-salmon"
                      >
                        Lihat Invoice →
                      </Link>
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceToConfirm(inv)}
                          className="rounded-full bg-green-cta px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                        >
                          ✓ Tandai Lunas (PAID)
                        </button>
                      ) : (
                        <span className="rounded-full bg-green-soft px-4 py-2 text-[12px] font-semibold text-green-cta">
                          Lunas · {inv.paidAt ?? 'Terkonfirmasi'}
                        </span>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        {/* Manage Static QRIS Channels List + Add Secondary Outlet Form */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form
            onSubmit={handleAddQrisChannel}
            noValidate
            className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
          >
            <h2 className="text-[16px] font-bold text-teal">+ Tambah Kanal / Outlet QRIS Statis</h2>
            <p className="mt-1 text-[12px] text-teal-muted">
              Tambahkan profil outlet QRIS statis cadangan pada sesi aktif bila diperlukan operasional.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="qris-name" className="block text-[12px] font-semibold text-teal">
                  Nama Kanal QRIS *
                </label>
                <input
                  id="qris-name"
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Contoh: QRIS Statis Cabang Surakarta"
                  className="mt-1 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                />
                <FieldError message={errors.channelName} />
              </div>

              <div>
                <label htmlFor="qris-nmid" className="block text-[12px] font-semibold text-teal">
                  NMID / Merchant ID *
                </label>
                <input
                  id="qris-nmid"
                  type="text"
                  value={nmid}
                  onChange={(e) => setNmid(e.target.value)}
                  placeholder="Contoh: ID1025008941299"
                  className="mt-1 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                />
                <FieldError message={errors.nmid} />
              </div>

              <div>
                <label htmlFor="qris-holder" className="block text-[12px] font-semibold text-teal">
                  Nama Merchant *
                </label>
                <input
                  id="qris-holder"
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                />
                <FieldError message={errors.merchantName} />
              </div>

              <div>
                <label htmlFor="qris-verify" className="block text-[12px] font-semibold text-teal">
                  Mode Verifikasi
                </label>
                <input
                  id="qris-verify"
                  type="text"
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded-full bg-green-cta px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              + Simpan Kanal QRIS
            </button>
          </form>

          <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
            <h2 className="text-[16px] font-bold text-teal">
              Daftar Kanal QRIS Terdaftar ({state.paymentMethods.length})
            </h2>
            <p className="mt-1 text-[12px] text-teal-muted">
              Kanal utama Hostuner (<code className="text-teal">qris-statis</code>) selalu dipertahankan agar pembayaran pelanggan tetap berjalan.
            </p>

            <div className="mt-4 space-y-3">
              {state.paymentMethods.map((pm) => {
                const isPrimary = pm.id === 'qris-statis'
                const disableDeactivate = pm.active && activeCount <= 1
                return (
                  <div
                    key={pm.id}
                    className="rounded-[14px] border border-border-soft bg-blush p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-teal">{pm.name}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          pm.active ? 'bg-green-soft text-green-cta' : 'bg-salmon-tint text-coral'
                        }`}
                      >
                        {pm.active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[12px] text-charcoal">NMID: {pm.accountNumber}</p>
                    <p className="text-[12px] text-teal-muted">
                      {pm.accountHolder} · {pm.verificationType}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={disableDeactivate}
                        title={
                          disableDeactivate
                            ? 'Minimal 1 kanal QRIS Statis harus tetap aktif untuk proses checkout.'
                            : undefined
                        }
                        onClick={() => togglePaymentMethod(pm.id)}
                        className="rounded-full border border-teal/30 bg-white px-3.5 py-1 text-[11px] font-semibold text-teal hover:bg-mint-strip disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {pm.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPmToDelete(pm)}
                          className="rounded-full border border-salmon bg-salmon-tint px-3.5 py-1 text-[11px] font-semibold text-coral hover:bg-coral hover:text-white"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(invoiceToConfirm)}
        title={`Konfirmasi Pelunasan #${invoiceToConfirm?.invoiceNumber ?? ''}?`}
        description={
          invoiceToConfirm
            ? `Konfirmasi bahwa pembayaran QRIS Statis dari ${invoiceToConfirm.customerName} sebesar ${formatPrice(invoiceToConfirm.breakdown.totalDueIdr)} telah masuk. Status pesanan akan otomatis berubah menjadi ACTIVE.`
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

      <ConfirmModal
        open={Boolean(pmToDelete)}
        title={`Hapus Kanal "${pmToDelete?.name ?? ''}"?`}
        description="Kanal QRIS tambahan ini akan dihapus dari daftar aktif sesi saat ini."
        confirmLabel="Hapus Kanal"
        cancelLabel="Batal"
        tone="coral"
        onCancel={() => setPmToDelete(null)}
        onConfirm={() => {
          if (pmToDelete) {
            deletePaymentMethod(pmToDelete.id)
          }
          setPmToDelete(null)
        }}
      />
    </AdminAccessGuard>
  )
}
