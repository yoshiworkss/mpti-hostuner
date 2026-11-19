import { Link } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'

/**
 * Clean 404 Not Found page matching Hostuner Heritage palette.
 */
export function NotFoundPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-[620px] rounded-[24px] border border-salmon-border bg-white px-6 py-12 text-center shadow-soft md:px-10">
        <span className="inline-flex rounded-full bg-salmon-tint px-4 py-1 text-[12px] font-bold tracking-wider text-coral uppercase">
          404 • Halaman Tidak Ditemukan
        </span>
        <h1 className="mt-4 text-[26px] font-bold text-teal">Halaman yang Anda cari tidak tersedia</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">
          Tautan mungkin sudah dipindahkan atau alamat URL tidak tepat. Silakan kembali ke Beranda atau jelajahi layanan
          Store Hostuner.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
          >
            Kembali ke Beranda →
          </Link>
          <Link
            to="/store/hosting-iix"
            className="rounded-full border border-salmon-border bg-blush px-6 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon"
          >
            Lihat Layanan Hosting
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
