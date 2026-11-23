import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AdminAccessGuard } from '../components/admin/AdminAccessGuard'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { ConfirmModal, FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import type { BillingCycle, HostingProduct, UserAccount } from '../types/hostuner'

function buildSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface ProductFormState {
  id?: number
  name: string
  categorySlug: string
  priceMonthly: string
  priceAnnual: string
  displayCycle: BillingCycle
  diskSpace: string
  bandwidth: string
  specsText: string
  stockLabel: string
  isFreeDomain: boolean
  isFeatured: boolean
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  categorySlug: 'hosting-iix',
  priceMonthly: '',
  priceAnnual: '',
  displayCycle: 'monthly',
  diskSpace: '',
  bandwidth: 'Unmetered',
  specsText: '',
  stockLabel: '',
  isFreeDomain: false,
  isFeatured: false,
}

/**
 * Figma V6 Screen 42 — CRUD Product (`/admin/products`, UC-05)
 */
export function AdminProductsPage() {
  const { state, formatPrice, saveProduct, deleteProduct } = useHostuner()
  const formRef = useRef<HTMLFormElement>(null)

  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [productToDelete, setProductToDelete] = useState<HostingProduct | null>(null)

  const isEditing = Boolean(form.id)

  function handleEditProduct(product: HostingProduct) {
    setForm({
      id: product.id,
      name: product.name,
      categorySlug: product.categorySlug,
      priceMonthly: String(product.priceMonthly),
      priceAnnual: String(product.priceAnnual),
      displayCycle: product.displayCycle,
      diskSpace: product.diskSpace,
      bandwidth: product.bandwidth,
      specsText: product.specs.join(', '),
      stockLabel: product.stockLabel ?? '',
      isFreeDomain: product.isFreeDomain,
      isFeatured: product.isFeatured,
    })
    setErrors({})
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleResetForm() {
    setForm(EMPTY_PRODUCT_FORM)
    setErrors({})
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const nextErrors: Record<string, string> = {}

    const monthlyNum = Number(form.priceMonthly)
    const annualNum = Number(form.priceAnnual)
    const parsedSpecs = form.specsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (form.name.trim().length < 3) {
      nextErrors.name = 'Nama paket minimal 3 karakter.'
    }
    if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) {
      nextErrors.priceMonthly = 'Harga bulanan harus angka lebih dari 0.'
    }
    if (!Number.isFinite(annualNum) || annualNum <= 0) {
      nextErrors.priceAnnual = 'Harga tahunan harus angka lebih dari 0.'
    }
    if (!form.diskSpace.trim()) {
      nextErrors.diskSpace = 'Kapasitas disk space wajib diisi.'
    }
    if (!form.bandwidth.trim()) {
      nextErrors.bandwidth = 'Spesifikasi bandwidth wajib diisi.'
    }
    if (parsedSpecs.length === 0) {
      nextErrors.specsText = 'Masukkan minimal 1 poin spesifikasi (pisahkan dengan koma).'
    }

    const matchedCategory = state.categories.find((c) => c.slug === form.categorySlug) ?? state.categories[0]
    if (!matchedCategory) {
      nextErrors.categorySlug = 'Kategori produk wajib dipilih.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await saveProduct({
        id: form.id,
        categoryId: matchedCategory.id,
        categorySlug: matchedCategory.slug,
        name: form.name.trim(),
        slug: buildSlug(form.name),
        priceMonthly: Math.round(monthlyNum),
        priceAnnual: Math.round(annualNum),
        displayCycle: form.displayCycle,
        diskSpace: form.diskSpace.trim(),
        bandwidth: form.bandwidth.trim(),
        specs: parsedSpecs,
        isFreeDomain: form.isFreeDomain,
        stockLabel: form.stockLabel.trim() || undefined,
        isFeatured: form.isFeatured,
      })

      if (res.success) {
        handleResetForm()
      } else if (res.errors) {
        setErrors(res.errors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredProducts = state.products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.categorySlug === categoryFilter
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.categorySlug.toLowerCase().includes(q) ||
      p.diskSpace.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  function getCategoryName(slug: string): string {
    return state.categories.find((c) => c.slug === slug)?.name ?? slug
  }

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'CRUD Product' }]}
      backTo="/admin"
      returnPath="/admin/products"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            CRUD Product — Kelola Paket Hosting &amp; VPS
          </h1>
          <p className="text-[13px] text-teal-muted">
            Perubahan paket yang Anda simpan akan langsung tampil pada halaman katalog Store dan dicatat otomatis pada Log Product.
          </p>
        </header>

        {/* Create / Update Form Card (Matches Figma 42) */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                {isEditing ? `Edit Produk Layanan: ${form.name}` : '+ Tambah / Edit Produk Layanan (Create & Update)'}
              </h2>
              <p className="text-[12px] text-teal-muted">
                Lengkapi informasi paket untuk menambahkan produk baru atau memperbarui produk yang dipilih.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded-full border border-salmon bg-salmon-tint px-4 py-1.5 text-[12px] font-semibold text-coral hover:bg-coral hover:text-white"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="prod-name" className="block text-[12px] font-semibold text-teal">
                Nama Paket Produk *
              </label>
              <input
                id="prod-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Hosting Bisnis IIX Pro"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.name} />
            </div>

            <div>
              <label htmlFor="prod-cat" className="block text-[12px] font-semibold text-teal">
                Kategori Store ({state.categories.length} Kategori) *
              </label>
              <select
                id="prod-cat"
                value={form.categorySlug}
                onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              >
                {state.categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.categorySlug} />
            </div>

            <div>
              <label htmlFor="prod-monthly" className="block text-[12px] font-semibold text-teal">
                Harga Bulanan (IDR) *
              </label>
              <input
                id="prod-monthly"
                type="number"
                min={1000}
                step={1000}
                value={form.priceMonthly}
                onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
                placeholder="Contoh: 45000"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.priceMonthly} />
            </div>

            <div>
              <label htmlFor="prod-annual" className="block text-[12px] font-semibold text-teal">
                Harga Tahunan (IDR) *
              </label>
              <input
                id="prod-annual"
                type="number"
                min={1000}
                step={1000}
                value={form.priceAnnual}
                onChange={(e) => setForm((f) => ({ ...f, priceAnnual: e.target.value }))}
                placeholder="Contoh: 450000"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.priceAnnual} />
            </div>

            <div>
              <label htmlFor="prod-disk" className="block text-[12px] font-semibold text-teal">
                Kapasitas Disk Space *
              </label>
              <input
                id="prod-disk"
                type="text"
                value={form.diskSpace}
                onChange={(e) => setForm((f) => ({ ...f, diskSpace: e.target.value }))}
                placeholder="Contoh: 1 GB NVMe SSD"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.diskSpace} />
            </div>

            <div>
              <label htmlFor="prod-bw" className="block text-[12px] font-semibold text-teal">
                Bandwidth *
              </label>
              <input
                id="prod-bw"
                type="text"
                value={form.bandwidth}
                onChange={(e) => setForm((f) => ({ ...f, bandwidth: e.target.value }))}
                placeholder="Contoh: Unmetered Bandwidth"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.bandwidth} />
            </div>

            <div>
              <label htmlFor="prod-cycle" className="block text-[12px] font-semibold text-teal">
                Siklus Harga Utama pada Kartu Store
              </label>
              <select
                id="prod-cycle"
                value={form.displayCycle}
                onChange={(e) => setForm((f) => ({ ...f, displayCycle: e.target.value as BillingCycle }))}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              >
                <option value="monthly">Bulanan (Monthly)</option>
                <option value="annually">Tahunan (Annually)</option>
              </select>
            </div>

            <div>
              <label htmlFor="prod-stock" className="block text-[12px] font-semibold text-teal">
                Label Stok (Opsional)
              </label>
              <input
                id="prod-stock"
                type="text"
                value={form.stockLabel}
                onChange={(e) => setForm((f) => ({ ...f, stockLabel: e.target.value }))}
                placeholder="Contoh: 59 Available"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="prod-specs" className="block text-[12px] font-semibold text-teal">
                Spesifikasi Utama (pisahkan dengan koma) *
              </label>
              <input
                id="prod-specs"
                type="text"
                value={form.specsText}
                onChange={(e) => setForm((f) => ({ ...f, specsText: e.target.value }))}
                placeholder="Contoh: 1 GB NVMe SSD, Unmetered Bandwidth, Free SSL Let's Encrypt, cPanel Control Panel"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.specsText} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-charcoal">
              <input
                type="checkbox"
                checked={form.isFreeDomain}
                onChange={(e) => setForm((f) => ({ ...f, isFreeDomain: e.target.checked }))}
                className="h-4 w-4 accent-coral"
              />
              <span>Gratis Domain (Siklus Tahunan)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-charcoal">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                className="h-4 w-4 accent-coral"
              />
              <span>Tampilkan sebagai Produk Unggulan</span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              {isEditing ? 'Simpan Perubahan Produk' : '+ Simpan Produk Baru'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded-full border border-border-soft bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* Product Catalog Table / List Card (Read, Update & Delete) */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                Daftar Produk Aktif ({filteredProducts.length} / {state.products.length})
              </h2>
              <p className="text-[12px] text-teal-muted">
                Klik Edit untuk memuat data ke formulir, atau Hapus untuk mencabut paket dari etalase Store.
              </p>
            </div>
            <div className="relative w-full md:w-64">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-teal-muted">
                <FigmaIcon name="search" size={14} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari paket produk..."
                aria-label="Cari paket produk"
                className="w-full rounded-[10px] border border-border-soft bg-input-bg py-2 pr-3 pl-9 text-[12px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                categoryFilter === 'all'
                  ? 'border-coral bg-coral text-white'
                  : 'border-border-soft bg-blush text-teal hover:border-salmon'
              }`}
            >
              Semua ({state.products.length})
            </button>
            {state.categories.map((cat) => {
              const count = state.products.filter((p) => p.categorySlug === cat.slug).length
              const active = categoryFilter === cat.slug
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setCategoryFilter(cat.slug)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? 'border-coral bg-coral text-white'
                      : 'border-border-soft bg-blush text-teal hover:border-salmon'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>

          {/* Product Rows */}
          <div className="mt-4 space-y-2.5">
            {filteredProducts.length === 0 ? (
              <p className="rounded-[12px] border border-border-soft bg-blush px-4 py-6 text-center text-[13px] text-teal-muted">
                Belum ada produk pada kategori atau filter pencarian ini.
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-bold text-teal">{product.name}</span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-muted">
                        {getCategoryName(product.categorySlug)}
                      </span>
                      {product.isFreeDomain && (
                        <span className="rounded-full bg-mint-strip px-2.5 py-0.5 text-[10px] font-bold text-teal uppercase">
                          Free Domain
                        </span>
                      )}
                      {product.stockLabel && (
                        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[10px] font-bold text-charcoal">
                          {product.stockLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-teal-muted">
                      {product.diskSpace} · {product.bandwidth} ·{' '}
                      <strong className="text-charcoal">{formatPrice(product.priceMonthly)}/bln</strong> ·{' '}
                      <strong className="text-coral">{formatPrice(product.priceAnnual)}/thn</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/store/${product.categorySlug}`}
                      className="rounded-full border border-border-soft bg-white px-3.5 py-1.5 text-[12px] font-semibold text-teal hover:border-salmon"
                    >
                      Lihat Store
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEditProduct(product)}
                      className="rounded-full border border-teal/30 bg-mint-strip px-3.5 py-1.5 text-[12px] font-semibold text-teal hover:bg-teal hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="rounded-full border border-salmon bg-salmon-tint px-3.5 py-1.5 text-[12px] font-semibold text-coral hover:bg-coral hover:text-white"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(productToDelete)}
        title={`Hapus Paket "${productToDelete?.name ?? ''}"?`}
        description="Paket yang dihapus tidak akan tampil lagi pada etalase Store pelanggan dan penghapusan akan dicatat ke Log Product."
        confirmLabel="Hapus Produk"
        cancelLabel="Batal"
        tone="coral"
        onCancel={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            if (form.id === productToDelete.id) {
              handleResetForm()
            }
            void deleteProduct(productToDelete.id)
          }
          setProductToDelete(null)
        }}
      />
    </AdminAccessGuard>
  )
}

interface UserFormState {
  id?: number
  name: string
  email: string
  phone: string
  company: string
  role: 'customer' | 'admin'
  status: 'ACTIVE' | 'SUSPENDED'
}

const EMPTY_USER_FORM: UserFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  role: 'customer',
  status: 'ACTIVE',
}

/**
 * Figma V6 Screen 43 — CRUD User (`/admin/users`, UC-06)
 */
export function AdminUsersPage() {
  const { state, currentUser, saveUser, deleteUser } = useHostuner()
  const formRef = useRef<HTMLFormElement>(null)

  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null)

  const isEditing = Boolean(form.id)

  function handleEditUser(user: UserAccount) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company ?? '',
      role: user.role,
      status: user.status,
    })
    setErrors({})
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleResetForm() {
    setForm(EMPTY_USER_FORM)
    setErrors({})
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const nextErrors: Record<string, string> = {}
    const cleanEmail = form.email.trim().toLowerCase()

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Nama lengkap wajib diisi minimal 2 karakter.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Format alamat email tidak valid.'
    } else if (state.users.some((u) => u.email.toLowerCase() === cleanEmail && u.id !== form.id)) {
      nextErrors.email = 'Alamat email sudah terdaftar pada akun lain.'
    }
    if (form.phone.trim().length < 8) {
      nextErrors.phone = 'Nomor telepon minimal 8 digit.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const existing = form.id ? state.users.find((u) => u.id === form.id) : undefined

    setIsSubmitting(true)
    try {
      const res = await saveUser({
        id: form.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim() || undefined,
        address: existing?.address,
        city: existing?.city,
        postcode: existing?.postcode,
        country: existing?.country ?? 'Indonesia',
        role: form.role,
        status: form.status,
      })

      if (res.success) {
        handleResetForm()
      } else if (res.errors) {
        setErrors(res.errors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredUsers = state.users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company ?? '').toLowerCase().includes(q)
    return matchesRole && matchesSearch
  })

  return (
    <AdminAccessGuard
      breadcrumbs={[{ label: 'Admin Portal', to: '/admin' }, { label: 'CRUD User' }]}
      backTo="/admin"
      returnPath="/admin/users"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-[26px] font-bold tracking-tight text-teal uppercase">
            CRUD User — Kelola Akun Pelanggan &amp; Role
          </h1>
          <p className="text-[13px] text-teal-muted">
            Tambahkan akun pelanggan atau administrator baru, ubah status aktif/suspend, dan pantau perubahan pada Log User.
          </p>
        </header>

        {/* Create / Update User Form Card (Matches Figma 43) */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                {isEditing ? `Edit Akun User: ${form.name}` : '+ Tambah / Edit Akun User (Create & Update)'}
              </h2>
              <p className="text-[12px] text-teal-muted">
                Kelola profil pengguna, penetapan role, dan status keaktifan akun secara langsung.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded-full border border-salmon bg-salmon-tint px-4 py-1.5 text-[12px] font-semibold text-coral hover:bg-coral hover:text-white"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="usr-name" className="block text-[12px] font-semibold text-teal">
                Nama Lengkap User *
              </label>
              <input
                id="usr-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Rina Wijaya"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.name} />
            </div>

            <div>
              <label htmlFor="usr-email" className="block text-[12px] font-semibold text-teal">
                Alamat Email *
              </label>
              <input
                id="usr-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Contoh: rina@perusahaan.co.id"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <label htmlFor="usr-phone" className="block text-[12px] font-semibold text-teal">
                Nomor Telepon *
              </label>
              <input
                id="usr-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Contoh: 0812-3456-7890"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <label htmlFor="usr-company" className="block text-[12px] font-semibold text-teal">
                Instansi / Sekolah / Perusahaan (Opsional)
              </label>
              <input
                id="usr-company"
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Contoh: SMA Negeri 1 Surakarta"
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="usr-role" className="block text-[12px] font-semibold text-teal">
                Role Akses *
              </label>
              <select
                id="usr-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'customer' | 'admin' }))}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              >
                <option value="customer">Client / Customer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label htmlFor="usr-status" className="block text-[12px] font-semibold text-teal">
                Status Akun *
              </label>
              <select
                id="usr-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'SUSPENDED' }))}
                className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 text-[13px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              {isEditing ? 'Simpan Perubahan User' : '+ Simpan User Baru'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded-full border border-border-soft bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* Registered Users List Card */}
        <section className="rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-teal">
                Daftar Akun User Terdaftar ({filteredUsers.length} / {state.users.length})
              </h2>
              <p className="text-[12px] text-teal-muted">
                Akun Administrator yang sedang aktif masuk dilindungi dari penghapusan tidak disengaja.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-teal-muted">
                  <FigmaIcon name="search" size={14} />
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / email..."
                  aria-label="Cari akun user"
                  className="w-full rounded-[10px] border border-border-soft bg-input-bg py-2 pr-3 pl-9 text-[12px] text-charcoal focus:border-coral focus:bg-white focus:outline-none"
                />
              </div>

              {(['all', 'customer', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    roleFilter === r
                      ? 'border-coral bg-coral text-white'
                      : 'border-border-soft bg-blush text-teal hover:border-salmon'
                  }`}
                >
                  {r === 'all' ? 'Semua' : r === 'admin' ? 'Admin' : 'Client'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {filteredUsers.length === 0 ? (
              <p className="rounded-[12px] border border-border-soft bg-blush px-4 py-6 text-center text-[13px] text-teal-muted">
                Tidak ada akun pengguna yang cocok dengan filter pencarian.
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-[14px] border border-border-soft bg-blush p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-teal">{user.name}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            user.role === 'admin' ? 'bg-teal text-white' : 'bg-mint-strip text-teal'
                          }`}
                        >
                          {user.role === 'admin' ? 'ADMIN' : 'CLIENT'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-soft text-green-cta'
                              : 'bg-salmon-tint text-coral'
                          }`}
                        >
                          {user.status}
                        </span>
                        {isSelf && (
                          <span className="rounded-full border border-teal/30 bg-white px-2 py-0.5 text-[10px] font-semibold text-teal">
                            Sesi Anda
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-teal-muted">
                        {user.email} · {user.phone}
                        {user.company ? ` · ${user.company}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user)}
                        className="rounded-full border border-teal/30 bg-mint-strip px-3.5 py-1.5 text-[12px] font-semibold text-teal hover:bg-teal hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isSelf}
                        title={isSelf ? 'Akun Admin yang sedang aktif tidak dapat dihapus.' : undefined}
                        onClick={() => setUserToDelete(user)}
                        className="rounded-full border border-salmon bg-salmon-tint px-3.5 py-1.5 text-[12px] font-semibold text-coral hover:bg-coral hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-salmon-tint disabled:hover:text-coral"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(userToDelete)}
        title={`Hapus Akun "${userToDelete?.name ?? ''}"?`}
        description={`Akun ${userToDelete?.email ?? ''} akan dihapus dari daftar pengguna dan aktivitas ini akan dicatat ke Log User.`}
        confirmLabel="Hapus User"
        cancelLabel="Batal"
        tone="coral"
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) {
            if (form.id === userToDelete.id) {
              handleResetForm()
            }
            void deleteUser(userToDelete.id)
          }
          setUserToDelete(null)
        }}
      />
    </AdminAccessGuard>
  )
}
