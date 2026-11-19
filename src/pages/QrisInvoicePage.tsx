import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { RestrictedPageGate } from '../components/support/RestrictedPageGate'
import { BreadcrumbBackBar, ConfirmModal } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { STATIC_QRIS_PAYMENT_METHOD } from '../services/hostunerRevisionStore'

/**
 * Revision 3.1 Transparent Invoice Page (`/checkout/invoice/:invoiceNumber`, Figma 19B):
 * - Strictly Static QRIS payment (Q1) with Kode Unik Rp 128 preserved (Q2).
 * - Zero Bank Transfer / BCA / Mandiri / BNI / BRI references or `Salin No. Rek`.
 * - Protected by authentication & ownership check (only invoice owner or Admin may view).
 * - Dev-only quick PAID verification gated behind `import.meta.env.DEV` (Q5).
 */
export function QrisInvoicePage() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>()
  const navigate = useNavigate()
  const { state, role, currentUser, formatPrice, markInvoicePaid, showToast } = useHostuner()

  const [confirmPayModalOpen, setConfirmPayModalOpen] = useState(false)
  const isDev = import.meta.env.DEV
  const qrisImageUrl = import.meta.env.VITE_HOSTUNER_QRIS_IMAGE_URL as string | undefined

  /* Block unauthenticated Guest access to prevent invoice PII exposure */
  if (role === 'guest' || !currentUser) {
    const targetPath = invoiceNumber
      ? `/checkout/invoice/${encodeURIComponent(invoiceNumber)}`
      : '/client'
    return (
      <RestrictedPageGate
        pageName="Detail Tagihan & Invoice QRIS"
        returnPath={targetPath}
        description="Silakan login terlebih dahulu menggunakan akun pemilik tagihan untuk melihat rincian invoice dan melakukan pembayaran QRIS Statis."
      />
    )
  }

  const normalizedParam = (invoiceNumber ?? '').replace(/^#/, '').trim().toLowerCase()
  const invoice =
    state.invoices.find((inv) => inv.invoiceNumber.toLowerCase() === normalizedParam) ??
    (normalizedParam === ''
      ? state.invoices.find(
          (inv) => role === 'admin' || inv.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
        )
      : undefined)

  /* Prevent horizontal privilege escalation across different customer accounts */
  if (invoice && role !== 'admin' && invoice.customerEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
    return (
      <PageShell>
        <div className="space-y-6">
          <BreadcrumbBackBar
            backTo="/client"
            backLabel="← Kembali ke Client Area"
            segments={[
              { label: 'Portal Home', to: '/' },
              { label: 'Client Area', to: '/client' },
              { label: 'Akses Tagihan Ditolak' },
            ]}
          />
          <section className="mx-auto max-w-[620px] rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
            <span className="inline-flex rounded-full bg-salmon-tint px-3.5 py-1 text-[11px] font-bold tracking-wide text-coral uppercase">
              403 • Akses Ditolak
            </span>
            <h1 className="mt-3 text-[22px] font-bold text-teal">Tagihan Ini Terdaftar pada Akun Lain</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
              Demi keamanan data pelanggan, Anda hanya dapat melihat invoice yang diterbitkan untuk akun{' '}
              <strong className="text-teal">{currentUser.email}</strong>.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/client"
                className="rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
              >
                ← Ke Dashboard Pelanggan
              </Link>
              <Link
                to="/cart"
                className="rounded-full border border-border-soft bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
              >
                Buka Shopping Cart
              </Link>
            </div>
          </section>
        </div>
      </PageShell>
    )
  }

  if (!invoice) {
    return (
      <PageShell>
        <div className="space-y-6">
          <BreadcrumbBackBar
            backTo="/cart"
            backLabel="← Back"
            segments={[
              { label: 'Portal Home', to: '/' },
              { label: 'Shopping Cart', to: '/cart' },
              { label: 'Invoice Tidak Ditemukan' },
            ]}
          />
          <section className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
            <h1 className="text-[22px] font-bold text-teal">Invoice #{invoiceNumber} Tidak Ditemukan</h1>
            <p className="mt-2 text-[13px] text-teal-muted">
              Nomor tagihan tidak tersedia di sesi saat ini. Silakan periksa kembali nomor invoice atau kembali ke
              Shopping Cart.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/client"
                className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-hover"
              >
                Lihat Daftar Tagihan Saya →
              </Link>
              <Link
                to="/cart"
                className="rounded-full border border-border-soft bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal"
              >
                ← Kembali ke Shopping Cart
              </Link>
            </div>
          </section>
        </div>
      </PageShell>
    )
  }

  const isPaid = invoice.paymentStatus === 'paid'
  const lineStartIdx = invoice.itemsSummary.length

  function handleCopyExactAmount() {
    const exactInteger = String(Math.round(invoice!.breakdown.totalDueIdr))
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(exactInteger)
    }
    showToast(`Nominal tepat ${formatPrice(invoice!.breakdown.totalDueIdr)} disalin!`, 'info')
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <BreadcrumbBackBar
          backTo="/cart"
          backLabel="← Back"
          segments={[
            { label: 'Portal Home', to: '/' },
            { label: 'Shopping Cart', to: '/cart' },
            { label: `Payment & Transparent Invoice (#${invoice.invoiceNumber})` },
          ]}
        />

        {/* Header Title & Status Pill */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[23px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
            Payment Checkout &amp; Rincian Tagihan Transparan
          </h1>
          <span
            className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wide uppercase ${
              isPaid ? 'bg-green-soft text-green-cta' : 'bg-salmon-tint text-coral'
            }`}
          >
            INVOICE #{invoice.invoiceNumber} • {isPaid ? 'PAID' : 'UNPAID'}
          </span>
        </header>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          {/* Left Column: Transparent Breakdown + Static QRIS Payment Panel */}
          <div className="w-full min-w-0 flex-1 space-y-5">
            {/* Rincian Tagihan Transparan */}
            <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
              <h2 className="text-[18px] font-bold text-teal">
                Rincian Tagihan Transparan (Invoice #{invoice.invoiceNumber})
              </h2>
              <p className="mt-1 text-[12px] text-teal-muted">
                Diterbitkan untuk: <strong className="text-teal">{invoice.customerName}</strong> (
                {invoice.customerEmail}) • Jatuh Tempo: <strong className="text-teal">{invoice.dueDate}</strong>
              </p>

              <div className="mt-4 space-y-2.5 text-[13px]">
                {invoice.itemsSummary.map((line, idx) => (
                  <div
                    key={`${line}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3"
                  >
                    <span className="font-medium text-teal">
                      {idx + 1}. {line}
                    </span>
                    <span className="font-bold text-teal">
                      {idx === 0
                        ? formatPrice(invoice.breakdown.subtotalIdr)
                        : invoice.breakdown.domainPriceIdr === 0
                          ? 'GRATIS (Rp 0)'
                          : formatPrice(invoice.breakdown.domainPriceIdr)}
                    </span>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3">
                  <span className="font-medium text-teal">
                    {lineStartIdx + 1}. Biaya Setup Server CloudLinux + Free SSL Certificate
                  </span>
                  <span className="font-bold text-green-cta">GRATIS (Rp 0)</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3">
                  <span className="font-medium text-teal">
                    {lineStartIdx + 2}. Pajak PPN ({invoice.breakdown.taxRatePercent}%) / Biaya Admin Tambahan
                  </span>
                  <span className="font-bold text-teal">{formatPrice(invoice.breakdown.taxAmountIdr)}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3">
                  <span className="font-medium text-teal">
                    {lineStartIdx + 3}. Kode Unik Verifikasi QRIS Statis
                  </span>
                  <span className="font-bold text-teal">
                    {formatPrice(invoice.breakdown.uniqueVerificationCodeIdr)}
                  </span>
                </div>
              </div>
            </section>

            {/* Static QRIS Payment Panel (No Bank Transfer) */}
            <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[18px] font-bold text-teal">Pembayaran Resmi via QRIS Statis</h2>
                <span className="rounded-full bg-mint-strip px-3 py-1 text-[11px] font-bold text-teal">
                  Satu Metode Pembayaran: QRIS
                </span>
              </div>

              <div className="mt-4 flex flex-col items-center gap-6 rounded-[16px] border border-salmon-border bg-blush p-5 sm:flex-row sm:items-start">
                {/* Static QRIS Display Frame (uses real asset URL when provided, no forged QR code) */}
                <div className="flex h-[184px] w-[184px] shrink-0 flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-salmon bg-white p-4 text-center">
                  {qrisImageUrl ? (
                    <img
                      src={qrisImageUrl}
                      alt="QRIS Statis Resmi PT Hostuner Webhosting Indonesia"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <span className="inline-block rounded-full bg-salmon-tint px-3 py-0.5 text-[10px] font-bold tracking-wider text-coral uppercase">
                        QRIS Statis
                      </span>
                      <p className="text-[12px] font-bold text-teal">PT Hostuner Webhosting</p>
                      <p className="text-[10px] leading-snug text-teal-muted">
                        Slot gambar QRIS Statis resmi merchant Hostuner
                      </p>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3 text-[13px]">
                  <div>
                    <p className="font-bold text-coral">{STATIC_QRIS_PAYMENT_METHOD.name}</p>
                    <p className="mt-0.5 text-[12px] text-charcoal">
                      Merchant: <strong>{STATIC_QRIS_PAYMENT_METHOD.accountHolder}</strong> • NMID:{' '}
                      <strong>{STATIC_QRIS_PAYMENT_METHOD.accountNumber}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-salmon-border bg-white px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold text-teal-muted uppercase">
                        Ketik Nominal Tepat (Termasuk Kode Unik)
                      </p>
                      <p className="text-[20px] font-bold text-coral">
                        {formatPrice(invoice.breakdown.totalDueIdr)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyExactAmount}
                      className="rounded-full border border-salmon bg-salmon-tint px-4 py-1.5 text-[12px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
                    >
                      Salin Nominal
                    </button>
                  </div>

                  <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-teal">
                    <li>Buka aplikasi e-Wallet (GoPay, OVO, DANA, ShopeePay) atau Mobile Banking Anda.</li>
                    <li>Pindai (scan) QRIS Statis resmi Hostuner di samping.</li>
                    <li>
                      Masukkan nominal <strong>persis hingga 3 digit terakhir</strong> (termasuk kode unik{' '}
                      <strong>Rp 128</strong>) agar tim kami dapat memverifikasi pembayaran dengan cepat.
                    </li>
                  </ol>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Coral-Header Total Pembayaran Card */}
          <aside className="w-full shrink-0 md:sticky md:top-6 md:w-[300px] lg:w-[330px]">
            <div className="overflow-hidden rounded-[20px] border border-salmon-border bg-white shadow-soft">
              <div className="bg-coral px-6 py-4">
                <h2 className="text-[17px] font-bold text-white">Total Pembayaran</h2>
              </div>

              <div className="space-y-3 p-6 text-[13px]">
                <div className="flex items-center justify-between text-charcoal">
                  <span>Subtotal Layanan:</span>
                  <span className="font-semibold">{formatPrice(invoice.breakdown.subtotalIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-charcoal">
                  <span>Biaya Setup &amp; Domain:</span>
                  <span className="font-semibold text-green-cta">
                    {invoice.breakdown.domainPriceIdr === 0
                      ? 'GRATIS'
                      : formatPrice(invoice.breakdown.domainPriceIdr)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-charcoal">
                  <span>Pajak PPN ({invoice.breakdown.taxRatePercent}%):</span>
                  <span className="font-semibold">{formatPrice(invoice.breakdown.taxAmountIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-charcoal">
                  <span>Kode Unik QRIS:</span>
                  <span className="font-semibold">
                    {formatPrice(invoice.breakdown.uniqueVerificationCodeIdr)}
                  </span>
                </div>

                <div className="my-2 h-px bg-border-soft" />

                <div>
                  <p className="text-[16px] font-bold text-teal">Total Tagihan Anda:</p>
                  <p className="mt-1 text-[24px] font-bold text-teal">
                    {formatPrice(invoice.breakdown.totalDueIdr)}
                  </p>
                </div>

                {isPaid ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="rounded-[12px] border border-green-cta bg-green-soft px-4 py-3 text-[12px] font-semibold text-green-cta">
                      ✓ Tagihan LUNAS {invoice.paidAt ? `(${invoice.paidAt})` : ''}. Layanan Anda telah aktif.
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex w-full items-center justify-center rounded-full border border-teal bg-white px-5 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:bg-mint-strip"
                    >
                      Cetak Bukti Tagihan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmPayModalOpen(true)}
                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-cta px-6 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                  >
                    <span>✓ Konfirmasi Pembayaran →</span>
                  </button>
                )}

                <Link
                  to="/client"
                  className="inline-flex w-full items-center justify-center rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Ke Dashboard Pelanggan →
                </Link>

                <Link
                  to="/cart"
                  className="inline-flex w-full items-center justify-center rounded-full border border-salmon bg-white px-6 py-2.5 text-[13px] font-semibold text-coral transition-colors hover:bg-salmon-tint"
                >
                  ← Kembali ke Shopping Cart
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Confirm Payment Modal */}
      <ConfirmModal
        open={confirmPayModalOpen}
        title={`Konfirmasi Pembayaran QRIS #${invoice.invoiceNumber}`}
        description={`Pastikan Anda telah memindai QRIS Statis resmi Hostuner dengan nominal tepat sebesar ${formatPrice(invoice.breakdown.totalDueIdr)} (termasuk kode unik Rp 128).`}
        confirmLabel={isDev ? 'Verifikasi Lunas (Mode Dev)' : 'Buka Tiket Konfirmasi Pembayaran →'}
        cancelLabel="Tutup"
        tone="green"
        onConfirm={() => {
          setConfirmPayModalOpen(false)
          if (isDev) {
            markInvoicePaid(invoice.id)
          } else {
            navigate(`/tickets/open?invoice=${encodeURIComponent(invoice.invoiceNumber)}`)
          }
        }}
        onCancel={() => setConfirmPayModalOpen(false)}
      >
        {isDev && (
          <div className="rounded-[12px] border border-border-soft bg-blush p-3.5 text-[12px] text-charcoal">
            <p>
              Atau kirim bukti scan QRIS melalui tiket:{' '}
              <button
                type="button"
                onClick={() => {
                  setConfirmPayModalOpen(false)
                  navigate(`/tickets/open?invoice=${encodeURIComponent(invoice.invoiceNumber)}`)
                }}
                className="font-bold text-coral hover:underline"
              >
                Buka Tiket Konfirmasi Pembayaran →
              </button>
            </p>
          </div>
        )}
      </ConfirmModal>
    </PageShell>
  )
}
