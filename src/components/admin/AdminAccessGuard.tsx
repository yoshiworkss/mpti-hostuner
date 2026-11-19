import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useHostuner } from '../../context/useHostuner'
import { FigmaIcon } from '../icons/FigmaIcon'
import { PageShell } from '../layout/PageShell'
import { BreadcrumbBackBar, type BreadcrumbSegment } from '../ui/FeedbackStates'

interface AdminAccessGuardProps {
  breadcrumbs: BreadcrumbSegment[]
  backTo?: string
  returnPath: string
  children: ReactNode
}

/**
 * Strict role guard for Tahap 5 Admin Portal routes (`/admin/*`).
 * - Guests and Customers NEVER see `AdminCapsuleNavbar` or `AdminSidebar`
 *   (renders clean public `PageShell` with explicit login prompt).
 * - Zero 1-click admin login bypasses (aligned with Q6 & SRS Role Matrix).
 */
export function AdminAccessGuard({
  breadcrumbs,
  backTo = '/admin',
  returnPath,
  children,
}: AdminAccessGuardProps) {
  const { role, currentUser } = useHostuner()

  if (role !== 'admin') {
    const loginUrl = `/login?mode=admin&redirect=${encodeURIComponent(returnPath)}`

    return (
      <PageShell mode="public">
        <div className="space-y-6">
          <BreadcrumbBackBar
            backTo="/"
            backLabel="← Back"
            segments={[{ label: 'Home', to: '/' }, { label: 'Admin Portal' }]}
          />

          <section className="mx-auto max-w-[680px] rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-salmon-tint px-3.5 py-1 text-[11px] font-bold tracking-wide text-coral uppercase">
              <FigmaIcon name="lock" size={13} />
              <span>Akses Khusus Administrator</span>
            </span>

            <h1 className="mt-3 text-[24px] font-bold text-teal">Masuk sebagai Administrator Hostuner</h1>

            <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
              {role === 'customer' && currentUser
                ? `Anda sedang masuk sebagai akun Pelanggan (${currentUser.name} — ${currentUser.email}). Halaman manajemen produk, pengguna, konten, dan verifikasi pembayaran QRIS hanya dapat diakses oleh akun Administrator.`
                : 'Halaman pengelolaan portal Admin (Overview, Log Activity, CRUD Product, CRUD User, CRUD News & Artikel, dan Pengaturan QRIS) hanya dapat diakses menggunakan akun Administrator yang telah terverifikasi.'}
            </p>

            <div className="mt-5 rounded-[14px] border border-border-soft bg-blush p-4 text-[12px] text-charcoal">
              <p className="font-semibold text-teal">Ringkasan Hak Akses Portal Hostuner:</p>
              <ul className="mt-1.5 space-y-1 text-teal-muted">
                <li>• Guest: Jelajahi katalog Store, cek domain, dan baca publikasi News/KB.</li>
                <li>• Client: Kelola layanan aktif, keranjang belanja, checkout QRIS Statis, dan tiket dukungan.</li>
                <li>• Administrator: Kelola seluruh data CRUD katalog, akun, konten, log aktivitas, dan konfirmasi pembayaran.</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to={loginUrl}
                className="inline-flex items-center gap-2 rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <FigmaIcon name="lock" size={14} />
                <span>Masuk ke Halaman Login Admin →</span>
              </Link>
              <Link
                to={role === 'customer' ? '/client' : '/'}
                className="rounded-full border border-border-soft bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:border-salmon"
              >
                {role === 'customer' ? '← Kembali ke Client Area' : '← Kembali ke Beranda'}
              </Link>
            </div>
          </section>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell mode="admin">
      <BreadcrumbBackBar backTo={backTo} backLabel="← Back" segments={breadcrumbs} />
      {children}
    </PageShell>
  )
}
