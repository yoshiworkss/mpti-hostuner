import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { SidebarCardSection, SupportSidebar, type SidebarItemConfig } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { RestrictedPageGate } from '../components/support/RestrictedPageGate'
import { BreadcrumbBackBar, ConfirmModal, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { hostunerBackendApi, isBackendApiEnabled } from '../services/apiClient'
import { STATIC_SERVER_NODES } from '../services/hostunerApi'
import type { SupportTicketItem } from '../types/hostuner'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Matches Figma Page FIX V6 Screens `26 Network Status (Before Login)` &
 * `27 Network Status (After Login — Authenticated View)`.
 */
export function NetworkStatusPage() {
  const { role } = useHostuner()
  const [issueTab, setIssueTab] = useState<'open' | 'scheduled' | 'resolved'>('open')

  if (role === 'guest') {
    return (
      <RestrictedPageGate
        pageName="Network Status"
        returnPath="/network-status"
        description="Status real-time node Hosting IIX, Paket Sekolah, dan Proxmox VPS khusus pelanggan terdaftar Hostuner."
      />
    )
  }

  const issueItems: SidebarItemConfig[] = [
    { label: 'Open', badge: 0, active: issueTab === 'open', onClick: () => setIssueTab('open') },
    { label: 'Scheduled', badge: 1, active: issueTab === 'scheduled', onClick: () => setIssueTab('scheduled') },
    { label: 'Resolved', badge: 4, active: issueTab === 'resolved', onClick: () => setIssueTab('resolved') },
  ]

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="network"
          topCard={<SidebarCardSection title="Network Issues" items={issueItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/client"
        backLabel="← Back"
        segments={[{ label: 'Portal Home', to: '/' }, { label: 'Network Status' }]}
      />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
          Network Status &amp; Server Uptime
        </h1>
        <span className="rounded-full bg-green-soft px-4 py-1.5 text-[12px] font-bold text-green-cta">
          ✓ All Hostuner Nodes Operational
        </span>
      </header>

      {/* Live Server Status Card (Figma 27) */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 className="text-[17px] font-bold text-teal">Live Server Status (Hostuner Infrastructure)</h2>
        <div className="mt-4 space-y-3">
          {STATIC_SERVER_NODES.map((node) => (
            <div
              key={node.id}
              className="flex flex-col justify-between gap-2 rounded-[14px] bg-blush px-4 py-3.5 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 shrink-0 rounded-full bg-green-cta"
                />
                <span className="text-[14px] font-bold text-teal">{node.nodeName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-teal-muted">
                <span>HTTP: <strong className="text-teal">{node.httpStatus}</strong></span>
                <span>•</span>
                <span>FTP: <strong className="text-teal">{node.ftpStatus}</strong></span>
                <span>•</span>
                <span>POP3: <strong className="text-teal">{node.pop3Status}</strong></span>
                <span>•</span>
                <span>Uptime: <strong className="text-green-cta">{node.uptime}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filtered Network Issues Panel */}
      <section className="rounded-[20px] border border-border-soft bg-white p-6 shadow-soft">
        <h2 className="text-[16px] font-bold text-teal">
          {issueTab === 'open'
            ? 'Open Network Issues (0)'
            : issueTab === 'scheduled'
              ? 'Scheduled Maintenance (1)'
              : 'Resolved Maintenance History (4)'}
        </h2>

        {issueTab === 'open' && (
          <p className="mt-2 rounded-[12px] bg-green-soft px-4 py-3 text-[13px] font-medium text-green-cta">
            ✓ Tidak ada gangguan jaringan aktif saat ini. Seluruh klaster Hosting IIX &amp; Proxmox VPS berjalan normal.
          </p>
        )}

        {issueTab === 'scheduled' && (
          <div className="mt-3 rounded-[14px] border border-salmon-border bg-blush p-4 text-[13px]">
            <p className="font-bold text-coral">Maintenance Terjadwal Hosting — Jumat, 21:00 WIB</p>
            <p className="mt-1 text-teal-muted">
              Estimasi 4 jam untuk pembaruan keamanan kernel CloudLinux OS pada klaster Shared Hosting IIX.
            </p>
          </div>
        )}

        {issueTab === 'resolved' && (
          <ul className="mt-3 space-y-2 text-[13px] text-teal">
            <li className="rounded-[12px] bg-blush px-4 py-2.5">
              ✓ <strong>Sep 21st</strong> — Upgrade RAM Server Hosting IIX (Selesai)
            </li>
            <li className="rounded-[12px] bg-blush px-4 py-2.5">
              ✓ <strong>Sep 13th</strong> — Maintenance Upgrade RAM CloudLinux IIX (Selesai)
            </li>
            <li className="rounded-[12px] bg-blush px-4 py-2.5">
              ✓ <strong>Sep 3rd</strong> — Pembaruan Sertifikat AutoSSL Klaster Hosting (Selesai)
            </li>
            <li className="rounded-[12px] bg-blush px-4 py-2.5">
              ✓ <strong>Aug 24th</strong> — Optimalisasi Jaringan Uplink 1Gbps Proxmox VPS Virtualizor (Selesai)
            </li>
          </ul>
        )}
      </section>
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screens `28 Affiliates (Before Login)` &
 * `29 Affiliates (After Login — Realtime Statistics)`.
 */
export function AffiliatesPage() {
  const { currentUser, role, formatPrice, showToast } = useHostuner()
  const [activeSection, setActiveSection] = useState<'overview' | 'referrals' | 'withdrawal'>('overview')
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawalRequested, setWithdrawalRequested] = useState(false)

  if (role === 'guest' || !currentUser) {
    return (
      <RestrictedPageGate
        pageName="Affiliates"
        returnPath="/affiliates"
        description="Pantau statistik klik, pendaftaran referral, dan komisi afiliasi Hostuner dari akun Client Anda."
      />
    )
  }

  const isSeedAffiliateAccount = currentUser.email.toLowerCase() === 'budi@sman1solo.sch.id'
  const affiliateClicks = isSeedAffiliateAccount ? 348 : 0
  const affiliateSignups = isSeedAffiliateAccount ? 12 : 0
  const affiliateBalanceIdr = isSeedAffiliateAccount ? 450000 : 0
  const referralLink = `https://billing.hostuner.com/aff.php?aff=${107 + currentUser.id}`

  const menuItems: SidebarItemConfig[] = [
    {
      label: 'Affiliate Overview',
      iconName: 'star-filled',
      active: activeSection === 'overview',
      onClick: () => setActiveSection('overview'),
    },
    {
      label: 'Referrals History',
      badge: affiliateSignups,
      active: activeSection === 'referrals',
      onClick: () => setActiveSection('referrals'),
    },
    {
      label: 'Request Withdrawal',
      iconName: 'credit-card',
      active: activeSection === 'withdrawal',
      onClick: () => setActiveSection('withdrawal'),
    },
  ]

  function handleCopyReferral() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(referralLink)
    }
    showToast('Tautan referral afiliasi berhasil disalin!', 'info')
  }

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          topCard={<SidebarCardSection title="Affiliate Menu" items={menuItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/client"
        backLabel="← Back"
        segments={[{ label: 'Portal Home', to: '/' }, { label: 'Affiliates' }]}
      />

      <header>
        <h1 className="text-[24px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
          Affiliates — Realtime Statistics
        </h1>
      </header>

      {/* Referral Link Blush Card (Figma 29) */}
      <section className="rounded-[20px] border border-salmon-border bg-hero-blush p-6 shadow-soft">
        <p className="text-[15px] font-bold text-teal">Your Unique Referral Link</p>
        <p className="mt-1.5 break-all text-[15px] font-bold text-coral">{referralLink}</p>
        <button
          type="button"
          onClick={handleCopyReferral}
          className="mt-4 rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Copy Referral Link
        </button>
      </section>

      {/* 3 KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border-soft bg-white p-5 text-center shadow-soft">
          <p className="text-[28px] font-bold text-coral">{affiliateClicks}</p>
          <p className="mt-1 text-[13px] font-bold text-teal">Clicks</p>
        </div>
        <div className="rounded-[18px] border border-border-soft bg-white p-5 text-center shadow-soft">
          <p className="text-[28px] font-bold text-coral">{affiliateSignups}</p>
          <p className="mt-1 text-[13px] font-bold text-teal">Signups</p>
        </div>
        <div className="rounded-[18px] border border-border-soft bg-white p-5 text-center shadow-soft">
          <p className="text-[26px] font-bold text-coral">{formatPrice(affiliateBalanceIdr)}</p>
          <p className="mt-1 text-[13px] font-bold text-teal">Available Balance</p>
        </div>
      </div>

      {/* Referrals & Withdrawal Card */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 className="text-[17px] font-bold text-teal">Your Referrals (Hosting &amp; VPS Commissions)</h2>
        {isSeedAffiliateAccount ? (
          <div className="mt-4 space-y-2.5 text-[13px] text-teal">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3">
              <span>
                <strong>12 Okt 2026</strong> • Hosting Pro (Annually) • {formatPrice(360000)}
              </span>
              <span className="font-bold text-green-cta">Commission: {formatPrice(36000)} • Active</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3">
              <span>
                <strong>04 Okt 2026</strong> • Proxmox VPS M 4.4 • {formatPrice(250000)}
              </span>
              <span className="font-bold text-green-cta">Commission: {formatPrice(25000)} • Active</span>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-[12px] bg-blush px-4 py-4 text-[13px] text-teal-muted">
            Belum ada transaksi referral untuk akun Anda. Bagikan tautan referral unik di atas untuk mulai memperoleh
            komisi 10% pada setiap pendaftaran layanan Hosting &amp; VPS.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {withdrawalRequested ? (
            <span className="rounded-full bg-green-soft px-4 py-2 text-[12px] font-bold text-green-cta">
              ✓ Permintaan pencairan saldo {formatPrice(affiliateBalanceIdr)} sedang diproses tim Billing.
            </span>
          ) : (
            <button
              type="button"
              disabled={affiliateBalanceIdr <= 0}
              onClick={() => setWithdrawModalOpen(true)}
              className="rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
            >
              Request Withdrawal
            </button>
          )}
        </div>
      </section>

      <ConfirmModal
        open={withdrawModalOpen}
        title="Ajukan Pencairan Saldo Afiliasi?"
        description={`Saldo tersedia sebesar ${formatPrice(affiliateBalanceIdr)} akan diajukan untuk pencairan ke rekening/e-wallet terdaftar atas nama ${currentUser.name}.`}
        confirmLabel="Ya, Ajukan Pencairan"
        cancelLabel="Batal"
        tone="green"
        onConfirm={() => {
          setWithdrawalRequested(true)
          setWithdrawModalOpen(false)
          showToast('Permintaan pencairan komisi afiliasi berhasil dikirim!')
        }}
        onCancel={() => setWithdrawModalOpen(false)}
      />
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screens `30 My Support Tickets (Before Login)` &
 * `31 My Support Tickets (After Login — Authenticated View)`.
 */
export function TicketsPage() {
  const { state, role, currentUser } = useHostuner()
  const [statusFilter, setStatusFilter] = useState<'All' | SupportTicketItem['status']>('All')
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)

  if (role === 'guest' || !currentUser) {
    return (
      <RestrictedPageGate
        pageName="My Support Tickets"
        returnPath="/tickets"
        description="Lihat riwayat tiket bantuan teknis dan konfirmasi pembayaran QRIS akun Anda setelah login."
      />
    )
  }

  const userTickets =
    role === 'admin'
      ? state.tickets
      : state.tickets.filter(
          (t) => !t.userEmail || t.userEmail.toLowerCase() === currentUser.email.toLowerCase()
        )

  const openCount = userTickets.filter((t) => t.status === 'Open').length
  const answeredCount = userTickets.filter((t) => t.status === 'Answered').length
  const replyCount = userTickets.filter((t) => t.status === 'Customer-Reply').length
  const closedCount = userTickets.filter((t) => t.status === 'Closed').length

  const filteredTickets =
    statusFilter === 'All'
      ? userTickets
      : userTickets.filter((t) => t.status === statusFilter)

  const filterItems: SidebarItemConfig[] = [
    { label: 'Semua Tiket', badge: userTickets.length, active: statusFilter === 'All', onClick: () => setStatusFilter('All') },
    { label: 'Open', badge: openCount, active: statusFilter === 'Open', onClick: () => setStatusFilter('Open') },
    { label: 'Answered', badge: answeredCount, active: statusFilter === 'Answered', onClick: () => setStatusFilter('Answered') },
    { label: 'Customer-Reply', badge: replyCount, active: statusFilter === 'Customer-Reply', onClick: () => setStatusFilter('Customer-Reply') },
    { label: 'Closed', badge: closedCount, active: statusFilter === 'Closed', onClick: () => setStatusFilter('Closed') },
  ]

  function statusBadgeClass(status: SupportTicketItem['status']): string {
    if (status === 'Open') return 'bg-green-soft text-green-cta'
    if (status === 'Answered') return 'bg-salmon-tint text-coral'
    if (status === 'Customer-Reply') return 'bg-mint-strip text-teal'
    return 'bg-blush text-teal-muted border border-border-soft'
  }

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="tickets"
          topCard={<SidebarCardSection title="View Filter" items={filterItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/client"
        backLabel="← Back"
        segments={[{ label: 'Portal Home', to: '/' }, { label: 'My Support Tickets' }]}
      />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
          My Support Tickets
        </h1>
        <Link
          to="/tickets/open"
          className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
        >
          + Open Ticket
        </Link>
      </header>

      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 className="text-[17px] font-bold text-teal">
          Your Existing Tickets History ({filteredTickets.length})
        </h2>

        {filteredTickets.length === 0 ? (
          <div className="mt-4 rounded-[14px] bg-blush p-6 text-center text-[13px] text-teal-muted">
            Tidak ada tiket dengan status <strong>{statusFilter}</strong>.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredTickets.map((ticket) => {
              const expanded = expandedTicketId === ticket.id
              return (
                <article
                  key={ticket.id}
                  className="overflow-hidden rounded-[14px] border border-salmon-border/70 bg-blush"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedTicketId((prev) => (prev === ticket.id ? null : ticket.id))}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-salmon-tint/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-teal">
                        {ticket.ticketNumber} • [{ticket.department}] {ticket.subject}
                      </p>
                      <p className="mt-0.5 text-[11px] text-teal-muted">Dibuat: {ticket.createdAt}</p>
                    </div>
                    <span className={`rounded-full px-3.5 py-1 text-[11px] font-bold ${statusBadgeClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </button>

                  {expanded && (
                    <div className="border-t border-border-soft bg-white px-4 py-3.5 text-[13px] leading-relaxed text-charcoal">
                      <p>{ticket.message}</p>
                      {ticket.invoiceNumber && (
                        <div className="mt-3">
                          <Link
                            to={`/checkout/invoice/${encodeURIComponent(ticket.invoiceNumber)}`}
                            className="text-[12px] font-bold text-coral hover:underline"
                          >
                            Lihat Invoice #{ticket.invoiceNumber} →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screen `32 — Open Ticket (Support & Konfirmasi Pembayaran)`.
 * Keeps Captcha strictly on Auth pages per user's Auth-Only Captcha rule.
 */
export function OpenTicketPage() {
  const [searchParams] = useSearchParams()
  const { role, currentUser, submitTicket } = useHostuner()

  const prefilledInvoice = (searchParams.get('invoice') ?? '').trim()
  const initialDept: SupportTicketItem['department'] =
    prefilledInvoice || searchParams.get('department') === 'payment'
      ? 'Konfirmasi Pembayaran'
      : 'Support'

  const [department, setDepartment] = useState<SupportTicketItem['department']>(initialDept)
  const [name, setName] = useState(currentUser?.name ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(prefilledInvoice)
  const [subject, setSubject] = useState(
    prefilledInvoice ? `Konfirmasi Pembayaran QRIS Invoice #${prefilledInvoice}` : ''
  )
  const [message, setMessage] = useState('')
  const [attachmentName, setAttachmentName] = useState<string>('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null)

  if (role === 'guest' || !currentUser) {
    const querySuffix = searchParams.toString()
    const targetPath = querySuffix ? `/tickets/open?${querySuffix}` : '/tickets/open'
    return (
      <RestrictedPageGate
        pageName="Open Ticket"
        returnPath={targetPath}
        description="Silakan login terlebih dahulu untuk membuka tiket bantuan teknis atau mengirimkan konfirmasi pembayaran QRIS Statis Anda."
      />
    )
  }

  const departmentItems: SidebarItemConfig[] = [
    {
      label: 'Support (Technical)',
      iconName: 'spanner',
      active: department === 'Support',
      onClick: () => setDepartment('Support'),
    },
    {
      label: 'Konfirmasi Pembayaran',
      iconName: 'credit-card',
      active: department === 'Konfirmasi Pembayaran',
      onClick: () => setDepartment('Konfirmasi Pembayaran'),
    },
  ]

  function clearErr(key: string) {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const next: Record<string, string | undefined> = {}

    if (!name.trim()) next.name = 'Nama pengirim wajib diisi.'
    if (!email.trim() || !isValidEmail(email)) next.email = 'Alamat email valid wajib diisi.'
    if (!subject.trim()) next.subject = 'Subjek tiket wajib diisi.'
    if (message.trim().length < 10) next.message = 'Isi pesan minimal 10 karakter agar tim kami dapat membantu.'

    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }

    const fullMessage = attachmentName
      ? `${message.trim()}\n[Lampiran: ${attachmentName}]`
      : message.trim()

    setIsSubmitting(true)
    try {
      const res = await submitTicket({
        department,
        subject: subject.trim(),
        message: fullMessage,
        invoiceNumber: invoiceNumber.trim() || undefined,
        userEmail: email.trim().toLowerCase(),
        attachmentFile,
      })

      if (res.success && res.data) {
        setCreatedTicketNumber(res.data.ticketNumber)
        setErrors({})
      } else if (!res.success) {
        setErrors(res.errors ?? { message: res.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          activeSupportKey="open-ticket"
          topCard={<SidebarCardSection title="Departments" items={departmentItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/tickets"
        backLabel="← Back"
        segments={[
          { label: 'Portal Home', to: '/' },
          { label: 'Tickets', to: '/tickets' },
          { label: 'Open Ticket' },
        ]}
      />

      <header>
        <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
          Open Ticket
        </h1>
        <p className="mt-1 text-[13px] text-teal-muted">
          Kirim pertanyaan teknis Hosting/VPS atau konfirmasi bukti scan QRIS Statis Anda kepada tim Hostuner.
        </p>
      </header>

      {createdTicketNumber ? (
        <section className="rounded-[20px] border border-green-cta bg-green-soft p-6 shadow-soft">
          <h2 className="text-[20px] font-bold text-green-cta">
            ✓ Tiket {createdTicketNumber} Berhasil Dikirim!
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal">
            Tim <strong>{department}</strong> Hostuner telah menerima laporan Anda untuk subjek{' '}
            <strong>&quot;{subject}&quot;</strong> dan akan segera menindaklanjuti.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/tickets"
              className="rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Lihat Daftar Tiket Saya →
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedTicketNumber(null)
                setSubject('')
                setMessage('')
                setAttachmentName('')
                setAttachmentFile(null)
              }}
              className="rounded-full border border-border-soft bg-white px-5 py-2.5 text-[13px] font-semibold text-teal"
            >
              Buat Tiket Baru Lainnya
            </button>
          </div>
        </section>
      ) : (
        <form
          onSubmit={handleTicketSubmit}
          className="space-y-4 rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-name" className="block text-[12px] font-bold text-teal">
                Name
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                <FigmaIcon name="user-filled" size={15} className="text-teal-muted" />
                <input
                  id="ticket-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    clearErr('name')
                  }}
                  placeholder="Enter your name"
                  className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                />
              </div>
              <FieldError message={errors.name} />
            </div>

            <div>
              <label htmlFor="ticket-email" className="block text-[12px] font-bold text-teal">
                Email Address
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                <FigmaIcon name="at" size={15} className="text-teal-muted" />
                <input
                  id="ticket-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearErr('email')
                  }}
                  placeholder="Enter your email"
                  className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                />
              </div>
              <FieldError message={errors.email} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-dept" className="block text-[12px] font-bold text-teal">
                Department
              </label>
              <select
                id="ticket-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value as SupportTicketItem['department'])}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] font-medium text-teal focus:border-salmon focus:bg-white focus:outline-none"
              >
                <option value="Konfirmasi Pembayaran">Konfirmasi Pembayaran (QRIS)</option>
                <option value="Support">Support (Technical)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-invoice" className="block text-[12px] font-bold text-teal">
                Nomor Invoice (Opsional)
              </label>
              <input
                id="ticket-invoice"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="#INV-2026-0892"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ticket-subject" className="block text-[12px] font-bold text-teal">
              Subject
            </label>
            <input
              id="ticket-subject"
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                clearErr('subject')
              }}
              placeholder="Konfirmasi pembayaran QRIS invoice Hosting IIX..."
              className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
            />
            <FieldError message={errors.subject} />
          </div>

          <div>
            <label htmlFor="ticket-message" className="block text-[12px] font-bold text-teal">
              Message &amp; Attachments (.jpg, .png, .pdf)
            </label>
            <textarea
              id="ticket-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                clearErr('message')
              }}
              placeholder="Tuliskan detail kendala atau rincian pembayaran QRIS Statis Anda..."
              className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
            />
            <FieldError message={errors.message} />

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
              <label className="cursor-pointer rounded-full border border-salmon-border bg-blush px-4 py-1.5 font-semibold text-teal hover:border-coral hover:text-coral">
                <span>Pilih Bukti Lampiran (.jpg / .png / .pdf)</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setAttachmentFile(file)
                    setAttachmentName(file ? file.name : '')
                  }}
                />
              </label>
              {attachmentName && (
                <span className="font-medium text-green-cta">✓ Terlampir: {attachmentName}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-teal px-8 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? 'Mengirim Tiket...' : 'Submit Ticket'}
          </button>
        </form>
      )}
    </PageShell>
  )
}

/**
 * Matches Figma Page FIX V6 Screen `33 — Contact Us (Pre-Sales Questions)`.
 * Keeps Captcha strictly on Auth pages per user's Auth-Only Captcha rule.
 */
export function ContactUsPage() {
  const { currentUser, showToast } = useHostuner()

  const [name, setName] = useState(currentUser?.name ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [sent, setSent] = useState(false)

  function clearErr(key: string) {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const next: Record<string, string | undefined> = {}

    if (!name.trim()) next.name = 'Nama Anda wajib diisi.'
    if (!email.trim() || !isValidEmail(email)) next.email = 'Alamat email valid wajib diisi.'
    if (!subject.trim()) next.subject = 'Subjek pertanyaan wajib diisi.'
    if (message.trim().length < 10) next.message = 'Pesan wajib diisi minimal 10 karakter.'

    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }

    setIsSubmitting(true)
    try {
      if (isBackendApiEnabled()) {
        const res = await hostunerBackendApi.content.sendContactMessage({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        })
        if (!res.success) {
          showToast(res.message, 'error')
          return
        }
      }
      setErrors({})
      setSent(true)
      showToast('Pesan pra-penjualan Anda berhasil dikirim ke tim Hostuner!')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[920px] space-y-5">
        <BreadcrumbBackBar
          backTo="/"
          backLabel="← Back"
          segments={[{ label: 'Portal Home', to: '/' }, { label: 'Contact Us' }]}
        />

        <section className="rounded-[24px] border border-salmon-border bg-white p-6 shadow-soft md:p-9">
          <h1 className="text-[26px] font-bold tracking-wide text-teal uppercase md:text-[28px]">
            Contact Us — Pre-Sales Questions
          </h1>
          <p className="mt-1.5 text-[13px] text-teal-muted">
            If you have any pre-sales questions or want to contact us, please use the form below.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4 rounded-[16px] border border-green-cta bg-green-soft p-6">
              <h2 className="text-[18px] font-bold text-green-cta">✓ Pesan Berhasil Terkirim</h2>
              <p className="text-[13px] leading-relaxed text-charcoal">
                Terima kasih, <strong>{name}</strong>. Tim Sales Hostuner telah menerima pertanyaan Anda tentang{' '}
                <strong>&quot;{subject}&quot;</strong> dan akan membalas ke <strong>{email}</strong>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/store/hosting-iix"
                  className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-coral-hover"
                >
                  Jelajahi Paket Hosting →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false)
                    setSubject('')
                    setMessage('')
                  }}
                  className="rounded-full border border-border-soft bg-white px-5 py-2.5 text-[13px] font-semibold text-teal"
                >
                  Kirim Pertanyaan Lain
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-[12px] font-bold text-teal">
                    Name
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                    <FigmaIcon name="user-filled" size={15} className="text-teal-muted" />
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        clearErr('name')
                      }}
                      placeholder="Your Name"
                      className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                    />
                  </div>
                  <FieldError message={errors.name} />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-[12px] font-bold text-teal">
                    Email Address
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                    <FigmaIcon name="at" size={15} className="text-teal-muted" />
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        clearErr('email')
                      }}
                      placeholder="Your Email"
                      className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                    />
                  </div>
                  <FieldError message={errors.email} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-[12px] font-bold text-teal">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value)
                    clearErr('subject')
                  }}
                  placeholder="Pre-sales inquiry regarding Hosting / VPS"
                  className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                />
                <FieldError message={errors.subject} />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-[12px] font-bold text-teal">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    clearErr('message')
                  }}
                  placeholder="Write your message here..."
                  className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                />
                <FieldError message={errors.message} />
              </div>

              <button
                type="submit"
                className="rounded-full bg-coral px-8 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-coral-hover"
              >
                Send Message
              </button>
            </form>
          )}
        </section>
      </div>
    </PageShell>
  )
}
