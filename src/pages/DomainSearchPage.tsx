import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { StoreSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError, LoadingSkeleton } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { STATIC_DOMAIN_TLDS } from '../services/hostunerApi'

const RESERVED_TAKEN_DOMAINS = new Set(['google.com', 'hostuner.com', 'facebook.com', 'example.com'])

let domainItemSeq = 0
function nextDomainCartId(prefix: string): string {
  domainItemSeq += 1
  return `${prefix}-${domainItemSeq}`
}

function parseDomainQuery(raw: string): { primaryDomain: string; sld: string; tld: string; tldPriceIdr: number } {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  const matchedTld = STATIC_DOMAIN_TLDS.find((t) => cleaned.endsWith(t.tld))
  if (matchedTld) {
    const sld = cleaned.slice(0, -matchedTld.tld.length).replace(/\.$/, '') || 'domainanda'
    return {
      primaryDomain: `${sld}${matchedTld.tld}`,
      sld,
      tld: matchedTld.tld,
      tldPriceIdr: matchedTld.newPriceIdr,
    }
  }

  const dotIdx = cleaned.indexOf('.')
  if (dotIdx > 0) {
    const sld = cleaned.slice(0, dotIdx)
    const customTld = cleaned.slice(dotIdx)
    return {
      primaryDomain: cleaned,
      sld,
      tld: customTld,
      tldPriceIdr: 185000,
    }
  }

  const sld = cleaned.replace(/[^a-z0-9-]/g, '') || 'domainanda'
  return {
    primaryDomain: `${sld}.com`,
    sld,
    tld: '.com',
    tldPriceIdr: STATIC_DOMAIN_TLDS[0].newPriceIdr,
  }
}

/**
 * Matches Figma Page FIX V6 Screens `14 — Register a New Domain` &
 * `14B — Domain Search Results (List View)`.
 */
export function DomainRegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, role, formatPrice, addToCart, showToast } = useHostuner()

  const activeQuery = (searchParams.get('q') ?? '').trim()
  const hasQuery = activeQuery.length > 0

  const [inputState, setInputState] = useState<{ qParam: string; text: string }>({
    qParam: activeQuery,
    text: activeQuery,
  })
  const inputText = inputState.qParam === activeQuery ? inputState.text : activeQuery

  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined)
  const [isChecking, setIsChecking] = useState(false)

  const parsed = hasQuery ? parseDomainQuery(activeQuery) : null
  const primaryTaken = parsed ? RESERVED_TAKEN_DOMAINS.has(parsed.primaryDomain) : false

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = inputText.trim().toLowerCase()
    if (!clean) {
      setErrorMsg('Masukkan nama domain yang ingin Anda cek (contoh: hostunerproject.com).')
      return
    }
    if (!/^[a-z0-9.-]+$/.test(clean)) {
      setErrorMsg('Nama domain hanya boleh menggunakan huruf kecil, angka, tanda hubung (-), dan titik.')
      return
    }
    setErrorMsg(undefined)
    setIsChecking(true)
    setSearchParams({ q: clean })
    window.setTimeout(() => setIsChecking(false), 220)
  }

  function handleAddDomainToCart(domainName: string, priceIdr: number, redirectToCart: boolean) {
    const exists = state.cart.some((c) => c.domainName.toLowerCase() === domainName.toLowerCase())
    if (exists) {
      showToast(`Domain ${domainName} sudah berada di keranjang Anda.`, 'info')
      if (redirectToCart) navigate('/cart')
      return
    }

    addToCart({
      id: nextDomainCartId(`dom-${domainName}`),
      type: 'domain_only',
      domainName,
      domainAction: 'register',
      domainPriceIdr: priceIdr,
      billingCycle: 'annually',
      unitPriceIdr: priceIdr,
      subtotalIdr: priceIdr,
    })

    if (redirectToCart && role !== 'guest') {
      navigate('/cart')
    }
  }

  return (
    <PageShell sidebar={<StoreSidebar activeActionSlug="register" />}>
      <BreadcrumbBackBar
        backTo={hasQuery ? '/domain/register' : '/'}
        backLabel="← Back"
        segments={
          hasQuery
            ? [
                { label: 'Portal Home', to: '/' },
                { label: 'Register Domain', to: '/domain/register' },
                { label: 'Search Results (List View)' },
              ]
            : [{ label: 'Portal Home', to: '/' }, { label: 'Register Domain' }]
        }
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          {hasQuery ? 'Domain Search Results (List View)' : 'Register Domain'}
        </h1>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      {/* Domain Search Box */}
      <section className="rounded-[20px] border border-salmon-border bg-hero-blush p-5 shadow-soft md:p-6">
        <p className="text-[16px] font-bold text-teal">
          {hasQuery ? `Showing availability results for: "${activeQuery}"` : 'Find your new domain name'}
        </p>
        {!hasQuery && (
          <p className="mt-1 text-[13px] text-teal-muted">
            Enter your name or keywords below to check availability.
          </p>
        )}

        <form onSubmit={handleSearchSubmit} className="mt-3.5">
          <div className="flex flex-col gap-2 rounded-[18px] bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-5">
            <input
              type="text"
              aria-label="Nama domain yang dicari"
              value={inputText}
              onChange={(e) => {
                setInputState({ qParam: activeQuery, text: e.target.value })
                if (errorMsg) setErrorMsg(undefined)
              }}
              placeholder="Find your new domain name..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[14px] text-charcoal placeholder:text-teal-muted focus:outline-none sm:px-0"
            />
            <button
              type="submit"
              className="inline-flex h-[38px] min-w-[122px] items-center justify-center rounded-full bg-teal px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {hasQuery ? 'Search Again' : 'Search'}
            </button>
          </div>
          <FieldError message={errorMsg} />
        </form>
      </section>

      {isChecking ? (
        <LoadingSkeleton variant="list" count={4} />
      ) : hasQuery && parsed ? (
        <>
          {/* Primary Domain Result Banner */}
          {primaryTaken ? (
            <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-coral/40 bg-amber-soft px-6 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[16px] font-bold text-coral">
                  Unavailable — {parsed.primaryDomain} is already registered.
                </p>
                <p className="mt-0.5 text-[12px] text-charcoal">
                  Pilih ekstensi alternatif yang masih tersedia pada daftar di bawah ini, atau transfer domain ini jika
                  milik Anda.
                </p>
              </div>
              <Link
                to={`/domain/transfer?q=${encodeURIComponent(parsed.primaryDomain)}`}
                className="shrink-0 rounded-full bg-coral px-5 py-2 text-[12px] font-semibold text-white hover:bg-coral-hover"
              >
                Transfer Domain Ini →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-green-cta bg-green-soft px-6 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[16px] font-bold text-green-cta">
                  ✓ Congratulations! {parsed.primaryDomain} is available!
                </p>
                <p className="mt-0.5 text-[12px] text-teal">
                  Registrasi 1 Tahun • Gratis DNS Management &amp; EPP Protection
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[20px] font-bold text-teal">
                  {formatPrice(parsed.tldPriceIdr)}
                  <span className="text-[13px] font-semibold">/yr</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAddDomainToCart(parsed.primaryDomain, parsed.tldPriceIdr, true)}
                  className="inline-flex items-center gap-2 rounded-full bg-green-cta px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                >
                  <FigmaIcon name="cart" size={15} />
                  <span>Add &amp; Continue →</span>
                </button>
              </div>
            </div>
          )}

          {/* Alternative Domain Extensions (List View) */}
          <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold text-teal">Alternative Domain Extensions (List View)</h2>
              {state.cart.length > 0 && (
                <Link to="/cart" className="text-[12px] font-bold text-coral hover:underline">
                  Lihat Keranjang ({state.cart.length}) →
                </Link>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {STATIC_DOMAIN_TLDS.map((item) => {
                const candidate = `${parsed.sld}${item.tld}`
                const isTaken = RESERVED_TAKEN_DOMAINS.has(candidate)
                const isInCart = state.cart.some((c) => c.domainName.toLowerCase() === candidate)

                return (
                  <div
                    key={item.tld}
                    className="flex flex-col justify-between gap-3 rounded-[14px] border border-salmon-border/80 bg-blush px-5 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-[15px] font-bold text-teal">{candidate}</p>
                      <p className="mt-0.5 text-[12px] text-teal-muted">
                        {formatPrice(item.newPriceIdr)} / Tahun &nbsp;•&nbsp; {item.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                          isTaken ? 'bg-amber-soft text-coral' : 'bg-green-soft text-green-cta'
                        }`}
                      >
                        {isTaken ? 'Taken' : 'Available'}
                      </span>

                      {isTaken ? (
                        <Link
                          to={`/domain/transfer?q=${encodeURIComponent(candidate)}`}
                          className="rounded-full border border-salmon px-4 py-1.5 text-[12px] font-semibold text-coral hover:bg-salmon-tint"
                        >
                          Transfer
                        </Link>
                      ) : isInCart ? (
                        <Link
                          to="/cart"
                          className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white"
                        >
                          ✓ In Cart →
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddDomainToCart(candidate, item.newPriceIdr, false)}
                          className="rounded-full bg-coral px-5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-coral-hover"
                        >
                          + Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      ) : (
        /* Initial Browse Extensions Card (Screen 14) */
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">Browse extensions by category</h2>
          <div className="mt-4 space-y-3">
            {STATIC_DOMAIN_TLDS.map((ext) => (
              <div
                key={ext.tld}
                className="flex flex-col justify-between gap-2 rounded-[14px] bg-blush px-5 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-teal">
                  <span className="min-w-[68px] text-[15px] font-bold text-teal">{ext.tld}</span>
                  <span className="text-teal-muted">|</span>
                  <span>
                    New Price: <strong>{formatPrice(ext.newPriceIdr)}</strong>
                  </span>
                  <span className="text-teal-muted">•</span>
                  <span>
                    Transfer: <strong>{formatPrice(ext.transferPriceIdr)}</strong>
                  </span>
                  <span className="text-teal-muted">•</span>
                  <span>
                    Renewal: <strong>{formatPrice(ext.renewalPriceIdr)}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const demoDomain = `domainanda${ext.tld}`
                    setInputState({ qParam: demoDomain, text: demoDomain })
                    setErrorMsg(undefined)
                    setSearchParams({ q: demoDomain })
                  }}
                  className="self-start rounded-full border border-salmon-border bg-white px-4 py-1 text-[12px] font-semibold text-coral transition-colors hover:bg-salmon-tint sm:self-auto"
                >
                  Cek {ext.tld} →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screen `15 — Store Action 2: Transfer Domain to Us`.
 */
export function DomainTransferPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, formatPrice, addToCart, showToast } = useHostuner()

  const prefilled = (searchParams.get('q') ?? '').trim()
  const [domainName, setDomainName] = useState(prefilled)
  const [eppCode, setEppCode] = useState('')
  const [errors, setErrors] = useState<{ domain?: string; epp?: string }>({})
  const [addedDomain, setAddedDomain] = useState<string | null>(null)

  const detectedTld =
    STATIC_DOMAIN_TLDS.find((t) => domainName.trim().toLowerCase().endsWith(t.tld)) ?? STATIC_DOMAIN_TLDS[0]

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanDomain = domainName.trim().toLowerCase()
    const cleanEpp = eppCode.trim()

    const nextErrors: { domain?: string; epp?: string } = {}
    if (!cleanDomain || !cleanDomain.includes('.')) {
      nextErrors.domain = 'Masukkan nama domain valid dengan ekstensi, contoh: domainanda.com.'
    }
    if (!cleanEpp || cleanEpp.length < 4) {
      nextErrors.epp = 'Authorization / EPP Code wajib diisi minimal 4 karakter.'
    }

    if (nextErrors.domain || nextErrors.epp) {
      setErrors(nextErrors)
      return
    }

    setErrors({})

    const exists = state.cart.some((c) => c.domainName.toLowerCase() === cleanDomain)
    if (exists) {
      showToast(`Transfer domain ${cleanDomain} sudah berada di keranjang Anda.`, 'info')
      navigate('/cart')
      return
    }

    addToCart({
      id: nextDomainCartId(`trf-${cleanDomain}`),
      type: 'domain_transfer',
      domainName: cleanDomain,
      domainAction: 'transfer',
      domainPriceIdr: detectedTld.transferPriceIdr,
      billingCycle: 'annually',
      unitPriceIdr: detectedTld.transferPriceIdr,
      subtotalIdr: detectedTld.transferPriceIdr,
    })

    setAddedDomain(cleanDomain)
  }

  return (
    <PageShell sidebar={<StoreSidebar activeActionSlug="transfer" />}>
      <BreadcrumbBackBar
        backTo="/"
        backLabel="← Back"
        segments={[
          { label: 'Home', to: '/' },
          { label: 'Store', to: '/store/hosting-iix' },
          { label: 'Transfer Domain' },
        ]}
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          Transfer Domain
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">Transfer now to extend your domain by 1 year!*</p>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold text-teal">Single domain transfer</h2>
          <span className="rounded-full bg-mint-strip px-3 py-1 text-[11px] font-semibold text-teal">
            Estimasi Biaya ({detectedTld.tld}): {formatPrice(detectedTld.transferPriceIdr)}/yr
          </span>
        </div>

        <form onSubmit={handleTransferSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="transfer-domain-name" className="block text-[13px] font-semibold text-teal">
              Domain Name
            </label>
            <input
              id="transfer-domain-name"
              type="text"
              value={domainName}
              onChange={(e) => {
                setDomainName(e.target.value)
                if (errors.domain) setErrors((prev) => ({ ...prev, domain: undefined }))
              }}
              placeholder="example.com"
              className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[14px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
            />
            <FieldError message={errors.domain} />
          </div>

          <div>
            <label htmlFor="transfer-epp-code" className="block text-[13px] font-semibold text-teal">
              Authorization Code
            </label>
            <input
              id="transfer-epp-code"
              type="text"
              value={eppCode}
              onChange={(e) => {
                setEppCode(e.target.value)
                if (errors.epp) setErrors((prev) => ({ ...prev, epp: undefined }))
              }}
              placeholder="Epp Code / Auth Code"
              className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[14px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
            />
            <FieldError message={errors.epp} />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-full bg-coral px-7 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              Add to Cart
            </button>
            {addedDomain && (
              <Link
                to="/cart"
                className="rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
              >
                Lanjut ke Cart ({addedDomain}) →
              </Link>
            )}
          </div>
        </form>

        <p className="mt-5 text-[12px] text-teal-muted">* Excludes certain TLDs and recently renewed domains</p>
      </section>
    </PageShell>
  )
}
