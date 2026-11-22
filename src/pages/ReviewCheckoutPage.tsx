import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { useRevisionCart } from '../context/useRevisionCart'
import { calculateBillingBreakdown } from '../services/hostunerApi'
import { STATIC_QRIS_PAYMENT_METHOD } from '../services/hostunerRevisionStore'

const VALID_PROMO_CODES: Record<string, string> = {
  HOSTUNER15: 'Kode promo HOSTUNER15 valid — diskon tahunan 15% aktif pada siklus Annually.',
  SEKOLAH: 'Kode promo SEKOLAH valid — gratis domain resmi .sch.id berlaku pada Paket Web Sekolah.',
  WELCOME10: 'Kode promo WELCOME10 terverifikasi — bonus Free Setup CloudLinux & AutoSSL aktif.',
}

/**
 * Revision 3.1 Review & Checkout Page (`/checkout`, Figma Screen 19):
 * - Displays ONLY the newly configured item (`draft`) or the selected subset from Shopping Cart (`cart`).
 * - Payment method is strictly Static QRIS (Q1) + Kode Unik Rp 128 (Q2).
 * - Places `+ Add to Cart` directly beneath `Checkout →` when reviewing a fresh draft item (Kaishan feedback #3).
 */
export function ReviewCheckoutPage() {
  const navigate = useNavigate()
  const { role, includePpn11, setIncludePpn11, formatPrice, updateCartItemCycle, showToast } = useHostuner()
  const { reviewItems, reviewSource, moveReviewDraftToCart, createOrderForReviewItems } = useRevisionCart()

  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState<string | undefined>(undefined)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDev = import.meta.env.DEV

  /* Guest Login Gate (Q3) */
  if (role === 'guest') {
    return (
      <PageShell>
        <div className="space-y-6">
          <BreadcrumbBackBar
            backTo="/store/hosting-iix"
            backLabel="← Back to Store"
            segments={[
              { label: 'Home', to: '/' },
              { label: 'Review & Checkout' },
            ]}
          />

          <section className="mx-auto max-w-[640px] rounded-[20px] border border-salmon-border bg-white px-6 py-10 text-center shadow-soft">
            <span className="inline-flex rounded-full bg-salmon-tint px-4 py-1 text-[11px] font-bold tracking-wide text-coral uppercase">
              Login Diperlukan
            </span>
            <h1 className="mt-4 text-[22px] font-bold text-teal">Masuk untuk Melanjutkan Review &amp; Checkout</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
              Paket yang Anda pilih sudah tersimpan sementara. Silakan login terlebih dahulu untuk menambahkan ke
              Shopping Cart atau menerbitkan Invoice QRIS.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login?redirect=/checkout"
                className="rounded-full bg-teal px-7 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Login Sekarang →
              </Link>
              <Link
                to="/register?redirect=/checkout"
                className="rounded-full border border-coral bg-white px-6 py-2.5 text-[13px] font-semibold text-coral hover:bg-salmon-tint"
              >
                Daftar Akun Baru
              </Link>
            </div>
          </section>
        </div>
      </PageShell>
    )
  }

  /* Empty Review State */
  if (reviewItems.length === 0) {
    return (
      <PageShell>
        <div className="space-y-6">
          <BreadcrumbBackBar
            backTo="/cart"
            backLabel="← Ke Shopping Cart"
            segments={[
              { label: 'Home', to: '/' },
              { label: 'Shopping Cart', to: '/cart' },
              { label: 'Review & Checkout' },
            ]}
          />

          <section className="mx-auto max-w-[640px] rounded-[20px] border border-salmon-border bg-white px-6 py-10 text-center shadow-soft">
            <h1 className="text-[22px] font-bold text-teal">Belum Ada Layanan yang Dipilih untuk Checkout</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
              Pilih paket dari Store atau centang layanan di halaman Shopping Cart Anda terlebih dahulu.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/cart"
                className="rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Buka Shopping Cart →
              </Link>
              <Link
                to="/store/hosting-iix"
                className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-hover"
              >
                Jelajahi Layanan Store
              </Link>
            </div>
          </section>
        </div>
      </PageShell>
    )
  }

  const breakdown = calculateBillingBreakdown(reviewItems, includePpn11, 128)
  const hasFreeDomain = reviewItems.some((item) => item.isFreeDomainApplied)

  function handleValidatePromo(e: React.FormEvent) {
    e.preventDefault()
    const normalized = promoInput.trim().toUpperCase()
    if (!normalized) {
      setPromoSuccess(null)
      setPromoError('Masukkan kode promo terlebih dahulu (contoh: HOSTUNER15 atau SEKOLAH).')
      return
    }
    const matched = VALID_PROMO_CODES[normalized]
    if (!matched) {
      setPromoSuccess(null)
      setPromoError(`Kode promo "${normalized}" tidak ditemukan. Coba HOSTUNER15, SEKOLAH, atau WELCOME10.`)
      return
    }
    setPromoError(undefined)
    setPromoSuccess(matched)
    showToast(`Promo ${normalized} berhasil diverifikasi!`)
  }

  async function handleCheckoutNow() {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await createOrderForReviewItems()
      if (!res.success || !res.data) {
        showToast(res.message, 'error')
        return
      }
      navigate(`/checkout/invoice/${encodeURIComponent(res.data.invoiceNumber)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddToCartInstead() {
    moveReviewDraftToCart()
    navigate('/cart')
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <BreadcrumbBackBar
          backTo={reviewSource === 'cart' ? '/cart' : '/store/hosting-iix'}
          backLabel={reviewSource === 'cart' ? '← Kembali ke Shopping Cart' : '← Kembali ke Store'}
          segments={[
            { label: 'Home', to: '/' },
            ...(reviewSource === 'cart' ? [{ label: 'Shopping Cart', to: '/cart' }] : []),
            { label: 'Review & Checkout' },
          ]}
        />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
              Review &amp; Checkout
            </h1>
            <p className="mt-0.5 text-[13px] text-teal-muted">
              {reviewSource === 'draft'
                ? 'Periksa detail pesanan baru Anda. Anda dapat langsung Checkout atau menyimpannya terlebih dahulu ke Shopping Cart.'
                : 'Menampilkan item yang Anda pilih dari Shopping Cart. Item lain di keranjang tidak ikut terbayar.'}
            </p>
          </div>
          <span className="rounded-full bg-salmon-tint px-4 py-1.5 text-[12px] font-bold text-coral">
            {reviewItems.length} Item Siap Dibayar
          </span>
        </header>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          {/* Left Column: Reviewed Items + Promo & Static QRIS Info */}
          <div className="w-full min-w-0 flex-1 space-y-5">
            <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
              <h2 className="text-[17px] font-bold text-teal">Product / Options</h2>

              <div className="mt-4 space-y-3">
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-2.5 rounded-[14px] border border-salmon-border/80 bg-blush p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-[15px] font-bold text-teal">
                          {item.productName ??
                            (item.type === 'domain_transfer' ? 'Domain Transfer' : 'Domain Registration')}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium text-teal-muted">
                          {item.domainName} •{' '}
                          <span>{item.billingCycle === 'annually' ? 'Annually' : 'Monthly'}</span>
                        </p>
                      </div>
                      <span className="text-[16px] font-bold text-teal">{formatPrice(item.subtotalIdr)}</span>
                    </div>

                    {item.productId && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-2.5">
                        <span className="text-[12px] font-medium text-teal-muted">Siklus Tagihan:</span>
                        <div className="inline-flex rounded-full border border-salmon-border bg-white p-0.5">
                          {(['monthly', 'annually'] as const).map((cycle) => (
                            <button
                              key={cycle}
                              type="button"
                              onClick={() => updateCartItemCycle(item.id, cycle)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                                item.billingCycle === cycle
                                  ? 'bg-coral text-white'
                                  : 'text-teal hover:text-coral'
                              }`}
                            >
                              {cycle === 'annually' ? 'Annually (-15%)' : 'Monthly'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.type === 'hosting_domain' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white px-3.5 py-2 text-[12px]">
                        <span className="font-medium text-teal">
                          Domain{' '}
                          {item.domainAction === 'transfer'
                            ? 'Transfer'
                            : item.domainAction === 'existing'
                              ? 'Existing NS'
                              : 'Registration'}{' '}
                          — {item.domainName} (1 Year)
                        </span>
                        {item.isFreeDomainApplied ? (
                          <span className="rounded-full bg-green-soft px-3 py-0.5 text-[11px] font-bold text-green-cta uppercase">
                            FREE
                          </span>
                        ) : (
                          <span className="font-bold text-teal">{formatPrice(item.domainPriceIdr)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Promo Code & Static QRIS Payment Info Card */}
            <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
              <h2 className="text-[17px] font-bold text-teal">Apply Promo Code &amp; Metode Pembayaran</h2>

              <form onSubmit={handleValidatePromo} className="mt-4">
                <label htmlFor="review-promo-code" className="block text-[12px] font-semibold text-teal">
                  Promo Code
                </label>
                <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    id="review-promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value)
                      if (promoError) setPromoError(undefined)
                    }}
                    placeholder="Enter promo code if you have one"
                    className="flex-1 rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-[42px] shrink-0 rounded-full bg-teal px-7 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Validate
                  </button>
                </div>
                <FieldError message={promoError} />
                {promoSuccess && (
                  <p className="mt-2 rounded-[10px] bg-green-soft px-3.5 py-2 text-[12px] font-semibold text-green-cta">
                    ✓ {promoSuccess}
                  </p>
                )}
              </form>

              <div className="my-5 h-px bg-border-soft" />

              {/* Static QRIS Only (Q1 & Q2) */}
              <div>
                <p className="text-[13px] font-bold text-coral">Metode Pembayaran Resmi</p>
                <div className="mt-3 rounded-[14px] border border-salmon bg-salmon-tint/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-bold text-coral">{STATIC_QRIS_PAYMENT_METHOD.name}</p>
                    <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-bold text-teal">
                      QRIS Statis
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-charcoal">
                    Pembayaran dilakukan dengan memindai <strong>QRIS Statis</strong> resmi{' '}
                    <strong>{STATIC_QRIS_PAYMENT_METHOD.accountHolder}</strong> melalui semua aplikasi e-Wallet
                    (GoPay, OVO, DANA, ShopeePay) maupun Mobile Banking Indonesia, dengan nominal tepat termasuk{' '}
                    <strong>Kode Unik Rp 128</strong>.
                  </p>
                </div>
              </div>

              {/* Dev-only PPN preview toggle (Q5: hidden automatically in production deploy) */}
              {isDev && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border-soft bg-blush px-4 py-3 text-[12px]">
                  <div>
                    <p className="font-bold text-teal">Skema PPN (Mode Development)</p>
                    <p className="text-teal-muted">Hanya tampil saat npm run dev untuk pratinjau PPN 0% / 11%.</p>
                  </div>
                  <div className="inline-flex rounded-full border border-salmon-border bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setIncludePpn11(false)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        !includePpn11 ? 'bg-coral text-white' : 'text-teal'
                      }`}
                    >
                      PPN 0%
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludePpn11(true)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        includePpn11 ? 'bg-teal text-white' : 'text-teal'
                      }`}
                    >
                      PPN 11%
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Coral-Header Order Summary Card */}
          <aside className="w-full shrink-0 md:sticky md:top-6 md:w-[310px] lg:w-[340px]">
            <div className="overflow-hidden rounded-[20px] border border-salmon-border bg-white shadow-soft">
              <div className="bg-coral px-6 py-4">
                <h2 className="text-[17px] font-bold text-white">Order Summary</h2>
              </div>

              <div className="space-y-3 p-6 text-[13px]">
                <div className="flex items-center justify-between text-teal">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatPrice(breakdown.subtotalIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Setup Fee:</span>
                  <span className="font-semibold">{formatPrice(breakdown.setupFeeIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Domain 1 Year:</span>
                  <span
                    className={`font-semibold ${hasFreeDomain && breakdown.domainPriceIdr === 0 ? 'text-green-cta' : ''}`}
                  >
                    {hasFreeDomain && breakdown.domainPriceIdr === 0
                      ? 'FREE'
                      : formatPrice(breakdown.domainPriceIdr)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Pajak PPN ({breakdown.taxRatePercent}%):</span>
                  <span className="font-semibold">{formatPrice(breakdown.taxAmountIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Kode Unik QRIS:</span>
                  <span className="font-semibold">{formatPrice(breakdown.uniqueVerificationCodeIdr)}</span>
                </div>

                {breakdown.annualDiscountSavedIdr > 0 && (
                  <div className="rounded-[10px] bg-green-soft px-3 py-1.5 text-[11px] font-semibold text-green-cta">
                    ✓ Estimasi Hemat Siklus Tahunan (~15%): {formatPrice(breakdown.annualDiscountSavedIdr)}
                  </div>
                )}

                <div className="my-2 h-px bg-border-soft" />

                <div>
                  <p className="text-[16px] font-bold text-teal">Total Due Today:</p>
                  <p className="mt-1 text-right text-[24px] font-bold text-teal">
                    {formatPrice(breakdown.totalDueIdr)}
                  </p>
                </div>

                {/* Primary CTA: Checkout */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleCheckoutNow()
                  }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-cta px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-green-cta-hover disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span>{isSubmitting ? 'Menerbitkan Invoice QRIS...' : 'Checkout →'}</span>
                </button>

                {/* Kaishan Feedback #3: Add to Cart button directly below Checkout */}
                {reviewSource === 'draft' ? (
                  <button
                    type="button"
                    onClick={handleAddToCartInstead}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-coral bg-white px-6 py-2.5 text-[13px] font-semibold text-coral transition-colors hover:bg-salmon-tint"
                  >
                    <span>+ Add to Cart</span>
                  </button>
                ) : (
                  <Link
                    to="/cart"
                    className="inline-flex w-full items-center justify-center rounded-full border border-salmon-border bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:border-coral hover:text-coral"
                  >
                    ← Ubah Pilihan di Shopping Cart
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
