import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { StoreSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { STATIC_DOMAIN_TLDS } from '../services/hostunerApi'
import type { BillingCycle } from '../types/hostuner'

type DomainOption = 'register' | 'transfer' | 'existing'

let orderItemSeq = 0
function nextOrderCartId(prefix: string): string {
  orderItemSeq += 1
  return `${prefix}-${orderItemSeq}`
}

function resolveDomainPriceIdr(domainName: string): number {
  const clean = domainName.trim().toLowerCase()
  const matched = STATIC_DOMAIN_TLDS.find((t) => clean.endsWith(t.tld))
  return matched ? matched.newPriceIdr : STATIC_DOMAIN_TLDS[0].newPriceIdr
}

/**
 * Matches Figma Page FIX V6 Screen `17 — Order Flow Step 1: Choose a Domain`.
 */
export function OrderChooseDomainPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, formatPrice } = useHostuner()

  const productSlug = searchParams.get('product') ?? 'hosting-pro'
  const requestedCycle = searchParams.get('cycle') === 'monthly' ? 'monthly' : 'annually'
  const selectedProduct =
    state.products.find((p) => p.slug === productSlug) ??
    state.products.find((p) => p.slug === 'hosting-pro') ??
    state.products[0]

  const [domainOption, setDomainOption] = useState<DomainOption>('register')
  const [registerDomain, setRegisterDomain] = useState(
    selectedProduct.categorySlug === 'paket-hosting-sekolah' ? 'www.namasekolahanda.sch.id' : 'bisnisanda.com'
  )
  const [transferDomain, setTransferDomain] = useState('')
  const [transferEpp, setTransferEpp] = useState('')
  const [existingDomain, setExistingDomain] = useState('')
  const [checkedDomain, setCheckedDomain] = useState<string | null>(
    selectedProduct.categorySlug === 'paket-hosting-sekolah' ? 'www.namasekolahanda.sch.id' : null
  )
  const [formError, setFormError] = useState<string | undefined>(undefined)

  function getActiveDomainInput(): string {
    if (domainOption === 'register') return registerDomain.trim().toLowerCase()
    if (domainOption === 'transfer') return transferDomain.trim().toLowerCase()
    return existingDomain.trim().toLowerCase()
  }

  function handleCheckDomain() {
    const val = getActiveDomainInput()
    if (!val || !val.includes('.')) {
      setFormError('Masukkan nama domain lengkap beserta ekstensinya, contoh: namadomain.com.')
      setCheckedDomain(null)
      return
    }
    setFormError(undefined)
    setCheckedDomain(val)
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    const cleanDomain = getActiveDomainInput()
    if (!cleanDomain || !cleanDomain.includes('.')) {
      setFormError('Masukkan nama domain valid dengan ekstensi (contoh: domainanda.com) sebelum melanjutkan.')
      return
    }
    if (domainOption === 'transfer' && transferEpp.trim().length < 4) {
      setFormError('Kode EPP / Authorization Code wajib diisi minimal 4 karakter untuk transfer domain.')
      return
    }
    setFormError(undefined)
    navigate(
      `/order/configure?product=${encodeURIComponent(selectedProduct.slug)}&cycle=${requestedCycle}&domain=${encodeURIComponent(cleanDomain)}&action=${domainOption}`
    )
  }

  const previewRegisterPrice = resolveDomainPriceIdr(registerDomain)

  return (
    <PageShell sidebar={<StoreSidebar activeCategorySlug={selectedProduct.categorySlug} />}>
      <BreadcrumbBackBar
        backTo={`/store/${selectedProduct.categorySlug}`}
        backLabel="← Back to Store"
        segments={[
          { label: 'Home', to: '/' },
          { label: 'Store', to: `/store/${selectedProduct.categorySlug}` },
          { label: 'Choose Domain (Step 1)' },
        ]}
      />

      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            Choose a Domain
          </h1>
          <span className="rounded-full bg-salmon-tint px-3.5 py-1 text-[12px] font-bold text-coral">
            Paket: {selectedProduct.name}
          </span>
        </div>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      <form onSubmit={handleContinue} className="space-y-4">
        {/* Option 1: Register a new domain */}
        <div
          className={`rounded-[16px] border p-5 transition-colors shadow-soft ${
            domainOption === 'register'
              ? 'border-coral bg-white'
              : 'border-border-soft bg-white/90 hover:border-salmon-border'
          }`}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="domainOption"
              checked={domainOption === 'register'}
              onChange={() => {
                setDomainOption('register')
                setFormError(undefined)
              }}
              className="h-4 w-4 accent-coral"
            />
            <span className="text-[15px] font-bold text-teal">Register a new domain</span>
          </label>

          {domainOption === 'register' && (
            <div className="mt-4 space-y-3 pl-0 sm:pl-7">
              <div className="flex flex-col gap-2 rounded-[18px] bg-input-bg p-1.5 sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
                <input
                  type="text"
                  aria-label="Domain baru yang ingin didaftarkan"
                  value={registerDomain}
                  onChange={(e) => {
                    setRegisterDomain(e.target.value)
                    setCheckedDomain(null)
                    if (formError) setFormError(undefined)
                  }}
                  placeholder="www.domainanda.com"
                  className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[14px] text-teal placeholder:text-teal-muted focus:outline-none sm:px-0"
                />
                <button
                  type="button"
                  onClick={handleCheckDomain}
                  className="h-[36px] shrink-0 rounded-full bg-teal px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Check
                </button>
              </div>

              {(checkedDomain || selectedProduct.isFreeDomain) && (
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-green-soft px-3.5 py-1.5 text-[12px] font-semibold text-green-cta">
                  <span>
                    ✓ {checkedDomain ? `${checkedDomain} Available!` : 'Available!'}
                    {selectedProduct.isFreeDomain
                      ? ` Free with ${selectedProduct.name}`
                      : ` (${formatPrice(previewRegisterPrice)}/yr)`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Option 2: Transfer from another registrar */}
        <div
          className={`rounded-[16px] border p-5 transition-colors shadow-soft ${
            domainOption === 'transfer'
              ? 'border-coral bg-white'
              : 'border-border-soft bg-white/90 hover:border-salmon-border'
          }`}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="domainOption"
              checked={domainOption === 'transfer'}
              onChange={() => {
                setDomainOption('transfer')
                setFormError(undefined)
              }}
              className="h-4 w-4 accent-coral"
            />
            <span className="text-[15px] font-semibold text-teal">
              Transfer your domain from another registrar
            </span>
          </label>

          {domainOption === 'transfer' && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:pl-7">
              <input
                type="text"
                aria-label="Domain yang ingin ditransfer"
                value={transferDomain}
                onChange={(e) => {
                  setTransferDomain(e.target.value)
                  if (formError) setFormError(undefined)
                }}
                placeholder="domainanda.com"
                className="rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal focus:border-salmon focus:bg-white focus:outline-none"
              />
              <input
                type="text"
                aria-label="Authorization Code / EPP Code"
                value={transferEpp}
                onChange={(e) => {
                  setTransferEpp(e.target.value)
                  if (formError) setFormError(undefined)
                }}
                placeholder="EPP / Auth Code"
                className="rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal focus:border-salmon focus:bg-white focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Option 3: Existing domain */}
        <div
          className={`rounded-[16px] border p-5 transition-colors shadow-soft ${
            domainOption === 'existing'
              ? 'border-coral bg-white'
              : 'border-border-soft bg-white/90 hover:border-salmon-border'
          }`}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="domainOption"
              checked={domainOption === 'existing'}
              onChange={() => {
                setDomainOption('existing')
                setFormError(undefined)
              }}
              className="h-4 w-4 accent-coral"
            />
            <span className="text-[15px] font-semibold text-teal">
              I will use my existing domain and update my nameservers
            </span>
          </label>

          {domainOption === 'existing' && (
            <div className="mt-4 sm:pl-7">
              <input
                type="text"
                aria-label="Domain yang sudah dimiliki"
                value={existingDomain}
                onChange={(e) => {
                  setExistingDomain(e.target.value)
                  if (formError) setFormError(undefined)
                }}
                placeholder="domainsudahaada.com"
                className="w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal focus:border-salmon focus:bg-white focus:outline-none"
              />
            </div>
          )}
        </div>

        <FieldError message={formError} />

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-green-cta px-8 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
          >
            Continue →
          </button>
          <Link
            to={`/store/${selectedProduct.categorySlug}`}
            className="rounded-full border border-border-soft bg-white px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
          >
            Pilih Paket Lain
          </Link>
        </div>
      </form>
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screen `18 — Order Flow Step 2: Configure Product & Billing Cycle`.
 */
export function OrderConfigurePage() {
  const [searchParams] = useSearchParams()
  const { state, formatPrice, addToCart } = useHostuner()

  const productSlug = searchParams.get('product') ?? 'hosting-pro'
  const domainName = searchParams.get('domain') ?? 'bisnisanda.com'
  const domainAction = (searchParams.get('action') ?? 'register') as DomainOption
  const initialCycle: BillingCycle = searchParams.get('cycle') === 'monthly' ? 'monthly' : 'annually'

  const product =
    state.products.find((p) => p.slug === productSlug) ??
    state.products.find((p) => p.slug === 'hosting-pro') ??
    state.products[0]

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle)
  const [serverLocation, setServerLocation] = useState<'IIX Jakarta (Indonesia)' | 'Singapore SG-1'>(
    'IIX Jakarta (Indonesia)'
  )

  const unitPriceIdr = billingCycle === 'annually' ? product.priceAnnual : product.priceMonthly
  const freeDomainEligible = product.isFreeDomain && billingCycle === 'annually' && domainAction === 'register'
  const rawDomainFee = domainAction === 'existing' ? 0 : resolveDomainPriceIdr(domainName)
  const domainPriceIdr = freeDomainEligible ? 0 : rawDomainFee

  function handleProceedToCheckout(e: React.FormEvent) {
    e.preventDefault()

    addToCart({
      id: nextOrderCartId(`pkg-${product.slug}-${domainName}`),
      type: 'hosting_domain',
      productId: product.id,
      productName: `${product.name} (${serverLocation})`,
      domainName,
      domainAction,
      domainPriceIdr,
      billingCycle,
      unitPriceIdr,
      subtotalIdr: unitPriceIdr,
      isFreeDomainApplied: freeDomainEligible,
    })
  }

  return (
    <PageShell sidebar={<StoreSidebar activeCategorySlug={product.categorySlug} />}>
      <BreadcrumbBackBar
        backTo={`/order/domain?product=${encodeURIComponent(product.slug)}&cycle=${billingCycle}`}
        backLabel="← Back"
        segments={[
          { label: 'Home', to: '/' },
          { label: 'Choose Domain', to: `/order/domain?product=${encodeURIComponent(product.slug)}` },
          { label: 'Configure (Step 2)' },
        ]}
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          Configure
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">
          Configure your desired options and continue to checkout.
        </p>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      <form
        onSubmit={handleProceedToCheckout}
        className="space-y-5 rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
      >
        <div>
          <h2 className="text-[18px] font-bold text-teal">
            {product.name} — {product.diskSpace}, {product.bandwidth}
            {product.isFreeDomain ? ', Free Domain' : ''}
          </h2>
          <p className="mt-1 text-[12px] text-teal-muted">
            Domain terpilih: <strong className="text-coral">{domainName}</strong> ({domainAction})
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="configure-billing-cycle" className="block text-[13px] font-bold text-teal">
              Choose Billing Cycle
            </label>
            <select
              id="configure-billing-cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="mt-2 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] font-medium text-teal focus:border-salmon focus:bg-white focus:outline-none"
            >
              <option value="annually">
                {formatPrice(product.priceAnnual)} Annually (Hemat 15%
                {product.isFreeDomain ? ' • Free Domain Included' : ''})
              </option>
              <option value="monthly">{formatPrice(product.priceMonthly)} Monthly</option>
            </select>
          </div>

          <div>
            <label htmlFor="configure-server-location" className="block text-[13px] font-bold text-teal">
              Datacenter Location
            </label>
            <select
              id="configure-server-location"
              value={serverLocation}
              onChange={(e) =>
                setServerLocation(e.target.value as 'IIX Jakarta (Indonesia)' | 'Singapore SG-1')
              }
              className="mt-2 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] font-medium text-teal focus:border-salmon focus:bg-white focus:outline-none"
            >
              <option value="IIX Jakarta (Indonesia)">IIX Jakarta (Indonesia — Low Latency)</option>
              <option value="Singapore SG-1">Singapore SG-1 (Asia Global Node)</option>
            </select>
          </div>
        </div>

        {/* Transparent Order Line Breakdown Preview */}
        <div className="rounded-[14px] border border-border-soft bg-blush p-4 text-[13px]">
          <div className="flex items-center justify-between py-1">
            <span className="text-teal-muted">
              Paket {product.name} ({billingCycle === 'annually' ? 'Tahunan -15%' : 'Bulanan'})
            </span>
            <strong className="text-teal">{formatPrice(unitPriceIdr)}</strong>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-teal-muted">
              Domain ({domainName} — {domainAction})
            </span>
            {freeDomainEligible ? (
              <span className="rounded-full bg-green-soft px-2.5 py-0.5 text-[11px] font-bold text-green-cta">
                Gratis Tahun ke-1 ({formatPrice(0)})
              </span>
            ) : (
              <strong className="text-teal">{formatPrice(domainPriceIdr)}</strong>
            )}
          </div>
          <div className="my-2 h-px bg-border-soft" />
          {product.isFreeDomain && billingCycle === 'monthly' && domainAction === 'register' && (
            <p className="mb-2 rounded-[10px] bg-mint-strip px-3 py-1.5 text-[12px] font-medium text-teal">
              Tip: Pilih siklus <strong>Annually</strong> untuk mendapatkan Gratis Domain Tahun ke-1 pada paket ini.
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal">Estimasi Subtotal (sebelum PPN 11% &amp; Kode Unik Rp 128)</span>
            <span className="text-[16px] font-bold text-coral">
              {formatPrice(unitPriceIdr + domainPriceIdr)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-green-cta px-7 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
        >
          Continue to Review &amp; Checkout →
        </button>
      </form>
    </PageShell>
  )
}
