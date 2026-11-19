import { Link } from 'react-router-dom'
import { FigmaIcon } from '../icons/FigmaIcon'
import { PageShell } from '../layout/PageShell'

interface RestrictedPageGateProps {
  pageName: string
  returnPath: string
  description?: string
}

/**
 * Matches Figma Page FIX V6 Before-Login Restricted screens (`26 Network Status`,
 * `28 Affiliates`, `30 My Support Tickets`, and `/client` guest access).
 * Routes users cleanly to `/login?redirect=...` so Captcha stays strictly on Auth pages.
 */
export function RestrictedPageGate({ pageName, returnPath, description }: RestrictedPageGateProps) {
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`
  const registerHref = `/register?redirect=${encodeURIComponent(returnPath)}`

  return (
    <PageShell>
      <div className="mx-auto max-w-[920px] space-y-5">
        {/* Top Restricted Banner matching Figma 26 */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-salmon bg-salmon-tint/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5 text-[13px] font-semibold text-coral">
            <FigmaIcon name="lock" size={16} className="text-coral" />
            <span>
              This page is restricted — Accessing &quot;{pageName}&quot; requires Client Authentication.
            </span>
          </div>
          <span className="rounded-full bg-coral px-3.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
            Client Area Required
          </span>
        </div>

        {/* Split Soft Salmon + White Action Card */}
        <section className="rounded-[24px] border border-salmon-border bg-white p-5 shadow-soft md:p-7">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-12">
            <div className="flex flex-col items-center justify-center rounded-[18px] bg-salmon px-7 py-10 text-center text-white md:col-span-5">
              <span className="rounded-full bg-white px-4 py-1 text-[10px] font-bold tracking-wider text-coral uppercase">
                Restricted: {pageName}
              </span>
              <h1 className="mt-4 text-[26px] font-bold leading-tight">
                Login to Access
                <br />
                {pageName}
              </h1>
              <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-white/95">
                {description ??
                  'Halaman ini khusus untuk pelanggan terdaftar Hostuner. Silakan masuk menggunakan akun Anda.'}
              </p>
            </div>

            <div className="flex flex-col justify-center space-y-4 px-2 py-2 md:col-span-7 md:px-4">
              <h2 className="text-[24px] font-bold text-teal">Autentikasi Diperlukan</h2>
              <p className="text-[13px] leading-relaxed text-teal-muted">
                Masuk ke akun Hostuner Anda untuk melihat data personal pada halaman{' '}
                <strong className="text-teal">{pageName}</strong>. Setelah berhasil login, Anda akan otomatis kembali ke
                halaman ini.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={loginHref}
                  className="inline-flex items-center justify-center rounded-full bg-teal px-7 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Login Sekarang →
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex items-center justify-center rounded-full border border-coral bg-white px-6 py-2.5 text-[13px] font-semibold text-coral transition-colors hover:bg-salmon-tint"
                >
                  Daftar Akun Baru
                </Link>
              </div>

              <div className="pt-2 text-[12px] text-teal-muted">
                Ingin membaca dokumentasi publik tanpa login?{' '}
                <Link to="/knowledgebase" className="font-semibold text-coral hover:underline">
                  Buka Knowledgebase →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
