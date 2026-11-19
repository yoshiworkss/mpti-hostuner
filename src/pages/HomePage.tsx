import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FigmaIcon, type FigmaIconName } from '../components/icons/FigmaIcon'
import { PageShell } from '../components/layout/PageShell'
import { FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'

interface HelpActionCard {
  title: string
  description: string
  to: string
  icon: FigmaIconName
}

const HELP_ACTIONS: HelpActionCard[] = [
  {
    title: 'BUY A DOMAIN',
    description: 'Register or transfer your domain name in seconds.',
    to: '/domain/register',
    icon: 'globe-white',
  },
  {
    title: 'ORDER HOSTING',
    description: 'Choose from Hosting IIX, Sekolah or Proxmox VPS.',
    to: '/store/hosting-iix',
    icon: 'desktop-white',
  },
  {
    title: 'MAKE PAYMENT',
    description: 'Confirm your invoice payment quickly via Ticket.',
    to: '/tickets/open',
    icon: 'credit-card-white',
  },
  {
    title: 'GET SUPPORT',
    description: 'Explore Knowledgebase or open a support ticket.',
    to: '/knowledgebase',
    icon: 'envelope-white',
  },
]

/**
 * Matches Figma Page FIX V6 Screen `01 — Navbar: Home (Soft 3-Section Layout)`.
 */
export function HomePage() {
  const { state } = useHostuner()
  const navigate = useNavigate()

  const [domainInput, setDomainInput] = useState('')
  const [domainError, setDomainError] = useState<string | undefined>(undefined)
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null)

  const latestNews = state.announcements.slice(0, 4)

  function handleDomainSearch(e: React.FormEvent) {
    e.preventDefault()
    const clean = domainInput.trim().toLowerCase()
    if (!clean) {
      setDomainError('Masukkan nama domain atau kata kunci terlebih dahulu (contoh: bisnisanda.com).')
      return
    }
    if (clean.includes(' ')) {
      setDomainError('Nama domain tidak boleh mengandung spasi.')
      return
    }
    setDomainError(undefined)
    navigate(`/domain/register?q=${encodeURIComponent(clean)}`)
  }

  function handleTransferClick() {
    const clean = domainInput.trim().toLowerCase()
    setDomainError(undefined)
    if (clean) {
      navigate(`/domain/transfer?q=${encodeURIComponent(clean)}`)
    } else {
      navigate('/domain/transfer')
    }
  }

  return (
    <PageShell fullWidthContent>
      {/* Section 1: Soft Hero Domain Search Card */}
      <section className="mx-auto max-w-[1064px] px-4 pb-[34px] xl:px-0">
        <div className="rounded-[20px] bg-hero-blush px-6 py-9 shadow-soft md:px-[72px] md:py-[48px]">
          <h1 className="max-w-[620px] text-[28px] font-bold leading-[1.18] text-teal md:text-[38px]">
            Find the Perfect Domain
            <br />
            Name for Your Website
          </h1>
          <p className="mt-[14px] max-w-[540px] text-[15px] font-medium text-teal-muted">
            Begin the search for your perfect domain name...
          </p>

          <form onSubmit={handleDomainSearch} className="mt-[22px] max-w-[560px]">
            <div className="flex flex-col gap-2 rounded-[20px] bg-white p-2 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:py-[6px] sm:pr-[6px] sm:pl-[22px]">
              <input
                type="text"
                aria-label="Cari nama domain"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value)
                  if (domainError) setDomainError(undefined)
                }}
                placeholder="eg. example.com"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] text-charcoal placeholder:text-teal-muted focus:outline-none sm:px-0 sm:py-0"
              />
              <div className="flex shrink-0 items-center justify-end gap-[8px]">
                <button
                  type="submit"
                  className="inline-flex h-[38px] min-w-[106px] items-center justify-center rounded-full bg-teal px-[22px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleTransferClick}
                  className="inline-flex h-[38px] min-w-[104px] items-center justify-center rounded-full bg-mint px-[22px] text-[14px] font-semibold text-teal transition-colors hover:bg-mint-strip"
                >
                  Transfer
                </button>
              </div>
            </div>
            <FieldError message={domainError} />
          </form>

          <p className="mt-4 text-[12px] text-teal-muted">
            Mencari paket hosting, VPS, atau artikel Knowledgebase?{' '}
            <Link to="/search" className="font-semibold text-coral hover:underline">
              Buka Pencarian Global →
            </Link>
          </p>
        </div>
      </section>

      {/* Section 2: Full-Bleed Soft Mint Help Strip */}
      <section className="w-full bg-mint-strip py-[44px]">
        <div className="mx-auto max-w-[1064px] px-4 xl:px-0">
          <h2 className="text-center text-[26px] font-bold text-teal md:text-[32px]">
            How Can We Help Today?
          </h2>

          <div className="mt-[30px] grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HELP_ACTIONS.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group flex flex-col items-center rounded-[16px] px-3 py-2 text-center transition-colors hover:bg-white/60"
              >
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[16px] bg-teal text-white shadow-soft transition-transform duration-150 group-hover:-translate-y-0.5">
                  <FigmaIcon name={item.icon} size={42} />
                </div>
                <p className="mt-[14px] text-[16px] font-bold text-teal group-hover:text-coral">
                  {item.title}
                </p>
                <p className="mt-[6px] max-w-[220px] text-[12px] leading-relaxed text-teal">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: 2-Column Promo Card & Latest News Accordion */}
      <section className="mx-auto max-w-[1064px] px-4 py-[48px] xl:px-0">
        <div className="flex flex-col items-start gap-[36px] lg:flex-row">
          {/* Left Heritage Coral Promo Card */}
          <div className="flex w-full shrink-0 flex-col items-start gap-[18px] rounded-[20px] bg-coral p-[32px] text-white shadow-soft md:p-[36px] lg:w-[468px]">
            <h2 className="text-[28px] font-bold leading-tight md:text-[32px]">
              Powerful Hosting
              <br />
              Made Simple
            </h2>
            <p className="text-[14px] font-medium leading-relaxed text-white/95">
              Launch your website with fast, secure, and reliable hosting. Everything you need to get online with
              Hostuner.
            </p>
            <ul className="space-y-2 py-1 text-[13px] font-semibold text-white">
              <li>✓&nbsp;&nbsp;Hosting IIX mulai Rp 50.000 / tahun</li>
              <li>✓&nbsp;&nbsp;Proxmox VPS Virtualizor &amp; Paket Hosting Sekolah</li>
              <li>✓&nbsp;&nbsp;Gratis Domain pada paket Hosting Pro &amp; Enterprise</li>
            </ul>
            <Link
              to="/store/hosting-iix"
              className="mt-1 inline-flex h-[44px] items-center justify-center rounded-full bg-white px-[24px] text-[15px] font-semibold text-coral transition-colors hover:bg-salmon-tint"
            >
              Explore Plans →
            </Link>
          </div>

          {/* Right Latest News & Announcements Column */}
          <div className="w-full min-w-0 flex-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-[26px] font-bold leading-tight text-teal md:text-[30px]">
                Latest News &amp;
                <br />
                Announcements
              </h2>
              <Link to="/announcements" className="pb-1 text-[12px] font-semibold text-coral hover:underline">
                Lihat Semua ({state.announcements.length}) →
              </Link>
            </div>

            <div className="mt-[18px] flex flex-col gap-[12px]">
              {latestNews.map((item) => {
                const isOpen = expandedNewsId === item.id
                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[12px] border border-mint bg-white shadow-soft"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpandedNewsId((prev) => (prev === item.id ? null : item.id))}
                      className="flex w-full items-center justify-between gap-3 bg-mint px-[20px] py-[14px] text-left transition-colors hover:bg-mint-strip"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-teal md:text-[15px]">
                        <span>{item.dateLabel}</span>
                        <span aria-hidden="true">|</span>
                        <span>{item.title}</span>
                      </span>
                      <FigmaIcon
                        name="caret-down"
                        size={18}
                        className={`shrink-0 text-teal transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-border-soft bg-white px-[20px] py-[14px] text-[13px] leading-relaxed text-charcoal">
                        <p>{item.body}</p>
                        <div className="mt-2.5 flex items-center justify-between text-[12px]">
                          <span className="rounded-full bg-mint-strip px-2.5 py-0.5 font-medium text-teal">
                            {item.monthGroup}
                          </span>
                          <Link to="/announcements" className="font-semibold text-coral hover:underline">
                            Buka Halaman Announcements →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
