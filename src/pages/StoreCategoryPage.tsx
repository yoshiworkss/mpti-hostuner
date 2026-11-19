import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { StoreSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { EmptyProductGroupCard, PlanCard } from '../components/store/PlanCard'
import { BreadcrumbBackBar } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import type { BillingCycle } from '../types/hostuner'

/**
 * Matches Figma Page FIX V6 Store Categories (`05 Hosting IIX`, `06–10` Empty,
 * `11 Paket Hosting Sekolah`, `12 Proxmox VPS` Empty, `13 Proxmox VPS Virtualizor`),
 * plus SRS FR-04 Search, Filter, Billing Cycle Switcher & Numeric Pagination.
 */
export function StoreCategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { state } = useHostuner()

  const activeCategory =
    state.categories.find((cat) => cat.slug === slug) ?? state.categories[0]

  const [queryState, setQueryState] = useState<{ slug: string; q: string }>({
    slug: activeCategory.slug,
    q: '',
  })
  const [freeDomainState, setFreeDomainState] = useState<{ slug: string; value: boolean }>({
    slug: activeCategory.slug,
    value: false,
  })
  const [cycleOverride, setCycleOverride] = useState<BillingCycle | 'default'>('default')
  const [pageSize, setPageSize] = useState<number>(6)
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: activeCategory.slug,
    page: 1,
  })

  const searchQuery = queryState.slug === activeCategory.slug ? queryState.q : ''
  const freeDomainOnly = freeDomainState.slug === activeCategory.slug ? freeDomainState.value : false
  const categoryProducts = state.products.filter((p) => p.categorySlug === activeCategory.slug)

  const filteredProducts = categoryProducts.filter((p) => {
    if (freeDomainOnly && !p.isFreeDomain) return false
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return true
    return (
      p.name.toLowerCase().includes(needle) ||
      p.specs.some((s) => s.toLowerCase().includes(needle)) ||
      p.diskSpace.toLowerCase().includes(needle)
    )
  })

  const filterKey = `${activeCategory.slug}|${searchQuery}|${freeDomainOnly}|${pageSize}`
  const requestedPage = pageState.key === filterKey ? pageState.page : 1
  const effectivePageSize = pageSize === 0 ? Math.max(filteredProducts.length, 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / effectivePageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize
  )

  const isWideLayout = activeCategory.slug === 'paket-hosting-sekolah'

  return (
    <PageShell sidebar={<StoreSidebar activeCategorySlug={activeCategory.slug} />}>
      <BreadcrumbBackBar
        backTo="/"
        backLabel="← Back"
        segments={[
          { label: 'Home', to: '/' },
          { label: 'Store', to: '/store/hosting-iix' },
          { label: activeCategory.name },
        ]}
      />

      {/* Heading & Accent Rule (matches V6 Store screens) */}
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            {activeCategory.name}
          </h1>
          <span className="rounded-full bg-salmon-tint px-3 py-1 text-[11px] font-bold text-coral">
            {categoryProducts.length} Paket Tersedia
          </span>
        </div>
        <p className="mt-1 text-[13px] text-teal-muted">{activeCategory.description}</p>
        <div className="mt-3 h-[1.5px] w-full bg-salmon/55" />
      </header>

      {/* FR-04 Search, Filter & Monthly / Annually Switcher */}
      {categoryProducts.length > 0 && (
        <section
          aria-label="Filter dan Siklus Tagihan Store"
          className="rounded-[16px] border border-salmon-border bg-white p-4 shadow-soft"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border-soft bg-blush px-4 py-2">
              <FigmaIcon name="search" size={15} className="text-teal-muted" />
              <input
                type="search"
                aria-label={`Cari paket di ${activeCategory.name}`}
                value={searchQuery}
                onChange={(e) => {
                  setQueryState({ slug: activeCategory.slug, q: e.target.value })
                  setPageState({ key: filterKey, page: 1 })
                }}
                placeholder={`Cari paket atau spesifikasi di ${activeCategory.name}...`}
                className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFreeDomainState({ slug: activeCategory.slug, value: !freeDomainOnly })
                  setPageState({ key: filterKey, page: 1 })
                }}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  freeDomainOnly
                    ? 'bg-coral text-white'
                    : 'border border-border-soft bg-blush text-teal hover:border-salmon'
                }`}
              >
                {freeDomainOnly ? '✓ Gratis Domain' : 'Filter: Gratis Domain'}
              </button>

              <div
                role="group"
                aria-label="Pilih Siklus Tagihan"
                className="inline-flex items-center rounded-full border border-salmon-border bg-blush p-1"
              >
                {(
                  [
                    { key: 'default', label: 'Default' },
                    { key: 'monthly', label: 'Monthly' },
                    { key: 'annually', label: 'Annually (-15%)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCycleOverride(opt.key)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                      cycleOverride === opt.key
                        ? 'bg-coral text-white'
                        : 'text-teal hover:text-coral'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Product Grid / Wide Card / Empty Notice */}
      {categoryProducts.length === 0 ? (
        <EmptyProductGroupCard categoryName={activeCategory.name} />
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
          <p className="text-[16px] font-bold text-teal">
            Tidak ada paket yang cocok dengan pencarian Anda.
          </p>
          <p className="mt-1 text-[13px] text-teal-muted">
            Ubah kata kunci pencarian atau matikan filter Gratis Domain untuk melihat semua paket.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQueryState({ slug: activeCategory.slug, q: '' })
                setFreeDomainState({ slug: activeCategory.slug, value: false })
              }}
              className="rounded-full bg-coral px-5 py-2 text-[13px] font-semibold text-white hover:bg-coral-hover"
            >
              Reset Filter
            </button>
            <Link
              to={`/search?q=${encodeURIComponent(searchQuery)}`}
              className="rounded-full border border-border-soft bg-blush px-5 py-2 text-[13px] font-semibold text-teal hover:border-salmon"
            >
              Cari di Semua Layanan →
            </Link>
          </div>
        </div>
      ) : isWideLayout ? (
        <div className="space-y-6">
          {paginatedProducts.map((product) => (
            <PlanCard key={product.id} product={product} cycleOverride={cycleOverride} variant="wide" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {paginatedProducts.map((product) => (
            <PlanCard key={product.id} product={product} cycleOverride={cycleOverride} variant="grid" />
          ))}
        </div>
      )}

      {/* FR-04 Numeric Pagination & Page Size Control */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border-soft bg-white px-5 py-3 shadow-soft">
          <p className="text-[12px] text-teal-muted">
            Menampilkan{' '}
            <strong className="text-teal">
              {(currentPage - 1) * effectivePageSize + 1}–
              {Math.min(currentPage * effectivePageSize, filteredProducts.length)}
            </strong>{' '}
            dari <strong className="text-teal">{filteredProducts.length}</strong> paket
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {totalPages > 1 && (
              <nav aria-label="Pagination Produk" className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPageState({ key: filterKey, page: Math.max(1, currentPage - 1) })}
                  className="rounded-full border border-border-soft bg-blush px-3 py-1 text-[12px] font-semibold text-teal disabled:opacity-40"
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1
                  const active = pNum === currentPage
                  return (
                    <button
                      key={pNum}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setPageState({ key: filterKey, page: pNum })}
                      className={`h-8 min-w-[32px] rounded-full px-2.5 text-[12px] font-bold transition-colors ${
                        active
                          ? 'bg-coral text-white'
                          : 'border border-border-soft bg-blush text-teal hover:border-salmon'
                      }`}
                    >
                      {pNum}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPageState({ key: filterKey, page: Math.min(totalPages, currentPage + 1) })
                  }
                  className="rounded-full border border-border-soft bg-blush px-3 py-1 text-[12px] font-semibold text-teal disabled:opacity-40"
                >
                  Next ›
                </button>
              </nav>
            )}

            {filteredProducts.length > 6 && (
              <button
                type="button"
                onClick={() => {
                  setPageSize((prev) => (prev === 0 ? 6 : 0))
                  setPageState({ key: filterKey, page: 1 })
                }}
                className="rounded-full border border-salmon-border bg-salmon-tint/60 px-3 py-1 text-[11px] font-semibold text-coral hover:bg-salmon-tint"
              >
                {pageSize === 0 ? 'Mode Halaman (6/hal)' : `Tampilkan Semua (${filteredProducts.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
