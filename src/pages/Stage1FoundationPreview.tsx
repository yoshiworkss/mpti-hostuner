import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FigmaIcon, type FigmaIconName } from '../components/icons/FigmaIcon'
import { StoreSidebar, SupportSidebar } from '../components/layout/HybridSidebar'
import { PageShell } from '../components/layout/PageShell'
import {
  BreadcrumbBackBar,
  ConfirmModal,
  FieldError,
  LoadingSkeleton,
  type BreadcrumbSegment,
} from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { calculateBillingBreakdown } from '../services/hostunerApi'

const COLOR_TOKENS = [
  { name: 'Coral CTA', token: 'bg-coral', hex: '#de3e3e', darkText: false },
  { name: 'Coral Hover', token: 'bg-coral-hover', hex: '#c93333', darkText: false },
  { name: 'Salmon Accent', token: 'bg-salmon', hex: '#ff8383', darkText: true },
  { name: 'Salmon Tint', token: 'bg-salmon-tint', hex: '#ffeeee', darkText: true },
  { name: 'Salmon Border', token: 'bg-salmon-border', hex: '#f5d2d1', darkText: true },
  { name: 'Blush Canvas', token: 'bg-blush', hex: '#fff9f8', darkText: true },
  { name: 'Hero Blush', token: 'bg-hero-blush', hex: '#f7e5e3', darkText: true },
  { name: 'Mint Accent', token: 'bg-mint', hex: '#a8eeea', darkText: true },
  { name: 'Mint Strip', token: 'bg-mint-strip', hex: '#e2f8f7', darkText: true },
  { name: 'Deep Teal Ink', token: 'bg-teal', hex: '#2c687b', darkText: false },
  { name: 'Teal Muted', token: 'bg-teal-muted', hex: '#618896', darkText: false },
  { name: 'Charcoal Dark', token: 'bg-charcoal', hex: '#273e47', darkText: false },
  { name: 'Green CTA', token: 'bg-green-cta', hex: '#4caf50', darkText: false },
  { name: 'Green Soft', token: 'bg-green-soft', hex: '#e8f5e9', darkText: true },
  { name: 'Amber Soft', token: 'bg-amber-soft', hex: '#fff4e5', darkText: true },
] as const

const ALL_FIGMA_ICONS: { name: FigmaIconName; darkBg?: boolean }[] = [
  { name: 'announcement' },
  { name: 'arrow-down-square' },
  { name: 'at' },
  { name: 'book-open' },
  { name: 'caret-down' },
  { name: 'caret-down-muted' },
  { name: 'caret-down-white', darkBg: true },
  { name: 'caret-left' },
  { name: 'caret-right' },
  { name: 'caret-up' },
  { name: 'cart' },
  { name: 'cart-teal' },
  { name: 'credit-card' },
  { name: 'credit-card-white', darkBg: true },
  { name: 'dashboard' },
  { name: 'desktop' },
  { name: 'desktop-white', darkBg: true },
  { name: 'envelope' },
  { name: 'envelope-white', darkBg: true },
  { name: 'file-detail' },
  { name: 'folder-open' },
  { name: 'globe' },
  { name: 'globe-teal' },
  { name: 'globe-white', darkBg: true },
  { name: 'lock' },
  { name: 'phone' },
  { name: 'satellite-dish' },
  { name: 'search' },
  { name: 'spanner' },
  { name: 'star-filled' },
  { name: 'ticket' },
  { name: 'tickets' },
  { name: 'user-filled' },
]

const WBS_ROADMAP = [
  {
    step: 'Tahap 1 (WBS 2.12)',
    title: 'Project Foundation, Design Tokens, Boxicons SVGs, Service Adapter & Layout Shell',
    status: 'Aktif Diverifikasi',
    active: true,
  },
  {
    step: 'Tahap 2 (WBS 2.13)',
    title: 'Public Home, Search Results, Store 9 Categories, Product Configurator & Domain Flow',
    status: 'Berikutnya',
    active: false,
  },
  {
    step: 'Tahap 3 (WBS 2.14)',
    title: 'Cart, Checkout Breakdown (PPN + Kode Unik Rp 128), Invoice & Captcha Auth Flow',
    status: 'Terjadwal',
    active: false,
  },
  {
    step: 'Tahap 4 (WBS 2.15)',
    title: 'Client Area Dashboard, Support Hub, Breadcrumb Path, KB, Downloads & Network Status',
    status: 'Terjadwal',
    active: false,
  },
  {
    step: 'Tahap 5 (WBS 2.16–2.17)',
    title: 'Admin Dashboard 6 Modules (Overview, Logs, CRUD Product/User/News, Add Payment) & QA Audit',
    status: 'Terjadwal',
    active: false,
  },
] as const

/**
 * Stage 1 interactive verification workbench rendered at `/`.
 * Allows visual & functional QA of all WBS 2.12 foundation pieces inside the real shell.
 */
export function Stage1FoundationPreview() {
  const {
    state,
    currentUser,
    role,
    language,
    currency,
    setCurrency,
    includePpn11,
    setIncludePpn11,
    formatPrice,
    showToast,
    loginAsDemoCustomer,
    loginAsDemoAdmin,
    logoutUser,
    resetDemoData,
  } = useHostuner()

  const [skeletonMode, setSkeletonMode] = useState<'none' | 'cards' | 'list' | 'table'>('none')
  const [sampleDomainInput, setSampleDomainInput] = useState('')
  const [sampleDomainError, setSampleDomainError] = useState<string | undefined>(undefined)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [sampleModalOpen, setSampleModalOpen] = useState(false)

  const sampleBreakdown = calculateBillingBreakdown(
    [
      {
        id: 'sample-pemula',
        type: 'hosting_domain',
        productId: 1,
        productName: 'Pemula (Shared Hosting IIX)',
        domainName: 'contoh-bisnis.id',
        domainPriceIdr: 0,
        billingCycle: 'monthly',
        unitPriceIdr: 25000,
        subtotalIdr: 25000,
        isFreeDomainApplied: false,
      },
    ],
    includePpn11,
    128
  )

  function handleValidateSample(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = sampleDomainInput.trim()
    if (!trimmed) {
      setSampleDomainError('Nama domain wajib diisi untuk verifikasi validasi inline (NFR-02).')
      return
    }
    if (!trimmed.includes('.')) {
      setSampleDomainError('Format domain harus menyertakan ekstensi, contoh: hostuner.id.')
      return
    }
    setSampleDomainError(undefined)
    showToast(`Validasi sukses untuk domain "${trimmed}"!`, 'success')
  }

  return (
    <PageShell sidebar={<StoreSidebar activeCategorySlug="hosting-iix" />}>
      <BreadcrumbBackBar
        backTo="/store/hosting-iix"
        backLabel="← Preview Store Shell"
        segments={[
          { label: 'Home', to: '/' },
          { label: 'Tahap 1 (WBS 2.12)', to: '/' },
          { label: 'Foundation & Layout Shell QA' },
        ]}
      />

      {/* Tahap 1 Status & Role Switcher Card */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[540px] space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-salmon-tint px-3 py-1 text-[11px] font-bold tracking-wide text-coral uppercase">
              Tahap 1 Aktif • WBS 2.12
            </span>
            <h1 className="text-[24px] font-bold leading-snug text-teal">
              Hostuner&apos;25 Frontend Foundation &amp; Layout Shell
            </h1>
            <p className="text-[13px] leading-relaxed text-teal-muted">
              Tahap 1 memvalidasi design tokens solid Figma <strong>Page FIX V6</strong>, 33 aset SVG Boxicons lokal,
              Service Adapter Layer (<code className="rounded bg-blush px-1.5 py-0.5 text-coral">localStorage</code> +{' '}
              <code className="rounded bg-blush px-1.5 py-0.5 text-coral">seedData</code>), serta shell responsif
              untuk <strong>Guest</strong>, <strong>Client</strong>, dan <strong>Admin Portal</strong>.
            </p>
          </div>

          <div className="rounded-[14px] border border-border-soft bg-blush px-4 py-3 text-[12px]">
            <p className="font-bold text-teal">Live App Context</p>
            <p className="mt-1 text-teal-muted">
              Role: <strong className="text-coral uppercase">{role}</strong>
            </p>
            <p className="text-teal-muted">
              Akun: <strong className="text-charcoal">{currentUser ? currentUser.name : 'Pengunjung Guest'}</strong>
            </p>
            <p className="text-teal-muted">
              Bahasa / Mata Uang: <strong className="text-charcoal">{language}</strong> •{' '}
              <strong className="text-charcoal">{currency}</strong>
            </p>
          </div>
        </div>

        {/* Interactive Role Switcher & Currency/Tax Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-[16px] border border-border-soft bg-blush p-4">
            <p className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">
              Uji State Role Header (3 Roles SRS)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  logoutUser()
                }}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
                  role === 'guest'
                    ? 'bg-coral text-white'
                    : 'border border-border-soft bg-white text-teal hover:border-salmon'
                }`}
              >
                Guest Mode
              </button>
              <button
                type="button"
                onClick={loginAsDemoCustomer}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
                  role === 'customer'
                    ? 'bg-coral text-white'
                    : 'border border-border-soft bg-white text-teal hover:border-salmon'
                }`}
              >
                Client: Budi Santoso
              </button>
              <button
                type="button"
                onClick={loginAsDemoAdmin}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
                  role === 'admin'
                    ? 'bg-teal text-white'
                    : 'border border-border-soft bg-white text-teal hover:border-teal'
                }`}
              >
                Admin: Superadmin
              </button>
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 rounded-full bg-green-cta px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                >
                  Uji Admin Portal Shell →
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[16px] border border-border-soft bg-blush p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold tracking-wide text-teal-muted uppercase">
                Simulasi Mata Uang, PPN &amp; Seed Storage
              </p>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="text-[11px] font-semibold text-coral hover:underline"
              >
                Reset Demo Data
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrency(currency === 'IDR' ? 'USD' : 'IDR')}
                className="rounded-full border border-salmon-border bg-white px-3.5 py-1.5 text-[12px] font-semibold text-teal hover:border-salmon"
              >
                Kurs Aktif: {currency === 'IDR' ? 'IDR (Rp)' : 'USD ($)'} ⇄
              </button>
              <button
                type="button"
                onClick={() => setIncludePpn11(!includePpn11)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  includePpn11 ? 'bg-teal text-white' : 'border border-border-soft bg-white text-teal'
                }`}
              >
                PPN: {includePpn11 ? '11% (Keputusan A2)' : '0% (Figma Default)'}
              </button>
            </div>
            <p className="mt-2.5 text-[12px] text-charcoal">
              Contoh Paket Pemula IIX: <strong>{formatPrice(sampleBreakdown.subtotalIdr)}</strong> + PPN{' '}
              <strong>{formatPrice(sampleBreakdown.taxAmountIdr)}</strong> + Kode Unik{' '}
              <strong>{formatPrice(sampleBreakdown.uniqueVerificationCodeIdr)}</strong> ={' '}
              <strong className="text-coral">{formatPrice(sampleBreakdown.totalDueIdr)}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Design Tokens Swatch Strip */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-teal">Design Tokens — Solid Palette (Zero Gradients / Neon)</h2>
            <p className="text-[12px] text-teal-muted">
              15 warna solid V4/V6 dari <code className="text-coral">src/index.css</code> &amp; tipografi{' '}
              <strong>Inter</strong>.
            </p>
          </div>
          <span className="rounded-full bg-mint-strip px-3 py-1 text-[11px] font-semibold text-teal">
            {state.categories.length} Kategori • {state.products.length} Produk Seed
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {COLOR_TOKENS.map((item) => (
            <div key={item.token} className="overflow-hidden rounded-[12px] border border-border-soft bg-white">
              <div
                className={`flex h-12 items-end px-2.5 py-1.5 text-[11px] font-bold ${item.token} ${
                  item.darkText ? 'text-charcoal' : 'text-white'
                }`}
              >
                {item.hex}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[12px] font-semibold text-teal">{item.name}</p>
                <p className="text-[10px] text-teal-muted">{item.token}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NFR-02 UX States Interactive Tester */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 className="text-[18px] font-bold text-teal">Uji Komponen UX States (SRS NFR-02)</h2>
        <p className="mt-1 text-[12px] text-teal-muted">
          Verifikasi Loading Skeleton (Card/List/Table), Inline Validation Error, Confirm Modal, dan Toast Stack.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['none', 'cards', 'list', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSkeletonMode(mode)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                skeletonMode === mode
                  ? 'bg-coral text-white'
                  : 'border border-border-soft bg-blush text-teal hover:border-salmon'
              }`}
            >
              {mode === 'none' ? 'Sembunyikan Skeleton' : `Skeleton: ${mode}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSampleModalOpen(true)}
            className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Buka ConfirmModal
          </button>
          <button
            type="button"
            onClick={() => showToast('Notifikasi sukses dari ToastStack Hostuner!', 'success')}
            className="rounded-full bg-green-cta px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
          >
            Toast Sukses
          </button>
          <button
            type="button"
            onClick={() => showToast('Simulasi peringatan validasi atau stok (error toast).', 'error')}
            className="rounded-full border border-coral bg-salmon-tint px-4 py-1.5 text-[12px] font-semibold text-coral"
          >
            Toast Error
          </button>
        </div>

        {skeletonMode !== 'none' && (
          <div className="mt-4 rounded-[16px] border border-dashed border-salmon-border bg-blush p-4">
            <LoadingSkeleton variant={skeletonMode} count={skeletonMode === 'cards' ? 2 : 3} />
          </div>
        )}

        <form onSubmit={handleValidateSample} className="mt-5 rounded-[16px] border border-border-soft bg-blush p-4">
          <label htmlFor="stage1-domain-test" className="block text-[12px] font-semibold text-teal">
            Uji Validasi Input Inline (<code className="text-coral">FieldError</code>)
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="stage1-domain-test"
              type="text"
              value={sampleDomainInput}
              onChange={(e) => {
                setSampleDomainInput(e.target.value)
                if (sampleDomainError) setSampleDomainError(undefined)
              }}
              placeholder="Contoh: hostuner.id (kosongkan lalu klik Cek untuk tes error)"
              className="flex-1 rounded-[12px] border border-border-soft bg-white px-4 py-2 text-[13px] text-charcoal placeholder:text-teal-muted"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-cta px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              <FigmaIcon name="search" size={14} />
              <span>Cek Validasi</span>
            </button>
          </div>
          <FieldError message={sampleDomainError} />
        </form>
      </section>

      {/* 33 Local Boxicons SVG Asset Grid */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-teal">33 Aset SVG Boxicons Lokal (Figma Page FIX V6)</h2>
            <p className="text-[12px] text-teal-muted">
              Diimpor langsung dari <code className="text-coral">src/assets/icons/*.svg</code> tanpa substitusi emoji
              atau URL kadaluarsa Figma.
            </p>
          </div>
          <span className="rounded-full bg-green-soft px-3 py-1 text-[11px] font-bold text-green-cta">
            33 / 33 Terverifikasi
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {ALL_FIGMA_ICONS.map((icon) => (
            <div
              key={icon.name}
              className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-border-soft bg-blush p-3 text-center"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
                  icon.darkBg ? 'bg-coral text-white' : 'border border-border-soft bg-white text-teal'
                }`}
              >
                <FigmaIcon
                  name={icon.name}
                  size={18}
                  className={icon.name === 'caret-down-muted' ? 'text-teal-muted' : ''}
                />
              </div>
              <span className="text-[11px] font-medium text-charcoal">{icon.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* WBS 2.12–2.17 Roadmap Checklist */}
      <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 className="text-[18px] font-bold text-teal">Roadmap Eksekusi Bertahap (Novendra — Front-end WBS)</h2>
        <div className="mt-4 space-y-2.5">
          {WBS_ROADMAP.map((item) => (
            <div
              key={item.step}
              className={`flex flex-col justify-between gap-3 rounded-[14px] border px-4 py-3 sm:flex-row sm:items-center ${
                item.active ? 'border-salmon bg-salmon-tint/60' : 'border-border-soft bg-blush'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-coral">{item.step}</p>
                <p className="text-[13px] font-medium text-teal">{item.title}</p>
              </div>
              <span
                className={`w-fit shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                  item.active ? 'bg-coral text-white' : 'bg-white text-teal-muted'
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <ConfirmModal
        open={sampleModalOpen}
        title="Verifikasi ConfirmModal Tahap 1"
        description="Komponen dialog aksesibel ini digunakan untuk konfirmasi penghapusan item keranjang, konfirmasi pembayaran, dan aksi CRUD Admin di Tahap 2–5."
        confirmLabel="Mantap, Tutup"
        cancelLabel="Batal"
        tone="teal"
        onConfirm={() => {
          setSampleModalOpen(false)
          showToast('ConfirmModal berfungsi normal.', 'info')
        }}
        onCancel={() => setSampleModalOpen(false)}
      />

      <ConfirmModal
        open={resetModalOpen}
        title="Reset Data Demo ke Seed Awal?"
        description="Aksi ini akan mengembalikan keranjang, invoice, produk, dan session user ke state seed awal Hostuner-25."
        confirmLabel="Ya, Reset Seed Data"
        cancelLabel="Batal"
        tone="coral"
        onConfirm={() => {
          resetDemoData()
          setResetModalOpen(false)
        }}
        onCancel={() => setResetModalOpen(false)}
      />
    </PageShell>
  )
}

interface StagePlaceholderPageProps {
  title: string
  stageLabel: string
  description: string
  breadcrumbs: BreadcrumbSegment[]
  backTo?: string
  sidebarType?: 'store' | 'support' | 'none'
  mode?: 'public' | 'admin'
  activeCategorySlug?: string
  activeActionSlug?: string
  activeSupportKey?: string
}

/**
 * Clean interactive placeholder for Tahap 2–5 routes so every link in the Tahap 1 shell
 * navigates cleanly without 404 or dead ends while testing the layout architecture.
 */
export function StagePlaceholderPage({
  title,
  stageLabel,
  description,
  breadcrumbs,
  backTo = '/',
  sidebarType = 'none',
  mode = 'public',
  activeCategorySlug,
  activeActionSlug,
  activeSupportKey,
}: StagePlaceholderPageProps) {
  const params = useParams<{ slug?: string; category?: string; invoiceNumber?: string }>()
  const { role, loginAsDemoAdmin } = useHostuner()

  const resolvedCategorySlug = activeCategorySlug ?? params.slug
  const resolvedTitle = params.slug
    ? `${title}: ${params.slug}`
    : params.category
      ? `${title}: ${params.category}`
      : params.invoiceNumber
        ? `${title}: ${params.invoiceNumber}`
        : title

  const sidebar =
    sidebarType === 'store' ? (
      <StoreSidebar activeCategorySlug={resolvedCategorySlug} activeActionSlug={activeActionSlug} />
    ) : sidebarType === 'support' ? (
      <SupportSidebar activeSupportKey={activeSupportKey} />
    ) : undefined

  return (
    <PageShell mode={mode} sidebar={sidebar}>
      <BreadcrumbBackBar backTo={backTo} backLabel="← Back" segments={breadcrumbs} />

      {mode === 'admin' && role !== 'admin' ? (
        <section className="rounded-[20px] border border-salmon bg-white p-6 shadow-soft">
          <span className="inline-flex rounded-full bg-salmon-tint px-3 py-1 text-[11px] font-bold text-coral uppercase">
            Akses Terbatas • Role Admin Diperlukan
          </span>
          <h1 className="mt-3 text-[22px] font-bold text-teal">Masuk sebagai Admin untuk Uji Portal Admin</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
            Sesuai aturan 3 Roles SRS, modul Back-Office Admin (Overview, Log Activity, CRUD Product, CRUD User, CRUD
            News &amp; Artikel, Add Payment) hanya aktif saat sesi berstatus <strong>Admin</strong>.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loginAsDemoAdmin}
              className="rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              Aktifkan Sesi Demo Admin
            </button>
            <Link
              to="/"
              className="rounded-full border border-border-soft bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
            >
              ← Kembali ke Beranda Shell
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-strip px-3 py-1 text-[11px] font-bold tracking-wide text-teal uppercase">
            {stageLabel} • Shell Terhubung
          </span>
          <h1 className="mt-3 text-[24px] font-bold text-teal">{resolvedTitle}</h1>
          <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-teal-muted">{description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
            >
              ← Kembali ke Tahap 1 Shell QA
            </Link>
            <Link
              to="/store/hosting-iix"
              className="rounded-full border border-salmon-border bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
            >
              Uji Store Sidebar
            </Link>
            <Link
              to="/knowledgebase"
              className="rounded-full border border-salmon-border bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
            >
              Uji Support Sidebar
            </Link>
          </div>
        </section>
      )}
    </PageShell>
  )
}
