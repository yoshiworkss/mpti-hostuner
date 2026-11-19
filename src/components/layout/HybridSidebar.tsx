import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useHostuner } from '../../context/useHostuner'
import { FigmaIcon, type FigmaIconName } from '../icons/FigmaIcon'

export interface SidebarItemConfig {
  label: string
  to?: string
  onClick?: () => void
  badge?: string | number
  iconName?: FigmaIconName
  active?: boolean
}

interface SidebarCardSectionProps {
  title: string
  items: SidebarItemConfig[]
  defaultOpen?: boolean
}

/**
 * V3 Clean Rounded Card + V4 Heritage Color Palette (#FFEEEE / #FF8383 / #DE3E3E)
 */
export function SidebarCardSection({ title, items, defaultOpen = true }: SidebarCardSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-[16px] border border-salmon-border bg-white p-[16px] shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-[4px] py-[2px] text-left"
      >
        <span className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">{title}</span>
        <FigmaIcon
          name="caret-down-muted"
          size={14}
          className={`text-teal-muted ${open ? 'transition-transform' : '-rotate-90 transition-transform'}`}
        />
      </button>

      {open && (
        <>
          <div className="my-2 h-px w-full bg-border-soft" />
          <div className="flex flex-col gap-[4px] py-[2px]">
            {items.map((item) => {
              const rowClass = item.active
                ? 'flex items-center justify-between gap-2 rounded-[10px] border border-salmon bg-salmon-tint px-[12px] py-[9px] text-[13px] font-semibold text-coral'
                : 'flex items-center justify-between gap-2 rounded-[10px] border border-transparent bg-white px-[12px] py-[9px] text-[13px] font-normal text-teal transition-colors hover:bg-blush hover:text-coral'

              const badgeEl =
                item.badge !== undefined ? (
                  <span
                    className={`rounded-full px-[8px] py-[2px] text-[10px] font-semibold ${
                      item.active ? 'bg-coral text-white' : 'bg-blush text-teal-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : item.iconName ? (
                  <span
                    className={`flex items-center justify-center rounded-full px-[6px] py-[3px] ${
                      item.active ? 'bg-coral text-white' : 'bg-blush text-teal'
                    }`}
                  >
                    <FigmaIcon name={item.iconName} size={13} />
                  </span>
                ) : null

              if (item.to) {
                return (
                  <Link key={item.label} to={item.to} className={rowClass}>
                    <span className="leading-snug">{item.label}</span>
                    {badgeEl}
                  </Link>
                )
              }

              return (
                <button key={item.label} type="button" onClick={item.onClick} className={`w-full text-left ${rowClass}`}>
                  <span className="leading-snug">{item.label}</span>
                  {badgeEl}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function CurrencySwitcherCard() {
  const { currency, setCurrency } = useHostuner()

  return (
    <div className="rounded-[16px] border border-salmon-border bg-white p-[16px] shadow-soft">
      <p className="mb-2.5 text-[11px] font-bold tracking-wide text-teal-muted uppercase">CHOOSE CURRENCY</p>
      <div className="grid grid-cols-2 gap-2.5">
        {(['IDR', 'USD'] as const).map((code) => {
          const active = currency === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setCurrency(code)}
              className={`rounded-[10px] border py-[8px] text-[12px] transition-colors ${
                active
                  ? 'border-salmon bg-salmon-tint font-bold text-coral'
                  : 'border-border-soft bg-blush font-medium text-teal hover:border-salmon'
              }`}
            >
              {code === 'IDR' ? 'IDR (Rp)' : 'USD ($)'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function StoreSidebar({ activeCategorySlug, activeActionSlug }: { activeCategorySlug?: string; activeActionSlug?: string }) {
  const { state } = useHostuner()

  const categoryItems: SidebarItemConfig[] = state.categories.map((cat) => ({
    label: cat.name,
    to: `/store/${cat.slug}`,
    badge: state.products.filter((p) => p.categorySlug === cat.slug).length,
    active: activeCategorySlug === cat.slug,
  }))

  const actionItems: SidebarItemConfig[] = [
    {
      label: 'Register a New Domain',
      to: '/domain/register',
      badge: '→',
      active: activeActionSlug === 'register',
    },
    {
      label: 'Transfer Domain to Us',
      to: '/domain/transfer',
      badge: '→',
      active: activeActionSlug === 'transfer',
    },
    {
      label: 'View Cart',
      to: '/cart',
      iconName: 'cart-teal',
      active: activeActionSlug === 'cart',
    },
  ]

  return (
    <aside aria-label="Sidebar Toko" className="w-full shrink-0 space-y-4 md:w-[250px] lg:w-[290px]">
      <SidebarCardSection title="Categories" items={categoryItems} />
      <SidebarCardSection title="Actions" items={actionItems} />
      <CurrencySwitcherCard />
    </aside>
  )
}

export function SupportSidebar({
  activeSupportKey,
  topCard,
}: {
  activeSupportKey?: string
  topCard?: ReactNode
}) {
  const location = useLocation()
  const p = location.pathname

  const supportItems: SidebarItemConfig[] = [
    {
      label: 'My Support Tickets',
      to: '/tickets',
      iconName: 'tickets',
      active: activeSupportKey === 'tickets' || p === '/tickets',
    },
    {
      label: 'Announcements',
      to: '/announcements',
      iconName: 'announcement',
      active: activeSupportKey === 'announcements' || p.startsWith('/announcements'),
    },
    {
      label: 'Knowledgebase',
      to: '/knowledgebase',
      iconName: 'book-open',
      active: activeSupportKey === 'knowledgebase' || p.startsWith('/knowledgebase'),
    },
    {
      label: 'Downloads',
      to: '/downloads',
      iconName: 'arrow-down-square',
      active: activeSupportKey === 'downloads' || p.startsWith('/downloads'),
    },
    {
      label: 'Network Status',
      to: '/network-status',
      iconName: 'satellite-dish',
      active: activeSupportKey === 'network' || p.startsWith('/network-status'),
    },
    {
      label: 'Open Ticket',
      to: '/tickets/open',
      iconName: 'ticket',
      active: activeSupportKey === 'open-ticket' || p === '/tickets/open',
    },
  ]

  return (
    <aside aria-label="Sidebar Dukungan" className="w-full shrink-0 space-y-4 md:w-[250px] lg:w-[290px]">
      {topCard}
      <SidebarCardSection title="Support" items={supportItems} />
    </aside>
  )
}

export function AdminSidebar() {
  const location = useLocation()
  const p = location.pathname

  const adminModules: SidebarItemConfig[] = [
    { label: 'Overview', to: '/admin', iconName: 'dashboard', active: p === '/admin' },
    { label: 'Log Activity', to: '/admin/logs', iconName: 'file-detail', active: p.startsWith('/admin/logs') },
    { label: 'CRUD Product', to: '/admin/products', iconName: 'spanner', active: p.startsWith('/admin/products') },
    { label: 'CRUD User', to: '/admin/users', iconName: 'user-filled', active: p.startsWith('/admin/users') },
    { label: 'CRUD News & Artikel', to: '/admin/content', iconName: 'announcement', active: p.startsWith('/admin/content') },
    { label: 'Add Payment', to: '/admin/payments', iconName: 'credit-card', active: p.startsWith('/admin/payments') },
  ]

  return (
    <aside aria-label="Sidebar Admin" className="w-full shrink-0 space-y-4 md:w-[250px] lg:w-[290px]">
      <SidebarCardSection title="Admin Control Modules" items={adminModules} />
      <div className="rounded-[16px] border border-salmon-border bg-white p-[16px] shadow-soft">
        <p className="mb-2 text-[11px] font-bold tracking-wide text-teal-muted uppercase">ATURAN AKSES (3 ROLES)</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-charcoal">
          <li>• <strong>Guest (Belum Login):</strong> Browse Katalog, Cari Domain, Baca News/KB.</li>
          <li>• <strong>Client (Sudah Login):</strong> Sapaan Akun Aktif, Checkout Tagihan, Tiket &amp; Layanan.</li>
          <li>• <strong>Admin:</strong> Log Product/User/Payment, CRUD Product/User/News, Add Payment.</li>
        </ul>
      </div>
    </aside>
  )
}
