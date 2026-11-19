import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { SidebarCardSection, SupportSidebar, type SidebarItemConfig } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import { RestrictedPageGate } from '../components/support/RestrictedPageGate'
import { BreadcrumbBackBar, ConfirmModal } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'

type ClientTab = 'dashboard' | 'services' | 'domains' | 'invoices' | 'tickets'

interface ActiveServiceItem {
  id: string
  name: string
  domain: string
  panelLabel: string
  panelType: 'cpanel' | 'virtualizor'
  status: 'Active' | 'Pending'
}

/**
 * Matches Figma Page FIX V6 Screen `39 — Authenticated Portal: Client Area Dashboard (After Login)`.
 * Filters invoices/orders strictly by the logged-in user and shows Admin shortcut only for `role === 'admin'`.
 */
export function ClientAreaPage() {
  const navigate = useNavigate()
  const { state, currentUser, role, formatPrice } = useHostuner()
  const [activeTab, setActiveTab] = useState<ClientTab>('dashboard')
  const [panelInfoModal, setPanelInfoModal] = useState<ActiveServiceItem | null>(null)

  if (role === 'guest' || !currentUser) {
    return (
      <RestrictedPageGate
        pageName="Client Area Dashboard"
        returnPath="/client"
        description="Kelola layanan aktif Hosting IIX, Proxmox VPS, domain terdaftar, dan tagihan QRIS Anda dari Client Area."
      />
    )
  }

  // Per-user filtered invoices & orders
  const userInvoices = state.invoices.filter(
    (inv) => inv.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
  )
  const unpaidInvoices = userInvoices.filter((inv) => inv.paymentStatus === 'unpaid')
  const userOrders = state.orders.filter((ord) => ord.userId === currentUser.id)

  const baseSeedServices: ActiveServiceItem[] =
    currentUser.email.toLowerCase() === 'budi@sman1solo.sch.id'
      ? [
          {
            id: 'svc-seed-1',
            name: 'Paket Web Sekolah',
            domain: 'sman1solo.sch.id',
            panelLabel: 'Login to cPanel',
            panelType: 'cpanel',
            status: 'Active',
          },
          {
            id: 'svc-seed-2',
            name: 'Proxmox VPS M 4.8',
            domain: 'vps.sman1solo.sch.id',
            panelLabel: 'Virtualizor Panel',
            panelType: 'virtualizor',
            status: 'Active',
          },
        ]
      : []

  const orderedServices: ActiveServiceItem[] = userOrders.flatMap((ord) =>
    ord.items
      .filter((it) => it.productName)
      .map((it) => {
        const isVps = (it.productName ?? '').toLowerCase().includes('vps')
        return {
          id: `svc-${ord.id}-${it.id}`,
          name: it.productName ?? 'Hosting Service',
          domain: it.domainName,
          panelLabel: isVps ? 'Virtualizor Panel' : 'Login to cPanel',
          panelType: isVps ? ('virtualizor' as const) : ('cpanel' as const),
          status: ord.orderStatus === 'active' ? ('Active' as const) : ('Pending' as const),
        }
      })
  )

  const allServices = [...baseSeedServices, ...orderedServices]
  const uniqueDomains = Array.from(
    new Set([
      ...(currentUser.email.toLowerCase() === 'budi@sman1solo.sch.id'
        ? ['sman1solo.sch.id', 'vps.sman1solo.sch.id', 'portalbisniskami.com']
        : []),
      ...userOrders.flatMap((ord) => ord.items.map((it) => it.domainName)),
    ])
  )

  const userTickets =
    role === 'admin'
      ? state.tickets
      : state.tickets.filter(
          (t) => !t.userEmail || t.userEmail.toLowerCase() === currentUser.email.toLowerCase()
        )
  const openTicketsCount = userTickets.filter((t) => t.status === 'Open').length

  const clientMenuItems: SidebarItemConfig[] = [
    {
      label: 'My Dashboard',
      iconName: 'dashboard',
      active: activeTab === 'dashboard',
      onClick: () => setActiveTab('dashboard'),
    },
    {
      label: 'My Services',
      badge: allServices.length,
      active: activeTab === 'services',
      onClick: () => setActiveTab('services'),
    },
    {
      label: 'My Domains',
      badge: uniqueDomains.length,
      active: activeTab === 'domains',
      onClick: () => setActiveTab('domains'),
    },
    {
      label: 'Unpaid Invoices',
      badge: unpaidInvoices.length,
      active: activeTab === 'invoices',
      onClick: () => setActiveTab('invoices'),
    },
    {
      label: 'My Support Tickets',
      badge: openTicketsCount,
      active: activeTab === 'tickets',
      onClick: () => setActiveTab('tickets'),
    },
  ]

  return (
    <PageShell
      sidebar={
        <SupportSidebar
          topCard={<SidebarCardSection title="Client Area Menu" items={clientMenuItems} />}
        />
      }
    >
      <BreadcrumbBackBar
        backTo="/"
        backLabel="← Back"
        segments={[{ label: 'Portal Home', to: '/' }, { label: 'Client Area Dashboard' }]}
      />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-wide text-teal uppercase md:text-[26px]">
            Client Area Dashboard
          </h1>
          <p className="mt-0.5 text-[13px] text-teal-muted">
            Selamat datang, <strong className="text-teal">{currentUser.name}</strong> ({currentUser.email})
          </p>
        </div>

        {/* Admin Dashboard shortcut shown strictly for Admin role */}
        {role === 'admin' && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-coral-hover"
          >
            <FigmaIcon name="dashboard" size={14} className="text-white" />
            <span>Buka Admin Dashboard →</span>
          </Link>
        )}
      </header>

      {/* 4 Interactive KPI Summary Cards (Figma 39) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { key: 'services' as const, label: 'Services', count: allServices.length },
          { key: 'domains' as const, label: 'Domains', count: uniqueDomains.length },
          { key: 'invoices' as const, label: 'Invoices', count: userInvoices.length },
          { key: 'tickets' as const, label: 'Tickets', count: openTicketsCount },
        ].map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setActiveTab(kpi.key)}
            className={`rounded-[18px] border bg-white p-5 text-center shadow-soft transition-colors ${
              activeTab === kpi.key ? 'border-coral bg-salmon-tint/35' : 'border-border-soft hover:border-salmon'
            }`}
          >
            <p className="text-[28px] font-bold text-coral">{kpi.count}</p>
            <p className="mt-1 text-[13px] font-bold text-teal">{kpi.label}</p>
          </button>
        ))}
      </div>

      {/* Active Products / Services Section */}
      {(activeTab === 'dashboard' || activeTab === 'services') && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-teal">Your Active Products / Services</h2>
            <Link to="/store/hosting-iix" className="text-[12px] font-semibold text-coral hover:underline">
              + Pesan Layanan Baru
            </Link>
          </div>

          {allServices.length === 0 ? (
            <div className="mt-4 rounded-[14px] bg-blush p-6 text-center">
              <p className="text-[14px] font-bold text-teal">Belum ada paket Hosting / VPS aktif.</p>
              <Link
                to="/store/hosting-iix"
                className="mt-3 inline-flex rounded-full bg-coral px-5 py-2 text-[12px] font-semibold text-white hover:bg-coral-hover"
              >
                Jelajahi Layanan Hosting IIX →
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {allServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex flex-col justify-between gap-3 rounded-[14px] bg-blush px-4 py-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-bold text-teal">
                        {svc.name} — {svc.domain}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          svc.status === 'Active'
                            ? 'bg-green-soft text-green-cta'
                            : 'bg-salmon-tint text-coral'
                        }`}
                      >
                        {svc.status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanelInfoModal(svc)}
                    className={`shrink-0 rounded-full px-5 py-2 text-[12px] font-semibold text-white transition-colors ${
                      svc.panelType === 'cpanel'
                        ? 'bg-green-cta hover:bg-green-cta-hover'
                        : 'bg-teal hover:opacity-90'
                    }`}
                  >
                    {svc.panelLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Domains List */}
      {(activeTab === 'dashboard' || activeTab === 'domains') && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-teal">My Registered Domains ({uniqueDomains.length})</h2>
            <Link to="/domain/register" className="text-[12px] font-semibold text-coral hover:underline">
              + Daftar Domain Baru
            </Link>
          </div>
          {uniqueDomains.length === 0 ? (
            <p className="mt-3 text-[13px] text-teal-muted">Belum ada domain terdaftar pada akun ini.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {uniqueDomains.map((dom) => (
                <div
                  key={dom}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3 text-[13px]"
                >
                  <span className="font-bold text-teal">{dom}</span>
                  <span className="rounded-full bg-green-soft px-3 py-0.5 text-[11px] font-bold text-green-cta">
                    Active • DNS Managed
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Per-User Invoices Section */}
      {(activeTab === 'dashboard' || activeTab === 'invoices') && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <h2 className="text-[17px] font-bold text-teal">My Invoices &amp; QRIS Billing ({userInvoices.length})</h2>
          {userInvoices.length === 0 ? (
            <p className="mt-3 text-[13px] text-teal-muted">Tidak ada tagihan pada akun Anda saat ini.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {userInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col justify-between gap-3 rounded-[14px] border border-salmon-border/70 bg-blush px-4 py-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-[14px] font-bold text-teal">
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
                      Total: <strong className="text-charcoal">{formatPrice(inv.breakdown.totalDueIdr)}</strong> • Jatuh
                      Tempo: {inv.dueDate}
                    </p>
                  </div>
                  <Link
                    to={`/checkout/invoice/${encodeURIComponent(inv.invoiceNumber)}`}
                    className="shrink-0 rounded-full bg-teal px-5 py-2 text-[12px] font-semibold text-white hover:opacity-90"
                  >
                    {inv.paymentStatus === 'paid' ? 'Lihat Bukti Lunas →' : 'Bayar via QRIS →'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tickets Quick View */}
      {activeTab === 'tickets' && (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-teal">Recent Support Tickets</h2>
            <Link
              to="/tickets"
              className="rounded-full bg-coral px-5 py-1.5 text-[12px] font-semibold text-white hover:bg-coral-hover"
            >
              Kelola Semua Tiket →
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {userTickets.length === 0 ? (
              <p className="rounded-[12px] bg-blush px-4 py-4 text-center text-[13px] text-teal-muted">
                Belum ada tiket dukungan pada akun Anda.
              </p>
            ) : (
              userTickets.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blush px-4 py-3 text-[13px]"
                >
                  <span className="font-bold text-teal">
                    {t.ticketNumber} • {t.subject}
                  </span>
                  <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-bold text-coral">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <ConfirmModal
        open={Boolean(panelInfoModal)}
        title={panelInfoModal ? `${panelInfoModal.panelLabel} — ${panelInfoModal.domain}` : ''}
        description={
          panelInfoModal
            ? panelInfoModal.panelType === 'cpanel'
              ? `Akses cPanel terenkripsi SSL (port 2083) untuk layanan ${panelInfoModal.name} (${panelInfoModal.domain}) siap dihubungkan ke endpoint provisioning backend Hostuner.`
              : `Akses kontrol KVM Proxmox Virtualizor untuk layanan ${panelInfoModal.name} (${panelInfoModal.domain}) siap dihubungkan ke node Virtualizor Hostuner.`
            : ''
        }
        confirmLabel="Tutup"
        cancelLabel="Buka Panduan KB"
        tone="teal"
        onConfirm={() => setPanelInfoModal(null)}
        onCancel={() => {
          setPanelInfoModal(null)
          navigate('/knowledgebase')
        }}
      />
    </PageShell>
  )
}
