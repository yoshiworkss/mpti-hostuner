import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { StoreSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError, LoadingSkeleton } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { STATIC_DOMAIN_TLDS } from '../services/hostunerApi'

type SearchTab = 'all' | 'products' | 'kb' | 'announcements'

/**
 * Global Search Results page (`/search`) searching Store Products, Categories,
 * Domain TLD prices, Knowledgebase articles, and Announcements.
 */
export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { state, formatPrice } = useHostuner()

  const initialQ = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQ)
  const [inputError, setInputError] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [isSearching, setIsSearching] = useState(false)

  const query = (searchParams.get('q') ?? '').trim().toLowerCase()

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = inputValue.trim()
    if (!clean) {
      setInputError('Masukkan kata kunci pencarian terlebih dahulu (contoh: Hosting, VPS, cPanel, atau domain).')
      return
    }
    setInputError(undefined)
    setIsSearching(true)
    setSearchParams({ q: clean })
    window.setTimeout(() => setIsSearching(false), 180)
  }

  function applyQuickKeyword(term: string) {
    setInputValue(term)
    setInputError(undefined)
    setSearchParams({ q: term })
  }

  const matchedProducts = query
    ? state.products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.categorySlug.toLowerCase().includes(query) ||
          p.specs.some((s) => s.toLowerCase().includes(query))
      )
    : state.products.filter((p) => p.isFeatured)

  const matchedCategories = query
    ? state.categories.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      )
    : []

  const matchedKb = query
    ? state.kbArticles.filter(
        (k) =>
          k.title.toLowerCase().includes(query) ||
          k.snippet.toLowerCase().includes(query) ||
          k.categoryLabel.toLowerCase().includes(query)
      )
    : state.kbArticles.slice(0, 3)

  const matchedAnnouncements = query
    ? state.announcements.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.body.toLowerCase().includes(query)
      )
    : state.announcements.slice(0, 2)

  const matchedTlds = query
    ? STATIC_DOMAIN_TLDS.filter(
        (t) => t.tld.toLowerCase().includes(query) || query.includes(t.tld.replace('.', ''))
      )
    : []

  const totalCount =
    matchedProducts.length + matchedCategories.length + matchedKb.length + matchedAnnouncements.length

  const suggestedDomainSlug = query
    ? `${query.replace(/[^a-z0-9-]/g, '').replace(/\..*$/, '') || 'bisnisanda'}.com`
    : 'bisnisanda.com'

  return (
    <PageShell sidebar={<StoreSidebar />}>
      <BreadcrumbBackBar
        backTo="/"
        backLabel="← Back"
        segments={[{ label: 'Home', to: '/' }, { label: 'Search Results' }]}
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          Global Search Results
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">
          Temukan paket Hosting IIX, Proxmox VPS, domain, artikel Knowledgebase, atau pengumuman resmi Hostuner.
        </p>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      {/* Search Form Card */}
      <section className="rounded-[20px] border border-salmon-border bg-hero-blush p-5 shadow-soft md:p-6">
        <form onSubmit={handleSearchSubmit}>
          <div className="flex flex-col gap-2 rounded-[18px] bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-5">
            <input
              type="search"
              aria-label="Kata kunci pencarian global"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (inputError) setInputError(undefined)
              }}
              placeholder="Contoh: Hosting Pro, VPS, cPanel, atau Sekolah..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[14px] text-charcoal placeholder:text-teal-muted focus:outline-none sm:px-0"
            />
            <button
              type="submit"
              className="inline-flex h-[38px] items-center justify-center gap-2 rounded-full bg-teal px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <FigmaIcon name="search" size={14} />
              <span>Search</span>
            </button>
          </div>
          <FieldError message={inputError} />
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="font-semibold text-teal">Pencarian Populer:</span>
          {['Hosting Pro', 'Proxmox', 'Sekolah', 'cPanel', 'Maintenance'].map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => applyQuickKeyword(kw)}
              className="rounded-full bg-white px-3 py-1 font-medium text-teal transition-colors hover:bg-salmon-tint hover:text-coral"
            >
              {kw}
            </button>
          ))}
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter kategori hasil pencarian">
          {(
            [
              { key: 'all', label: `Semua (${totalCount})` },
              { key: 'products', label: `Produk & Kategori (${matchedProducts.length + matchedCategories.length})` },
              { key: 'kb', label: `Knowledgebase (${matchedKb.length})` },
              { key: 'announcements', label: `Announcements (${matchedAnnouncements.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-coral text-white'
                  : 'border border-border-soft bg-white text-teal hover:border-salmon'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {query && (
          <Link
            to={`/domain/register?q=${encodeURIComponent(suggestedDomainSlug)}`}
            className="text-[12px] font-semibold text-coral hover:underline"
          >
            Cek domain &quot;{suggestedDomainSlug}&quot; →
          </Link>
        )}
      </div>

      {isSearching ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : totalCount === 0 && query ? (
        <div className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
          <h2 className="text-[18px] font-bold text-teal">
            Hasil untuk &quot;{searchParams.get('q')}&quot; tidak ditemukan
          </h2>
          <p className="mt-2 text-[13px] text-teal-muted">
            Coba kata kunci lain atau cek ketersediaan domain secara langsung.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to={`/domain/register?q=${encodeURIComponent(suggestedDomainSlug)}`}
              className="rounded-full bg-coral px-5 py-2 text-[13px] font-semibold text-white hover:bg-coral-hover"
            >
              Cek Domain {suggestedDomainSlug} →
            </Link>
            <Link
              to="/store/hosting-iix"
              className="rounded-full border border-border-soft bg-blush px-5 py-2 text-[13px] font-semibold text-teal"
            >
              Jelajahi Hosting IIX
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Products & Store Categories */}
          {(activeTab === 'all' || activeTab === 'products') &&
            (matchedProducts.length > 0 || matchedCategories.length > 0) && (
              <section className="rounded-[16px] border border-salmon-border bg-white p-5 shadow-soft">
                <h2 className="text-[16px] font-bold text-teal">
                  {query ? 'Paket Hosting, VPS & Kategori Store' : 'Paket Unggulan Hostuner'}
                </h2>
                <div className="mt-3 space-y-3">
                  {matchedCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border-soft bg-mint-strip/50 px-4 py-3"
                    >
                      <div>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-teal uppercase">
                          Kategori Store
                        </span>
                        <p className="mt-1 text-[14px] font-bold text-teal">{cat.name}</p>
                        <p className="text-[12px] text-teal-muted">{cat.description}</p>
                      </div>
                      <Link
                        to={`/store/${cat.slug}`}
                        className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white"
                      >
                        Buka Kategori →
                      </Link>
                    </div>
                  ))}

                  {matchedProducts.map((product) => {
                    const priceIdr =
                      product.displayCycle === 'annually' ? product.priceAnnual : product.priceMonthly
                    const suffix = product.displayCycle === 'annually' ? '/Annually' : '/Monthly'
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col justify-between gap-3 rounded-[12px] border border-salmon-border/70 bg-blush px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[14px] font-bold text-teal">{product.name}</p>
                            {product.isFreeDomain && (
                              <span className="rounded-full bg-salmon-tint px-2.5 py-0.5 text-[10px] font-bold text-coral">
                                Gratis Domain
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-teal-muted">
                            {product.specs.slice(0, 3).join(' • ')}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-[14px] font-bold text-teal">
                            {formatPrice(priceIdr)}
                            <span className="text-[11px] font-normal text-teal-muted">{suffix}</span>
                          </span>
                          <Link
                            to={`/order/domain?product=${encodeURIComponent(product.slug)}&cycle=${product.displayCycle}`}
                            className="rounded-full bg-green-cta px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-green-cta-hover"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

          {/* Matching Domain TLDs if searched */}
          {(activeTab === 'all' || activeTab === 'products') && matchedTlds.length > 0 && (
            <section className="rounded-[16px] border border-salmon-border bg-white p-5 shadow-soft">
              <h2 className="text-[16px] font-bold text-teal">Ekstensi Domain Terkait</h2>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {matchedTlds.map((tld) => (
                  <div
                    key={tld.tld}
                    className="flex items-center justify-between rounded-[12px] border border-border-soft bg-blush px-4 py-2.5"
                  >
                    <div>
                      <p className="text-[14px] font-bold text-teal">{tld.tld}</p>
                      <p className="text-[11px] text-teal-muted">{tld.note}</p>
                    </div>
                    <Link
                      to={`/domain/register?q=domainanda${tld.tld}`}
                      className="rounded-full bg-coral px-3.5 py-1 text-[11px] font-semibold text-white"
                    >
                      {formatPrice(tld.newPriceIdr)}/yr
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Knowledgebase Results */}
          {(activeTab === 'all' || activeTab === 'kb') && matchedKb.length > 0 && (
            <section className="rounded-[16px] border border-salmon-border bg-white p-5 shadow-soft">
              <h2 className="text-[16px] font-bold text-teal">Artikel Knowledgebase</h2>
              <div className="mt-3 space-y-2.5">
                {matchedKb.map((art) => (
                  <Link
                    key={art.id}
                    to={`/knowledgebase/article/${art.slug}`}
                    className="block rounded-[12px] border border-border-soft bg-blush px-4 py-3 transition-colors hover:border-salmon"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-bold text-teal">{art.title}</p>
                      <span className="rounded-full bg-mint-strip px-2.5 py-0.5 text-[10px] font-bold text-teal">
                        {art.categoryLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-teal-muted">{art.snippet}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Announcements Results */}
          {(activeTab === 'all' || activeTab === 'announcements') && matchedAnnouncements.length > 0 && (
            <section className="rounded-[16px] border border-salmon-border bg-white p-5 shadow-soft">
              <h2 className="text-[16px] font-bold text-teal">Announcements</h2>
              <div className="mt-3 space-y-2.5">
                {matchedAnnouncements.map((ann) => (
                  <Link
                    key={ann.id}
                    to="/announcements"
                    className="block rounded-[12px] border border-border-soft bg-blush px-4 py-3 transition-colors hover:border-salmon"
                  >
                    <p className="text-[12px] font-bold text-coral">{ann.dateLabel} • {ann.monthGroup}</p>
                    <p className="mt-0.5 text-[14px] font-bold text-teal">{ann.title}</p>
                    <p className="mt-1 text-[12px] text-teal-muted">{ann.body}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}
