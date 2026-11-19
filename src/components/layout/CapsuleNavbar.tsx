import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useHostuner } from '../../context/useHostuner'
import { FigmaIcon } from '../icons/FigmaIcon'

export function CapsuleNavbar() {
  const { state, role, logoutUser } = useHostuner()
  const [activeOverlay, setActiveOverlay] = useState<{
    kind: 'store' | 'account' | 'mobile'
    path: string
  } | null>(null)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const storeOpen = activeOverlay?.kind === 'store' && activeOverlay.path === location.pathname
  const accountOpen = activeOverlay?.kind === 'account' && activeOverlay.path === location.pathname
  const mobileMenuOpen = activeOverlay?.kind === 'mobile' && activeOverlay.path === location.pathname

  function toggleOverlay(kind: 'store' | 'account' | 'mobile') {
    setActiveOverlay((prev) =>
      prev && prev.kind === kind && prev.path === location.pathname
        ? null
        : { kind, path: location.pathname }
    )
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveOverlay(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const p = location.pathname
  const isHome = p === '/'
  const isStore = p.startsWith('/store') || p.startsWith('/domain') || p.startsWith('/order') || p === '/cart' || p.startsWith('/checkout')
  const isAnnouncements = p.startsWith('/announcements')
  const isKnowledgebase = p.startsWith('/knowledgebase')
  const isNetwork = p.startsWith('/network-status')
  const isAffiliates = p.startsWith('/affiliates')
  const isContact = p.startsWith('/contact')
  const isAccount = p.startsWith('/login') || p.startsWith('/register') || p.startsWith('/password-reset') || p.startsWith('/client') || p.startsWith('/tickets')

  const pillClass = (active: boolean) =>
    active
      ? 'inline-flex items-center gap-[5px] rounded-full bg-white px-[14px] py-[6px] text-[13px] font-semibold text-coral shadow-xs whitespace-nowrap'
      : 'inline-flex items-center gap-[5px] rounded-full px-[10px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-white/15 whitespace-nowrap'

  function getCategoryCount(slug: string): number {
    return state.products.filter((pr) => pr.categorySlug === slug).length
  }

  return (
    <div ref={navContainerRef} className="relative">
      {/* Desktop Floating Red Capsule Navbar (matches Figma 2309:6013) */}
      <nav
        aria-label="Navigasi Utama"
        className="flex h-[54px] items-center justify-between rounded-[16px] bg-coral px-[16px] py-[10px] shadow-soft md:px-[24px]"
      >
        <div className="hidden w-full items-center justify-between md:flex">
          <Link to="/" className={pillClass(isHome)}>
            Home
          </Link>

          <button
            type="button"
            aria-expanded={storeOpen}
            onClick={() => toggleOverlay('store')}
            className={pillClass(isStore || storeOpen)}
          >
            <span>Store</span>
            <FigmaIcon
              name={isStore || storeOpen ? 'caret-down' : 'caret-down-white'}
              size={14}
              className={storeOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>

          <Link to="/announcements" className={pillClass(isAnnouncements)}>
            Announcements
          </Link>

          <Link to="/knowledgebase" className={pillClass(isKnowledgebase)}>
            Knowledgebase
          </Link>

          <Link to="/network-status" className={pillClass(isNetwork)}>
            Network Status
          </Link>

          <Link to="/affiliates" className={pillClass(isAffiliates)}>
            Affiliates
          </Link>

          <Link to="/contact" className={pillClass(isContact)}>
            Contact Us
          </Link>

          <div className="relative">
            <button
              type="button"
              aria-expanded={accountOpen}
              onClick={() => toggleOverlay('account')}
              className={pillClass(isAccount || accountOpen)}
            >
              <span>Account</span>
              <FigmaIcon
                name={isAccount || accountOpen ? 'caret-down' : 'caret-down-white'}
                size={14}
                className={accountOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
            </button>

            {accountOpen && (
              <div className="absolute right-0 z-50 mt-3 w-56 rounded-[16px] border border-salmon-border bg-white p-2 shadow-soft">
                {role === 'guest' ? (
                  <>
                    <Link
                      to="/login"
                      className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-teal hover:bg-salmon-tint hover:text-coral"
                    >
                      Login Client / Admin
                    </Link>
                    <Link
                      to="/register"
                      className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-teal hover:bg-salmon-tint hover:text-coral"
                    >
                      Register Akun Baru
                    </Link>
                    <Link
                      to="/password-reset"
                      className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-teal-muted hover:bg-blush hover:text-coral"
                    >
                      Forgot Password?
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/client"
                      className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-teal hover:bg-salmon-tint hover:text-coral"
                    >
                      Client Area Dashboard
                    </Link>
                    <Link
                      to="/tickets"
                      className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-teal hover:bg-salmon-tint hover:text-coral"
                    >
                      My Support Tickets
                    </Link>
                    {role === 'admin' && (
                      <Link
                        to="/admin"
                        className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-coral hover:bg-salmon-tint"
                      >
                        🛡️ Buka Admin Portal
                      </Link>
                    )}
                    <div className="my-1 h-px bg-border-soft" />
                    <button
                      type="button"
                      onClick={() => {
                        logoutUser()
                        setActiveOverlay(null)
                        navigate('/')
                      }}
                      className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold text-coral hover:bg-salmon-tint"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Capsule Controls (< 768px) */}
        <div className="flex w-full items-center justify-between md:hidden">
          <Link to="/" className="text-[14px] font-bold text-white">
            Portal Hostuner
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/store/hosting-iix"
              className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-coral"
            >
              Store
            </Link>
            <button
              type="button"
              onClick={() => toggleOverlay('mobile')}
              aria-expanded={mobileMenuOpen}
              aria-label="Buka menu navigasi"
              className="rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              {mobileMenuOpen ? 'Tutup ✕' : 'Menu ☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Store Mega-Menu Dropdown Overlay (matches Figma Frame 02 / 2309:3875) */}
      {storeOpen && (
        <div className="absolute left-0 right-0 z-50 mt-3 rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-teal">
              Store Categories ({state.categories.length}) &amp; Domain Actions
            </h2>
            <Link
              to="/store/hosting-iix"
              className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              <FigmaIcon name="search" size={14} />
              <span>Browse All (Hosting IIX)</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.categories.map((cat) => {
              const count = getCategoryCount(cat.slug)
              const activeCat = p === `/store/${cat.slug}`
              return (
                <Link
                  key={cat.id}
                  to={`/store/${cat.slug}`}
                  className={`flex items-center justify-between rounded-[12px] border px-4 py-2.5 text-[13px] transition-colors ${
                    activeCat
                      ? 'border-salmon bg-salmon-tint font-bold text-coral'
                      : 'border-border-soft bg-blush font-medium text-teal hover:border-salmon hover:bg-salmon-tint/50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-muted">
                    {count}
                  </span>
                </Link>
              )
            })}

            <Link
              to="/domain/register"
              className="flex items-center justify-between rounded-[12px] border border-border-soft bg-mint-strip/60 px-4 py-2.5 text-[13px] font-semibold text-teal hover:border-teal"
            >
              <span>Register a New Domain</span>
              <span>→</span>
            </Link>
            <Link
              to="/domain/transfer"
              className="flex items-center justify-between rounded-[12px] border border-border-soft bg-mint-strip/60 px-4 py-2.5 text-[13px] font-semibold text-teal hover:border-teal"
            >
              <span>Transfer Domains to Us</span>
              <span>→</span>
            </Link>
            <Link
              to="/cart"
              className="flex items-center justify-between rounded-[12px] border border-border-soft bg-mint-strip/60 px-4 py-2.5 text-[13px] font-semibold text-teal hover:border-teal"
            >
              <span>View Shopping Cart ({state.cart.length})</span>
              <FigmaIcon name="cart-teal" size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mt-2 space-y-2 rounded-[16px] border border-salmon-border bg-white p-4 shadow-soft md:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-semibold text-teal">
              Home
            </Link>
            <Link to="/store/hosting-iix" className="rounded-[10px] bg-salmon-tint px-3 py-2 text-[13px] font-semibold text-coral">
              Store (9 Kategori)
            </Link>
            <Link to="/domain/register" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Cek Domain
            </Link>
            <Link to="/announcements" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Announcements
            </Link>
            <Link to="/knowledgebase" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Knowledgebase
            </Link>
            <Link to="/downloads" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Downloads
            </Link>
            <Link to="/network-status" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Network Status
            </Link>
            <Link to="/affiliates" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Affiliates
            </Link>
            <Link to="/contact" className="rounded-[10px] bg-blush px-3 py-2 text-[13px] font-medium text-teal">
              Contact Us
            </Link>
            <Link to={role === 'admin' ? '/admin' : role === 'customer' ? '/client' : '/login'} className="rounded-[10px] bg-mint-strip px-3 py-2 text-[13px] font-semibold text-teal">
              {role === 'admin' ? 'Admin Portal' : role === 'customer' ? 'Client Area' : 'Login / Register'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminCapsuleNavbar() {
  const location = useLocation()
  const p = location.pathname

  const adminNavItems = [
    { label: 'Overview', to: '/admin', match: (x: string) => x === '/admin' },
    { label: 'Log Activity', to: '/admin/logs', match: (x: string) => x.startsWith('/admin/logs') },
    { label: 'CRUD Product', to: '/admin/products', match: (x: string) => x.startsWith('/admin/products') },
    { label: 'CRUD User', to: '/admin/users', match: (x: string) => x.startsWith('/admin/users') },
    { label: 'CRUD News & Artikel', to: '/admin/content', match: (x: string) => x.startsWith('/admin/content') },
    { label: 'Add Payment', to: '/admin/payments', match: (x: string) => x.startsWith('/admin/payments') },
  ]

  return (
    <nav
      aria-label="Navigasi Admin Portal"
      className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] bg-teal px-[16px] py-[10px] shadow-soft md:px-[24px]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {adminNavItems.map((item) => {
          const active = item.match(p)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                active
                  ? 'rounded-full bg-white px-[14px] py-[6px] text-[13px] font-semibold text-teal'
                  : 'rounded-full px-[10px] py-[6px] text-[13px] font-medium text-white hover:bg-white/15'
              }
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-full bg-coral px-[12px] py-[5px] text-[12px] font-semibold text-white transition-colors hover:bg-coral-hover"
      >
        <FigmaIcon name="globe-white" size={14} />
        <span>Live Store →</span>
      </Link>
    </nav>
  )
}
