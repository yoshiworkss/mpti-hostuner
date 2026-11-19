import { useState } from 'react'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { SidebarCardSection, SupportSidebar, type SidebarItemConfig } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { BreadcrumbBackBar } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'

type MonthFilter = 'all' | 'September 2026' | 'Agustus 2025' | 'Oktober 2026'

/**
 * Matches Figma Page FIX V6 Screens `03 — Announcements (Main View)` &
 * `04 — Announcements Archive (By Date)`.
 */
export function AnnouncementsPage() {
  const { state, showToast } = useHostuner()
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(state.announcements[0]?.id ?? null)

  const sepCount = state.announcements.filter((a) => a.monthGroup === 'September 2026').length
  const augCount = state.announcements.filter((a) => a.monthGroup === 'Agustus 2025').length
  const oktCount = state.announcements.filter((a) => a.monthGroup === 'Oktober 2026').length

  const filteredAnnouncements =
    selectedMonth === 'all'
      ? state.announcements
      : state.announcements.filter((a) => a.monthGroup === selectedMonth)

  const byDateItems: SidebarItemConfig[] = [
    {
      label: 'Semua Pengumuman',
      badge: state.announcements.length,
      active: selectedMonth === 'all',
      onClick: () => setSelectedMonth('all'),
    },
    {
      label: 'September 2026',
      badge: sepCount,
      active: selectedMonth === 'September 2026',
      onClick: () => setSelectedMonth('September 2026'),
    },
    {
      label: 'Agustus 2025',
      badge: augCount,
      active: selectedMonth === 'Agustus 2025',
      onClick: () => setSelectedMonth('Agustus 2025'),
    },
    {
      label: 'Oktober 2026',
      badge: oktCount,
      active: selectedMonth === 'Oktober 2026',
      onClick: () => setSelectedMonth('Oktober 2026'),
    },
    {
      label: 'View RSS Feed',
      iconName: 'satellite-dish',
      onClick: () => showToast('RSS Feed pengumuman Hostuner aktif (announcements.xml).', 'info'),
    },
  ]

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="announcements"
          topCard={<SidebarCardSection title="By Date" items={byDateItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/"
        backLabel="← Back"
        segments={[
          { label: 'Portal Home', to: '/' },
          { label: 'Announcements' },
          ...(selectedMonth !== 'all' ? [{ label: selectedMonth }] : []),
        ]}
      />

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            Announcements
          </h1>
          <p className="mt-0.5 text-[13px] text-teal-muted">
            {selectedMonth === 'all'
              ? 'Pembaruan pemeliharaan server, peningkatan infrastruktur, dan pengumuman resmi Hostuner.'
              : `Menampilkan arsip pengumuman bulan ${selectedMonth}.`}
          </p>
        </div>
        {selectedMonth !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className="rounded-full border border-salmon-border bg-white px-4 py-1.5 text-[12px] font-semibold text-coral hover:bg-salmon-tint"
          >
            Tampilkan Semua
          </button>
        )}
      </header>

      {filteredAnnouncements.length === 0 ? (
        <section className="rounded-[20px] border border-salmon-border bg-white p-8 text-center shadow-soft">
          <h2 className="text-[18px] font-bold text-teal">Belum ada pengumuman pada periode {selectedMonth}</h2>
          <p className="mt-2 text-[13px] text-teal-muted">
            Pilih periode lain di sidebar kiri untuk melihat arsip pengumuman resmi Hostuner.
          </p>
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className="mt-4 rounded-full bg-coral px-6 py-2 text-[13px] font-semibold text-white hover:bg-coral-hover"
          >
            Lihat Semua Pengumuman
          </button>
        </section>
      ) : (
        <div className="space-y-3.5">
          {filteredAnnouncements.map((item) => {
            const isOpen = expandedId === item.id
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[14px] border border-mint bg-white shadow-soft"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                  className="flex w-full items-center justify-between gap-3 bg-mint px-5 py-4 text-left transition-colors hover:bg-mint-strip"
                >
                  <span className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-teal md:text-[15px]">
                    <span>{item.dateLabel}</span>
                    <span aria-hidden="true">|</span>
                    <span>{item.title}</span>
                  </span>
                  <FigmaIcon
                    name="caret-down"
                    size={16}
                    className={`shrink-0 text-teal transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border-soft bg-white px-5 py-4 text-[13px] leading-relaxed text-teal">
                    <p>{item.body}</p>
                    <p className="mt-3 text-[11px] font-semibold text-teal-muted">
                      Periode Arsip: {item.monthGroup} • Tim Operasional Hostuner
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
