import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { StoreSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, ConfirmModal } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { useRevisionCart } from '../context/useRevisionCart'
import { calculateBillingBreakdown } from '../services/hostunerApi'
import type { CartItem } from '../types/hostuner'

/**
 * Revision 3.1 Shopping Cart Page (`/cart`):
 * - Guests see a Login Gate (Q3 & Q4: View Cart hidden in Header/Mega-Menu, Sidebar/Footer links lead to login prompt).
 * - Logged-in Clients see an isolated per-user Shopping Cart list with checkboxes so they can choose
 *   which items to proceed to `/checkout` (Review & Checkout) without forcing all items to be paid together.
 */
export function ShoppingCartPage() {
  const navigate = useNavigate()
  const { state, role, currentUser, includePpn11, formatPrice, updateCartItemCycle, removeFromCart } = useHostuner()
  const { startReviewFromCartSelection } = useRevisionCart()

  // Track user-unchecked IDs so newly added items default to selected cleanly without setState-in-effect
  const [uncheckedIds, setUncheckedIds] = useState<string[]>([])
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null)

  /* Guest Login Gate (Q3 & Q4) */
  if (role === 'guest') {
    return (
      <PageShell sidebar={<StoreSidebar activeActionSlug="cart" />}>
        <BreadcrumbBackBar
          backTo="/"
          backLabel="← Back"
          segments={[
            { label: 'Home', to: '/' },
            { label: 'Store', to: '/store/hosting-iix' },
            { label: 'Shopping Cart' },
          ]}
        />

        <header>
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            Shopping Cart
          </h1>
          <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
        </header>

        <section className="rounded-[20px] border border-salmon-border bg-white px-6 py-10 text-center shadow-soft">
          <span className="inline-flex rounded-full bg-salmon-tint px-4 py-1 text-[11px] font-bold tracking-wide text-coral uppercase">
            Login Diperlukan
          </span>
          <h2 className="mt-4 text-[22px] font-bold text-teal">Masuk untuk Membuka Shopping Cart</h2>
          <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-relaxed text-teal-muted">
            Silakan login terlebih dahulu sebelum menambahkan paket ke keranjang, memilih layanan, atau melanjutkan ke
            pembayaran QRIS.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?redirect=/cart"
              className="rounded-full bg-teal px-7 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Login Sekarang →
            </Link>
            <Link
              to="/register?redirect=/cart"
              className="rounded-full border border-coral bg-white px-6 py-2.5 text-[13px] font-semibold text-coral transition-colors hover:bg-salmon-tint"
            >
              Daftar Akun Baru
            </Link>
          </div>
        </section>
      </PageShell>
    )
  }

  /* Empty Shopping Cart (Figma Screen 16) */
  const visibleInvoices =
    role === 'admin'
      ? state.invoices
      : state.invoices.filter(
          (inv) => currentUser && inv.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
        )

  if (state.cart.length === 0) {
    return (
      <PageShell sidebar={<StoreSidebar activeActionSlug="cart" />}>
        <BreadcrumbBackBar
          backTo="/store/hosting-iix"
          backLabel="← Back"
          segments={[
            { label: 'Home', to: '/' },
            { label: 'Store', to: '/store/hosting-iix' },
            { label: 'Shopping Cart' },
          ]}
        />

        <header>
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            Shopping Cart
          </h1>
          <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
        </header>

        <section className="rounded-[20px] border border-salmon-border bg-white px-6 py-10 text-center shadow-soft">
          <div className="mx-auto flex items-center justify-center gap-2.5 text-teal">
            <FigmaIcon name="cart-teal" size={24} />
            <h2 className="text-[22px] font-bold text-teal">Your Shopping Cart is Empty</h2>
          </div>
          <p className="mx-auto mt-2.5 max-w-[440px] text-[13px] leading-relaxed text-teal-muted">
            Belum ada produk atau domain di dalam keranjang belanja Anda. Silakan pilih layanan Hosting atau Domain
            terlebih dahulu.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/store/hosting-iix"
              className="inline-flex items-center justify-center rounded-full bg-coral px-7 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              Start Shopping →
            </Link>
            <Link
              to="/domain/register"
              className="inline-flex items-center justify-center rounded-full bg-mint px-6 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:bg-mint-strip"
            >
              Cek Domain Baru
            </Link>
          </div>
        </section>

        {/* Per-User Recent Invoices Shortcut */}
        {visibleInvoices.length > 0 && (
          <section className="rounded-[20px] border border-border-soft bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-teal">Tagihan / Invoice Terakhir Anda</h2>
              <span className="text-[11px] font-medium text-teal-muted">
                {visibleInvoices.length} invoice tersimpan
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {visibleInvoices.slice(0, 3).map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-salmon-border/70 bg-blush px-4 py-3 text-[13px]"
                >
                  <div>
                    <p className="font-bold text-teal">
                      #{inv.invoiceNumber}{' '}
                      <span
                        className={`ml-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-green-soft text-green-cta'
                            : 'bg-salmon-tint text-coral'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-teal-muted">
                      {inv.customerName} • {formatPrice(inv.breakdown.totalDueIdr)}
                    </p>
                  </div>
                  <Link
                    to={`/checkout/invoice/${encodeURIComponent(inv.invoiceNumber)}`}
                    className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Lihat Invoice →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </PageShell>
    )
  }

  /* Filled Shopping Cart List with Selective Checkboxes */
  const selectedItems = state.cart.filter((item) => !uncheckedIds.includes(item.id))
  const selectedIds = selectedItems.map((item) => item.id)
  const allSelected = selectedItems.length === state.cart.length
  const breakdown = calculateBillingBreakdown(selectedItems, includePpn11, 128)
  const hasFreeDomain = selectedItems.some((item) => item.isFreeDomainApplied)

  function toggleItem(itemId: string) {
    setUncheckedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  function toggleSelectAll() {
    if (allSelected) {
      setUncheckedIds(state.cart.map((item) => item.id))
    } else {
      setUncheckedIds([])
    }
  }

  function handleProceedSelected() {
    if (selectedIds.length === 0) return
    startReviewFromCartSelection(selectedIds)
    navigate('/checkout')
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <BreadcrumbBackBar
          backTo="/store/hosting-iix"
          backLabel="← Continue Shopping"
          segments={[
            { label: 'Home', to: '/' },
            { label: 'Store', to: '/store/hosting-iix' },
            { label: 'Shopping Cart' },
          ]}
        />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
              Shopping Cart
            </h1>
            <p className="mt-0.5 text-[13px] text-teal-muted">
              Centang paket atau domain yang ingin Anda lanjutkan ke halaman Review &amp; Checkout. Item lain akan tetap
              tersimpan di keranjang.
            </p>
          </div>
          <span className="rounded-full bg-salmon-tint px-4 py-1.5 text-[12px] font-bold text-coral">
            {selectedItems.length} / {state.cart.length} Dipilih
          </span>
        </header>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          {/* Left Column: Selectable Shopping Cart Item List */}
          <div className="w-full min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-salmon-border bg-white px-5 py-3.5 shadow-soft">
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-bold text-teal">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded accent-coral"
                />
                <span>
                  Pilih Semua ({selectedItems.length}/{state.cart.length})
                </span>
              </label>

              <Link to="/store/hosting-iix" className="text-[12px] font-semibold text-coral hover:underline">
                + Tambah Layanan Lain
              </Link>
            </div>

            <div className="space-y-3">
              {state.cart.map((item) => {
                const isChecked = !uncheckedIds.includes(item.id)
                return (
                  <article
                    key={item.id}
                    className={`space-y-3 rounded-[18px] border bg-white p-5 shadow-soft transition-colors ${
                      isChecked ? 'border-salmon' : 'border-border-soft opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${item.productName ?? item.domainName}`}
                        checked={isChecked}
                        onChange={() => toggleItem(item.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded accent-coral"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-[15px] font-bold text-teal">
                              {item.productName ??
                                (item.type === 'domain_transfer' ? 'Domain Transfer' : 'Domain Registration')}
                            </p>
                            <p className="mt-0.5 text-[13px] text-teal-muted">
                              {item.domainName} •{' '}
                              <span>{item.billingCycle === 'annually' ? 'Annually' : 'Monthly'}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                            <span className="text-[16px] font-bold text-teal">
                              {formatPrice(item.subtotalIdr)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setItemToRemove(item)}
                              className="text-[12px] font-semibold text-coral hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>

                        {/* Inline Cycle Switcher for Hosting/VPS items */}
                        {item.productId && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-2.5">
                            <span className="text-[12px] font-medium text-teal-muted">Siklus Tagihan:</span>
                            <div className="inline-flex rounded-full border border-salmon-border bg-blush p-0.5">
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
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-blush px-3.5 py-2 text-[12px]">
                            <span className="font-medium text-teal">
                              Domain{' '}
                              {item.domainAction === 'transfer'
                                ? 'Transfer'
                                : item.domainAction === 'existing'
                                  ? 'Existing NS'
                                  : 'Registration'}{' '}
                              — {item.domainName}
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
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Items Summary Card */}
          <aside className="w-full shrink-0 md:sticky md:top-6 md:w-[310px] lg:w-[340px]">
            <div className="overflow-hidden rounded-[20px] border border-salmon-border bg-white shadow-soft">
              <div className="bg-coral px-6 py-4">
                <h2 className="text-[17px] font-bold text-white">Ringkasan Item Terpilih</h2>
              </div>

              <div className="space-y-3 p-6 text-[13px]">
                <div className="flex items-center justify-between text-teal">
                  <span>Item Dipilih:</span>
                  <span className="font-bold">{selectedItems.length} layanan</span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Subtotal Layanan:</span>
                  <span className="font-semibold">{formatPrice(breakdown.subtotalIdr)}</span>
                </div>
                <div className="flex items-center justify-between text-teal">
                  <span>Domain 1 Tahun:</span>
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

                <div className="my-2 h-px bg-border-soft" />

                <div>
                  <p className="text-[15px] font-bold text-teal">Estimasi Total:</p>
                  <p className="mt-1 text-right text-[23px] font-bold text-teal">
                    {formatPrice(breakdown.totalDueIdr)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={handleProceedSelected}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-cta px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-green-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>Checkout Terpilih ({selectedItems.length}) →</span>
                </button>

                {selectedItems.length === 0 && (
                  <p className="text-center text-[11px] font-medium text-coral">
                    Centang minimal 1 item untuk melanjutkan ke Review &amp; Checkout.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(itemToRemove)}
        title="Hapus Item dari Shopping Cart?"
        description={
          itemToRemove
            ? `Anda yakin ingin menghapus "${itemToRemove.productName ?? itemToRemove.domainName}" dari keranjang belanja?`
            : ''
        }
        confirmLabel="Ya, Hapus Item"
        cancelLabel="Batal"
        tone="coral"
        onConfirm={() => {
          if (itemToRemove) {
            removeFromCart(itemToRemove.id)
          }
          setItemToRemove(null)
        }}
        onCancel={() => setItemToRemove(null)}
      />
    </PageShell>
  )
}
