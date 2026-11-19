import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { SidebarCardSection, SupportSidebar, type SidebarItemConfig } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'

function useKbCategoryItems(activeSlug?: string): SidebarItemConfig[] {
  const { state } = useHostuner()
  const hostingCount = state.kbArticles.filter((a) => a.categorySlug === 'hosting').length
  const vpsCount = state.kbArticles.filter((a) => a.categorySlug === 'vps').length

  return [
    {
      label: 'Hosting',
      to: '/knowledgebase/hosting',
      badge: hostingCount,
      active: activeSlug === 'hosting',
    },
    {
      label: 'VPS',
      to: '/knowledgebase/vps',
      badge: vpsCount,
      active: activeSlug === 'vps',
    },
  ]
}

/**
 * Matches Figma Page FIX V6 Screens `20 — Knowledgebase Main Index` &
 * `20B — Knowledgebase Search Results`.
 */
export function KnowledgebaseIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { state } = useHostuner()

  const activeQuery = (searchParams.get('q') ?? '').trim()
  const [inputState, setInputState] = useState<{ qParam: string; text: string }>({
    qParam: activeQuery,
    text: activeQuery,
  })
  const inputText = inputState.qParam === activeQuery ? inputState.text : activeQuery
  const [searchError, setSearchError] = useState<string | undefined>(undefined)

  const categoryItems = useKbCategoryItems()
  const hostingCount = state.kbArticles.filter((a) => a.categorySlug === 'hosting').length
  const vpsCount = state.kbArticles.filter((a) => a.categorySlug === 'vps').length

  const queryLower = activeQuery.toLowerCase()
  const matchingArticles = queryLower
    ? state.kbArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(queryLower) ||
          a.snippet.toLowerCase().includes(queryLower) ||
          a.content.toLowerCase().includes(queryLower)
      )
    : [...state.kbArticles].sort((a, b) => b.views - a.views)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = inputText.trim()
    if (!clean) {
      setSearchError('Masukkan kata kunci pencarian artikel terlebih dahulu (contoh: cPanel atau WordPress).')
      return
    }
    setSearchError(undefined)
    setSearchParams({ q: clean })
  }

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="knowledgebase"
          topCard={<SidebarCardSection title="Categories" items={categoryItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo={activeQuery ? '/knowledgebase' : undefined}
        backLabel="← Back"
        segments={
          activeQuery
            ? [
                { label: 'Portal Home', to: '/' },
                { label: 'Knowledgebase', to: '/knowledgebase' },
                { label: `Search Results ("${activeQuery}")` },
              ]
            : [{ label: 'Portal Home', to: '/' }, { label: 'Knowledgebase' }]
        }
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          {activeQuery ? `Knowledgebase Search: "${activeQuery}"` : 'Knowledgebase'}
        </h1>
      </header>

      {/* Search Bar Pill */}
      <form onSubmit={handleSearchSubmit}>
        <div className="flex flex-col gap-2 rounded-[18px] border border-border-soft bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-5">
          <input
            type="search"
            aria-label="Cari artikel Knowledgebase"
            value={inputText}
            onChange={(e) => {
              setInputState({ qParam: activeQuery, text: e.target.value })
              if (searchError) setSearchError(undefined)
            }}
            placeholder="Have a question? Start your search here."
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[14px] text-charcoal placeholder:text-teal-muted focus:outline-none sm:px-0"
          />
          <button
            type="submit"
            className="h-[38px] shrink-0 rounded-full bg-teal px-7 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </div>
        <FieldError message={searchError} />
      </form>

      {/* Categories Card (Shown on Main Index) */}
      {!activeQuery && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">Categories</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/knowledgebase/hosting"
              className="flex items-center gap-3 rounded-[14px] border border-salmon-border/80 bg-blush px-4 py-3.5 transition-colors hover:border-coral hover:bg-salmon-tint/50"
            >
              <FigmaIcon name="folder-open" size={20} className="text-coral" />
              <div>
                <p className="text-[14px] font-bold text-coral">Hosting ({hostingCount})</p>
                <p className="text-[12px] text-teal-muted">Dasar menggunakan hosting cPanel &amp; WordPress</p>
              </div>
            </Link>

            <Link
              to="/knowledgebase/vps"
              className="flex items-center gap-3 rounded-[14px] border border-border-soft bg-blush px-4 py-3.5 transition-colors hover:border-salmon"
            >
              <FigmaIcon name="folder-open" size={20} className="text-teal" />
              <div>
                <p className="text-[14px] font-bold text-teal">VPS ({vpsCount})</p>
                <p className="text-[12px] text-teal-muted">Panduan server Proxmox VPS Virtualizor</p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Articles List / Search Results */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold text-teal">
            {activeQuery
              ? `Ditemukan ${matchingArticles.length} Artikel`
              : 'Most Popular Articles'}
          </h2>
          {activeQuery && (
            <button
              type="button"
              onClick={() => {
                setInputState({ qParam: '', text: '' })
                setSearchParams({})
              }}
              className="text-[12px] font-semibold text-coral hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {matchingArticles.length === 0 ? (
          <div className="mt-4 rounded-[14px] border border-border-soft bg-blush p-6 text-center">
            <p className="text-[15px] font-bold text-teal">
              Artikel dengan kata kunci &quot;{activeQuery}&quot; tidak ditemukan.
            </p>
            <p className="mt-1 text-[12px] text-teal-muted">
              Coba kata kunci lain seperti <strong>cPanel</strong>, <strong>WordPress</strong>, atau{' '}
              <strong>Backup</strong>.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {matchingArticles.map((article) => (
              <Link
                key={article.id}
                to={`/knowledgebase/article/${article.slug}`}
                className="block rounded-[14px] border border-transparent bg-blush px-4 py-3.5 transition-colors hover:border-salmon hover:bg-salmon-tint/40"
              >
                <div className="flex items-start gap-2.5">
                  <FigmaIcon name="file-detail" size={16} className="mt-0.5 text-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-teal">{article.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-teal-muted">{article.snippet}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screens `21 — KB Sub-Category: Hosting (6)` &
 * `22 — KB Sub-Category: VPS (0) — No Articles Found`, complete with BreadcrumbBackBar.
 */
export function KnowledgebaseCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const { state } = useHostuner()

  const slug = category === 'vps' ? 'vps' : 'hosting'
  const categoryLabel = slug === 'vps' ? 'VPS' : 'Hosting'
  const articles = state.kbArticles.filter((a) => a.categorySlug === slug)
  const categoryItems = useKbCategoryItems(slug)

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="knowledgebase"
          topCard={<SidebarCardSection title="Categories" items={categoryItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/knowledgebase"
        backLabel="← Back"
        segments={[
          { label: 'Portal Home', to: '/' },
          { label: 'Knowledgebase', to: '/knowledgebase' },
          { label: `${categoryLabel} (${articles.length})` },
        ]}
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          Knowledgebase — {categoryLabel}
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">
          {slug === 'hosting'
            ? 'Kumpulan panduan resmi pengelolaan cPanel, WordPress, keamanan, dan backup Hosting IIX.'
            : 'Dokumentasi pengelolaan server virtual Proxmox VPS Virtualizor.'}
        </p>
      </header>

      {articles.length === 0 ? (
        <section className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
          <span className="inline-flex rounded-full bg-salmon-tint px-3.5 py-1 text-[11px] font-bold text-coral uppercase">
            Folder Kosong
          </span>
          <h2 className="mt-3 text-[20px] font-bold text-teal">No Articles Found</h2>
          <p className="mx-auto mt-2 max-w-[440px] text-[13px] text-teal-muted">
            Belum ada artikel yang diterbitkan pada folder <strong>{categoryLabel}</strong>. Anda dapat membaca panduan
            Hosting atau membuka tiket bantuan teknis.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/knowledgebase/hosting"
              className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-hover"
            >
              Lihat Folder Hosting →
            </Link>
            <Link
              to="/tickets/open"
              className="rounded-full border border-border-soft bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
            >
              Open Ticket
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">
            Artikel dalam Folder {categoryLabel} ({articles.length})
          </h2>
          <div className="mt-4 space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/knowledgebase/article/${article.slug}`}
                className="block rounded-[14px] border border-transparent bg-blush px-4 py-3.5 transition-colors hover:border-salmon hover:bg-salmon-tint/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <FigmaIcon name="file-detail" size={16} className="mt-0.5 text-teal" />
                    <div>
                      <p className="text-[14px] font-bold text-teal">{article.title}</p>
                      <p className="mt-1 text-[12px] text-teal-muted">{article.snippet}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-muted">
                    {article.views} views
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screen `20C — Knowledgebase Article Read View`.
 */
export function KnowledgebaseArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { state } = useHostuner()

  const article = state.kbArticles.find((a) => a.slug === slug) ?? state.kbArticles[0]
  const folderArticlesCount = state.kbArticles.filter((a) => a.categorySlug === article.categorySlug).length
  const categoryItems = useKbCategoryItems(article.categorySlug)

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="knowledgebase"
          topCard={<SidebarCardSection title="Categories" items={categoryItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo={`/knowledgebase/${article.categorySlug}`}
        backLabel="← Back"
        segments={[
          { label: 'Portal Home', to: '/' },
          { label: 'Knowledgebase', to: '/knowledgebase' },
          {
            label: `${article.categoryLabel} (${folderArticlesCount})`,
            to: `/knowledgebase/${article.categorySlug}`,
          },
          { label: article.title },
        ]}
      />

      <header>
        <h1 className="text-[24px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
          {article.title}
        </h1>
      </header>

      <article className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft md:p-7">
        <span className="inline-flex rounded-full bg-mint-strip px-3.5 py-1 text-[11px] font-bold text-teal">
          Kategori: {article.categoryLabel} • Diperbarui: {article.updatedAt} • {article.views} tayangan
        </span>

        <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-charcoal whitespace-pre-line">
          {article.content}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-5">
          <Link
            to={`/knowledgebase/${article.categorySlug}`}
            className="rounded-full border border-salmon bg-salmon-tint/70 px-5 py-2 text-[13px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
          >
            ← Kembali ke Folder {article.categoryLabel} ({folderArticlesCount})
          </Link>
          <Link
            to="/knowledgebase"
            className="rounded-full bg-teal px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Lihat Indeks Knowledgebase
          </Link>
        </div>
      </article>
    </PageShell>
  )
}
