import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { SidebarCardSection, SupportSidebar, type SidebarItemConfig } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'

function useDownloadCategoryItems(activeSlug?: string): SidebarItemConfig[] {
  const { state } = useHostuner()
  const manualsCount = state.downloads.filter((d) => d.categorySlug === 'manuals').length
  const emptyCount = state.downloads.filter((d) => d.categorySlug === 'empty').length

  return [
    {
      label: 'Manuals',
      to: '/downloads/manuals',
      badge: manualsCount,
      active: activeSlug === 'manuals',
    },
    {
      label: 'Utilities & Software',
      to: '/downloads/empty',
      badge: emptyCount,
      active: activeSlug === 'empty',
    },
  ]
}

/**
 * Matches Figma Page FIX V6 Screens `23 — Downloads Main Index`,
 * `23B — Downloads Search Results`, `24 — Manuals (4)`, and `25 — Empty Folder State`.
 */
export function DownloadsPage() {
  const { category } = useParams<{ category?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { state, showToast } = useHostuner()

  const activeQuery = (searchParams.get('q') ?? '').trim()
  const [inputState, setInputState] = useState<{ qParam: string; text: string }>({
    qParam: activeQuery,
    text: activeQuery,
  })
  const inputText = inputState.qParam === activeQuery ? inputState.text : activeQuery
  const [searchError, setSearchError] = useState<string | undefined>(undefined)

  const activeCategorySlug = category === 'manuals' ? 'manuals' : category === 'empty' ? 'empty' : undefined
  const categoryItems = useDownloadCategoryItems(activeCategorySlug)
  const manualsCount = state.downloads.filter((d) => d.categorySlug === 'manuals').length
  const emptyCount = state.downloads.filter((d) => d.categorySlug === 'empty').length

  const queryLower = activeQuery.toLowerCase()
  const visibleFiles = activeCategorySlug
    ? state.downloads.filter((d) => d.categorySlug === activeCategorySlug)
    : queryLower
      ? state.downloads.filter(
          (d) =>
            d.fileName.toLowerCase().includes(queryLower) ||
            d.description.toLowerCase().includes(queryLower)
        )
      : state.downloads

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = inputText.trim()
    if (!clean) {
      setSearchError('Masukkan nama berkas atau kata kunci panduan (contoh: cPanel, DNS, atau Virtualizor).')
      return
    }
    setSearchError(undefined)
    setSearchParams({ q: clean })
  }

  function handleDownloadFile(fileName: string, fileSize: string) {
    showToast(`Mengunduh ${fileName} (${fileSize})...`, 'info')
  }

  const categoryTitle =
    activeCategorySlug === 'manuals'
      ? `Manuals (${manualsCount})`
      : activeCategorySlug === 'empty'
        ? `Utilities & Software (${emptyCount})`
        : null

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="downloads"
          topCard={<SidebarCardSection title="Categories" items={categoryItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo={activeCategorySlug || activeQuery ? '/downloads' : undefined}
        backLabel="← Back"
        segments={
          activeCategorySlug && categoryTitle
            ? [
                { label: 'Portal Home', to: '/' },
                { label: 'Downloads', to: '/downloads' },
                { label: categoryTitle },
              ]
            : activeQuery
              ? [
                  { label: 'Portal Home', to: '/' },
                  { label: 'Downloads', to: '/downloads' },
                  { label: `Search Results ("${activeQuery}")` },
                ]
              : [{ label: 'Portal Home', to: '/' }, { label: 'Downloads' }]
        }
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          {categoryTitle ? `Downloads — ${categoryTitle}` : activeQuery ? `Downloads Search: "${activeQuery}"` : 'Downloads'}
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">
          The download library has all the manuals, programs and other files that you may need.
        </p>
      </header>

      {/* Search Bar (shown on Index / Search view) */}
      {!activeCategorySlug && (
        <form onSubmit={handleSearchSubmit}>
          <div className="flex flex-col gap-2 rounded-[18px] border border-border-soft bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-5">
            <input
              type="search"
              aria-label="Cari file unduhan"
              value={inputText}
              onChange={(e) => {
                setInputState({ qParam: activeQuery, text: e.target.value })
                if (searchError) setSearchError(undefined)
              }}
              placeholder="Search manuals, guides, and files in Downloads..."
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
      )}

      {/* Categories Card on Main Index */}
      {!activeCategorySlug && !activeQuery && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">Categories</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/downloads/manuals"
              className="flex items-center gap-3 rounded-[14px] border border-salmon-border/80 bg-blush px-4 py-3.5 transition-colors hover:border-coral hover:bg-salmon-tint/50"
            >
              <FigmaIcon name="folder-open" size={20} className="text-coral" />
              <div>
                <p className="text-[14px] font-bold text-coral">Manuals ({manualsCount})</p>
                <p className="text-[12px] text-teal-muted">Panduan PDF cPanel, DNS, Virtualizor &amp; .sch.id</p>
              </div>
            </Link>

            <Link
              to="/downloads/empty"
              className="flex items-center gap-3 rounded-[14px] border border-border-soft bg-blush px-4 py-3.5 transition-colors hover:border-salmon"
            >
              <FigmaIcon name="folder-open" size={20} className="text-teal" />
              <div>
                <p className="text-[14px] font-bold text-teal">Utilities &amp; Software ({emptyCount})</p>
                <p className="text-[12px] text-teal-muted">Arsip utilitas server dan skrip tambahan</p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Files List / Empty State */}
      {visibleFiles.length === 0 ? (
        <section className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
          <span className="inline-flex rounded-full bg-salmon-tint px-3.5 py-1 text-[11px] font-bold text-coral uppercase">
            No Downloads Found
          </span>
          <h2 className="mt-3 text-[20px] font-bold text-teal">
            {activeQuery ? `Berkas "${activeQuery}" tidak ditemukan` : 'Belum Ada Berkas di Folder Ini'}
          </h2>
          <p className="mx-auto mt-2 max-w-[440px] text-[13px] text-teal-muted">
            {activeQuery
              ? 'Coba kata kunci lain seperti Panduan, cPanel, DNS, atau Virtualizor.'
              : 'Folder ini belum berisi file unduhan. Anda dapat membuka folder Manuals untuk mengunduh panduan resmi.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/downloads/manuals"
              className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-hover"
            >
              Buka Folder Manuals ({manualsCount}) →
            </Link>
            {activeQuery && (
              <button
                type="button"
                onClick={() => {
                  setInputState({ qParam: '', text: '' })
                  setSearchParams({})
                }}
                className="rounded-full border border-border-soft bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-teal">
              {activeCategorySlug
                ? `Daftar Berkas (${visibleFiles.length})`
                : activeQuery
                  ? `Hasil Pencarian (${visibleFiles.length} Berkas)`
                  : 'Popular Downloads'}
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

          <div className="mt-4 space-y-3">
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-col justify-between gap-3 rounded-[14px] border border-transparent bg-blush px-4 py-3.5 transition-colors hover:border-salmon-border sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <FigmaIcon name="arrow-down-square" size={18} className="mt-0.5 text-teal" />
                  <div>
                    <p className="text-[14px] font-bold text-teal">{file.fileName}</p>
                    <p className="mt-0.5 text-[12px] text-teal-muted">{file.description}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  <span className="text-[12px] font-medium text-teal-muted">
                    Filesize: <strong className="text-teal">{file.fileSize}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file.fileName, file.fileSize)}
                    className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
