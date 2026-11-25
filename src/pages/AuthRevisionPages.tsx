import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DEFAULT_CAPTCHA_CODE, generateCaptchaCode } from '../components/auth/captchaUtils'
import { VerificationCaptchaWidget } from '../components/auth/VerificationCaptchaWidget'
import { FigmaIcon } from '../components/icons/FigmaIcon'
import { PageShell } from '../components/layout/PageShell'
import { FieldError } from '../components/ui/FeedbackStates'
import { useHostuner } from '../context/useHostuner'
import { useRevisionCart } from '../context/useRevisionCart'
import { isBackendApiEnabled } from '../services/apiClient'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Revision 3.1 Login Page (`/login`, Figma Screen 34):
 * - Q6: `Login as Admin` button stays visible and switches the form into Admin Login Mode
 *   (requiring admin email, password, and Captcha — no 1-click authentication bypass).
 * - Q5: Quick-fill demo helper renders ONLY in `import.meta.env.DEV` and disappears in production builds.
 * - Q3: Displays pending cart/checkout notice when redirected from a guest action and resumes cleanly after login.
 */
export function LoginRevisionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, loginUser, resendVerificationEmail } = useHostuner()
  const { pendingAuthItem } = useRevisionCart()

  const redirectTo = searchParams.get('redirect')
  const initialMode = searchParams.get('mode') === 'admin' ? 'admin' : 'client'
  const isDev = import.meta.env.DEV

  const [loginMode, setLoginMode] = useState<'client' | 'admin'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [captchaCode, setCaptchaCode] = useState(DEFAULT_CAPTCHA_CODE)
  const [captchaInput, setCaptchaInput] = useState('')
  const [turnstileChecked, setTurnstileChecked] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendPreviewUrl, setResendPreviewUrl] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string; captcha?: string }>({})

  function handleQuickFillDev() {
    setEmail(loginMode === 'admin' ? 'admin@hostuner.com' : 'budi@sman1solo.sch.id')
    setPassword('Hostuner25!')
    setCaptchaInput(captchaCode)
    setTurnstileChecked(true)
    setTurnstileToken('turnstile-local-verified')
    setErrors({})
  }

  function handleSwitchMode(nextMode: 'client' | 'admin') {
    setLoginMode(nextMode)
    setErrors({})
    setEmail('')
    setPassword('')
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const cleanEmail = email.trim().toLowerCase()
    const nextErrors: { email?: string; password?: string; captcha?: string } = {}

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      nextErrors.email =
        loginMode === 'admin'
          ? 'Masukkan alamat email Administrator yang valid (contoh: admin@hostuner.com).'
          : 'Masukkan alamat email yang valid (contoh: budi@sman1solo.sch.id).'
    }
    if (password.trim().length < 6) {
      nextErrors.password = 'Password wajib diisi minimal 6 karakter.'
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      nextErrors.captcha = `Kode keamanan tidak cocok. Masukkan "${captchaCode}" sesuai gambar.`
    } else if (!turnstileChecked) {
      nextErrors.captcha = 'Centang verifikasi anti-bot (Cloudflare Turnstile) sebelum masuk.'
    }

    if (nextErrors.email || nextErrors.password || nextErrors.captcha) {
      setErrors(nextErrors)
      return
    }

    // In local fallback mode (when Backend API is disabled), check against local state.users
    if (!isBackendApiEnabled()) {
      const matchedUser = state.users.find((u) => u.email.toLowerCase() === cleanEmail)
      if (!matchedUser) {
        setErrors({
          email: 'Email belum terdaftar. Silakan periksa kembali atau daftar akun baru.',
        })
        return
      }
      if (loginMode === 'admin' && matchedUser.role !== 'admin') {
        setErrors({
          email: 'Akun ini tidak memiliki hak akses Administrator. Gunakan akun Admin atau kembali ke Login Client.',
        })
        return
      }
      if (matchedUser.status === 'SUSPENDED') {
        setErrors({
          email: 'Akun ini sedang berstatus SUSPENDED. Hubungi tim Support Hostuner.',
        })
        return
      }
    }

    setErrors({})
    setUnverifiedEmail(null)
    setResendNotice(null)
    setResendPreviewUrl(null)
    setIsSubmitting(true)
    try {
      const res = await loginUser(cleanEmail, loginMode === 'admin' ? 'admin' : 'customer', {
        password,
        turnstileToken: turnstileToken ?? (turnstileChecked ? 'turnstile-local-verified' : undefined),
      })

      if (!res.success || !res.data) {
        setTurnstileResetSignal((c) => c + 1)
        if (res.errors?.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(cleanEmail)
        }
        setErrors({
          email: res.errors?.email ?? (!res.errors?.password && !res.errors?.captcha ? res.message : undefined),
          password: res.errors?.password,
          captcha: res.errors?.captcha,
        })
        return
      }

      if (redirectTo) {
        navigate(redirectTo, { replace: true })
      } else {
        navigate(res.data.role === 'admin' ? '/admin' : '/client', { replace: true })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendFromLogin() {
    if (!unverifiedEmail || resendLoading) return
    setResendLoading(true)
    try {
      const res = await resendVerificationEmail(unverifiedEmail, redirectTo ?? undefined)
      if (res.success && res.data) {
        setResendNotice(res.message)
        setResendPreviewUrl(res.data.verificationPreviewUrl ?? null)
      } else {
        setResendNotice(res.message)
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[980px] rounded-[24px] border border-salmon-border bg-white p-5 shadow-soft md:p-7">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-12">
          {/* Left Soft Salmon Panel */}
          <div className="flex flex-col items-center justify-center rounded-[18px] bg-salmon px-7 py-10 text-center text-white md:col-span-5 md:py-12">
            <span className="rounded-full bg-white px-4 py-1 text-[11px] font-bold tracking-wider text-coral uppercase">
              {loginMode === 'admin' ? 'Admin Portal Access' : 'Hostuner Portal'}
            </span>
            <h1 className="mt-5 text-[28px] font-bold leading-tight">
              {loginMode === 'admin' ? (
                <>
                  Admin Portal
                  <br />
                  Hostuner.Com
                </>
              ) : (
                <>
                  Welcome Back to
                  <br />
                  Hostuner.Com
                </>
              )}
            </h1>
            <p className="mt-3 max-w-[270px] text-[13px] leading-relaxed text-white/95">
              {loginMode === 'admin'
                ? 'Masuk menggunakan kredensial Administrator terverifikasi untuk mengelola katalog, akun, dan tagihan.'
                : 'Manage your domains, hosting packages, and invoices in one place.'}
            </p>
          </div>

          {/* Right Form Panel */}
          <div className="flex flex-col justify-center px-1 py-2 md:col-span-7 md:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[28px] font-bold text-teal">
                {loginMode === 'admin' ? 'Login Admin' : 'Login'}
              </h2>
              {loginMode === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('client')}
                  className="text-[12px] font-semibold text-coral hover:underline"
                >
                  ← Kembali ke Login Client
                </button>
              )}
            </div>
            <p className="mt-1 text-[13px] text-teal-muted">
              {loginMode === 'admin'
                ? 'Masukkan email Admin, kata sandi, dan kode keamanan untuk masuk ke Dashboard Admin.'
                : 'Welcome back! Enter your details below'}
            </p>

            {/* Pending Cart/Checkout Context Notice (Q3) */}
            {pendingAuthItem && (
              <div className="mt-4 rounded-[12px] border border-salmon bg-salmon-tint/65 px-4 py-2.5 text-[12px] text-charcoal">
                Pesanan tertunda:{' '}
                <strong className="text-coral">
                  {pendingAuthItem.item.productName ?? pendingAuthItem.item.domainName}
                </strong>{' '}
                akan otomatis dilanjutkan setelah Anda berhasil masuk.
              </div>
            )}

            {/* Unverified Email Notice (UC-04 EX-02 / NF-02.7) */}
            {unverifiedEmail && (
              <div className="mt-4 space-y-2.5 rounded-[14px] border border-coral bg-salmon-tint/65 p-4 text-[12px] text-charcoal">
                <p className="font-bold text-coral">Email Akun Belum Diverifikasi</p>
                <p>
                  Akun <strong>{unverifiedEmail}</strong> wajib menyelesaikan verifikasi email terlebih dahulu sebelum
                  dapat masuk ke sistem.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={() => {
                      void handleResendFromLogin()
                    }}
                    className="rounded-full bg-teal px-4 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {resendLoading ? 'Mengirim Ulang...' : 'Kirim Ulang Email Verifikasi'}
                  </button>
                  {resendPreviewUrl && (
                    <a
                      href={resendPreviewUrl}
                      className="rounded-full bg-green-cta px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-green-cta-hover"
                    >
                      Buka Tautan Verifikasi →
                    </a>
                  )}
                </div>
                {resendNotice && <p className="font-semibold text-teal">{resendNotice}</p>}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-[12px] font-bold text-teal">
                  Email Address
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 focus-within:border-salmon focus-within:bg-white">
                  <FigmaIcon name="at" size={16} className="text-teal-muted" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    placeholder={loginMode === 'admin' ? 'admin@hostuner.com' : 'Enter Email here'}
                    className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                  />
                </div>
                <FieldError message={errors.email} />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-[12px] font-bold text-teal">
                  Password
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 focus-within:border-salmon focus-within:bg-white">
                  <FigmaIcon name="lock" size={16} className="text-teal-muted" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                    placeholder="Enter Password here"
                    className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[11px] font-semibold text-teal-muted hover:text-coral"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <FieldError message={errors.password} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <label className="flex cursor-pointer items-center gap-2 text-teal-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-coral"
                  />
                  <span>Remember Me</span>
                </label>

                {isDev && (
                  <button
                    type="button"
                    onClick={handleQuickFillDev}
                    className="font-semibold text-coral hover:underline"
                  >
                    {loginMode === 'admin' ? 'Dev: Isi Kredensial Admin' : 'Dev: Isi Kredensial Budi Santoso'}
                  </button>
                )}
              </div>

              <VerificationCaptchaWidget
                idPrefix="login"
                code={captchaCode}
                value={captchaInput}
                onChange={(val) => {
                  setCaptchaInput(val)
                  if (errors.captcha) setErrors((prev) => ({ ...prev, captcha: undefined }))
                }}
                onRefresh={() => {
                  setCaptchaCode(generateCaptchaCode())
                  setCaptchaInput('')
                }}
                turnstileChecked={turnstileChecked}
                onToggleTurnstile={(checked) => {
                  setTurnstileChecked(checked)
                  if (errors.captcha) setErrors((prev) => ({ ...prev, captcha: undefined }))
                }}
                onTurnstileToken={setTurnstileToken}
                resetSignal={turnstileResetSignal}
                error={errors.captcha}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-teal py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmitting
                  ? 'Memverifikasi Kredensial...'
                  : loginMode === 'admin'
                    ? 'Masuk ke Dashboard Admin'
                    : 'Login'}
              </button>

              {/* Q6: Stays visible per Figma 34, switches form to Admin Mode (still requires email/password/captcha) */}
              {loginMode === 'client' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('admin')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-salmon bg-salmon-tint/60 py-3 text-[13px] font-bold text-coral transition-colors hover:bg-salmon-tint"
                >
                  <FigmaIcon name="dashboard" size={15} className="text-coral" />
                  <span>Login as Admin (Buka Dashboard Admin) →</span>
                </button>
              )}
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-teal">
              <span>Don&apos;t have an account?</span>
              <Link
                to={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
                className="font-bold text-coral hover:underline"
              >
                Register
              </Link>
              <span className="text-teal-muted">|</span>
              <Link to="/password-reset" className="font-semibold text-teal hover:text-coral hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/**
 * Revision 3.1 Lost Password Reset Page (`/password-reset`, Figma Screen 35).
 */
export function PasswordResetRevisionPage() {
  const { showToast } = useHostuner()

  const [email, setEmail] = useState('')
  const [captchaCode, setCaptchaCode] = useState(DEFAULT_CAPTCHA_CODE)
  const [captchaInput, setCaptchaInput] = useState('')
  const [turnstileChecked, setTurnstileChecked] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; captcha?: string }>({})
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim()
    const nextErrors: { email?: string; captcha?: string } = {}

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      nextErrors.email = 'Masukkan alamat email terdaftar yang valid.'
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      nextErrors.captcha = `Kode keamanan tidak cocok. Masukkan "${captchaCode}".`
    } else if (!turnstileChecked) {
      nextErrors.captcha = 'Centang verifikasi anti-bot sebelum melanjutkan.'
    }

    if (nextErrors.email || nextErrors.captcha) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmittedEmail(cleanEmail)
    showToast(`Instruksi reset password dikirim ke ${cleanEmail}.`)
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[980px] rounded-[24px] border border-salmon-border bg-white p-5 shadow-soft md:p-7">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-12">
          <div className="flex flex-col items-center justify-center rounded-[18px] bg-salmon px-7 py-10 text-center text-white md:col-span-5 md:py-12">
            <span className="rounded-full bg-white px-4 py-1 text-[11px] font-bold tracking-wider text-coral uppercase">
              Account Recovery
            </span>
            <h1 className="mt-5 text-[28px] font-bold leading-tight">
              Lost Password
              <br />
              Reset
            </h1>
            <p className="mt-3 max-w-[270px] text-[13px] leading-relaxed text-white/95">
              Enter your registered email address to receive password reset instructions.
            </p>
          </div>

          <div className="flex flex-col justify-center px-1 py-2 md:col-span-7 md:px-4">
            <h2 className="text-[28px] font-bold text-teal">Lost Password Reset</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-teal-muted">
              Forgotten your password? Enter your email address below to begin the reset process.
            </p>

            {submittedEmail ? (
              <div className="mt-6 space-y-4 rounded-[16px] border border-green-cta bg-green-soft p-5">
                <p className="text-[15px] font-bold text-green-cta">✓ Tautan Pemulihan Terkirim</p>
                <p className="text-[13px] leading-relaxed text-charcoal">
                  Jika email <strong>{submittedEmail}</strong> terdaftar di sistem Hostuner, tautan untuk mengatur
                  ulang kata sandi telah dikirim ke kotak masuk Anda.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link
                    to="/login"
                    className="rounded-full bg-teal px-6 py-2 text-[13px] font-semibold text-white"
                  >
                    ← Kembali ke Login
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedEmail(null)
                      setCaptchaCode(generateCaptchaCode())
                      setCaptchaInput('')
                      setTurnstileChecked(false)
                    }}
                    className="rounded-full border border-border-soft bg-white px-5 py-2 text-[13px] font-semibold text-teal"
                  >
                    Kirim ke Email Lain
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="mt-5 space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-[12px] font-bold text-teal">
                    Email Address
                  </label>
                  <div className="mt-1.5 flex items-center gap-2.5 rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 focus-within:border-salmon focus-within:bg-white">
                    <FigmaIcon name="at" size={16} className="text-teal-muted" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                      }}
                      placeholder="Enter Email here"
                      className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                    />
                  </div>
                  <FieldError message={errors.email} />
                </div>

                <VerificationCaptchaWidget
                  idPrefix="reset"
                  code={captchaCode}
                  value={captchaInput}
                  onChange={(val) => {
                    setCaptchaInput(val)
                    if (errors.captcha) setErrors((prev) => ({ ...prev, captcha: undefined }))
                  }}
                  onRefresh={() => {
                    setCaptchaCode(generateCaptchaCode())
                    setCaptchaInput('')
                  }}
                  turnstileChecked={turnstileChecked}
                  onToggleTurnstile={(checked) => {
                    setTurnstileChecked(checked)
                    if (errors.captcha) setErrors((prev) => ({ ...prev, captcha: undefined }))
                  }}
                  error={errors.captcha}
                />

                <button
                  type="submit"
                  className="w-full rounded-full bg-teal py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Submit
                </button>

                <div className="text-center text-[12px] text-teal">
                  Ingat kata sandi Anda?{' '}
                  <Link to="/login" className="font-bold text-coral hover:underline">
                    ← Kembali ke Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/**
 * Revision 3.1 Register 3-Step Page (`/register`, Figma Screens 36–38).
 */
export function RegisterRevisionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state, registerCustomer, resendVerificationEmail } = useHostuner()
  const { pendingAuthItem } = useRevisionCart()

  const redirectTo = searchParams.get('redirect')

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('Indonesia')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [joinMailingList, setJoinMailingList] = useState(true)
  const [captchaCode, setCaptchaCode] = useState(DEFAULT_CAPTCHA_CODE)
  const [captchaInput, setCaptchaInput] = useState('')
  const [turnstileChecked, setTurnstileChecked] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [verificationState, setVerificationState] = useState<{
    email: string
    deliveryMode: 'smtp' | 'simulation'
    previewUrl: string | null
  } | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  function clearFieldError(field: string) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function handleNextFromStep1(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string | undefined> = {}

    if (!firstName.trim()) next.firstName = 'Nama depan wajib diisi.'
    if (!lastName.trim()) next.lastName = 'Nama belakang wajib diisi.'
    if (!email.trim() || !isValidEmail(email)) {
      next.email = 'Masukkan alamat email yang valid.'
    } else if (
      !isBackendApiEnabled() &&
      state.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      next.email = 'Email ini sudah terdaftar. Silakan masuk melalui halaman Login.'
    }
    if (phone.trim().length < 8) {
      next.phone = 'Nomor telepon wajib diisi minimal 8 digit (contoh: +62 812...).'
    }

    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }
    setErrors({})
    setStep(2)
  }

  function handleNextFromStep2(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string | undefined> = {}

    if (address.trim().length < 5) next.address = 'Alamat jalan wajib diisi minimal 5 karakter.'
    if (!city.trim()) next.city = 'Kota wajib diisi.'
    if (postcode.trim().length < 4) next.postcode = 'Kode pos wajib diisi.'

    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }
    setErrors({})
    setStep(3)
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    const next: Record<string, string | undefined> = {}

    if (password.length < 8) next.password = 'Password minimal 8 karakter.'
    if (confirmPassword !== password) next.confirmPassword = 'Konfirmasi password tidak sama dengan password.'
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      next.captcha = `Kode keamanan tidak cocok. Masukkan "${captchaCode}".`
    } else if (!turnstileChecked) {
      next.captcha = 'Centang verifikasi anti-bot (Cloudflare Turnstile) sebelum membuat akun.'
    }

    if (Object.values(next).some(Boolean)) {
      setErrors(next)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await registerCustomer({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        password,
        phone: phone.trim(),
        company: company.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
        country,
        redirectTo: redirectTo ?? undefined,
        turnstileToken: turnstileToken ?? (turnstileChecked ? 'turnstile-local-verified' : undefined),
      })

      if (!res.success || !res.data) {
        setTurnstileResetSignal((c) => c + 1)
        const nextErrs = res.errors ?? { email: res.message }
        setErrors(nextErrs)
        if (nextErrs.email || nextErrs.name || nextErrs.phone) {
          setStep(1)
        }
        return
      }

      if (res.data.verificationRequired) {
        setVerificationState({
          email: res.data.email,
          deliveryMode: res.data.deliveryMode ?? 'simulation',
          previewUrl: res.data.verificationPreviewUrl ?? null,
        })
        setResendMessage(null)
        return
      }

      navigate(redirectTo || '/client', { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendEmail() {
    if (!verificationState || resending) return
    setResending(true)
    try {
      const res = await resendVerificationEmail(verificationState.email, redirectTo ?? undefined)
      if (res.success && res.data) {
        setVerificationState({
          email: res.data.email,
          deliveryMode: res.data.deliveryMode,
          previewUrl: res.data.verificationPreviewUrl ?? null,
        })
        setResendMessage(res.message)
      } else {
        setResendMessage(res.message)
      }
    } finally {
      setResending(false)
    }
  }

  const steps = [
    { num: 1 as const, label: 'Personal Information' },
    { num: 2 as const, label: 'Billing Address' },
    { num: 3 as const, label: 'Security & Captcha' },
  ]

  return (
    <PageShell>
      <div className="mx-auto max-w-[980px] rounded-[24px] border border-salmon-border bg-white p-5 shadow-soft md:p-7">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-12">
          <div className="flex flex-col justify-start rounded-[18px] bg-salmon px-7 py-10 text-white md:col-span-4">
            <h1 className="text-[26px] font-bold leading-tight">
              Create Your
              <br />
              Hostuner Account
            </h1>

            <div className="mt-6 flex flex-col gap-3">
              {steps.map((item) => {
                const isActive = step === item.num
                const isDone = step > item.num
                return (
                  <button
                    key={item.num}
                    type="button"
                    disabled={item.num > step}
                    onClick={() => {
                      if (item.num < step) setStep(item.num)
                    }}
                    className={`flex w-fit items-center gap-2 rounded-full px-4 py-2 text-left text-[12px] font-bold transition-colors ${
                      isActive
                        ? 'bg-teal text-white shadow-xs'
                        : isDone
                          ? 'bg-white text-teal hover:bg-mint-strip'
                          : 'bg-white text-coral opacity-95'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                        isActive
                          ? 'border-white text-white'
                          : isDone
                            ? 'border-green-cta bg-green-soft text-green-cta'
                            : 'border-coral text-coral'
                      }`}
                    >
                      {isDone ? '✓' : item.num}
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            <p className="mt-auto pt-8 text-[12px] text-white/90">
              Sudah punya akun Hostuner?{' '}
              <Link
                to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
                className="font-bold underline"
              >
                Masuk di sini
              </Link>
            </p>
          </div>

          <div className="flex flex-col justify-center px-1 py-2 md:col-span-8 md:px-4">
            {verificationState ? (
              <div className="space-y-4">
                <span className="inline-flex rounded-full bg-green-soft px-3.5 py-1 text-[11px] font-bold tracking-wider text-green-cta uppercase">
                  Pendaftaran Berhasil • Verifikasi Email
                </span>
                <h2 className="text-[26px] font-bold text-teal">Verifikasi Alamat Email Anda</h2>
                <p className="text-[13px] leading-relaxed text-charcoal">
                  Akun Anda untuk email <strong className="text-teal">{verificationState.email}</strong> berhasil
                  disimpan. Sesuai kebijakan keamanan Hostuner (RF-02.3), silakan selesaikan verifikasi email terlebih
                  dahulu agar akun aktif dan dapat digunakan untuk login.
                </p>

                {verificationState.deliveryMode === 'smtp' ? (
                  <div className="rounded-[14px] border border-green-cta bg-green-soft p-4 text-[12px] text-charcoal">
                    ✓ Tautan verifikasi telah dikirim ke kotak masuk <strong>{verificationState.email}</strong>. Periksa
                    folder Inbox atau Spam Anda lalu klik tombol verifikasi.
                  </div>
                ) : (
                  <div className="space-y-2.5 rounded-[14px] border border-salmon bg-salmon-tint/60 p-4 text-[12px] text-charcoal">
                    <p className="font-bold text-coral">
                      Mode Simulasi / UAT (Server SMTP belum dikonfigurasi pada .env)
                    </p>
                    <p>
                      Tautan verifikasi email asli telah diterbitkan oleh server. Klik tombol di bawah ini untuk
                      menyelesaikan verifikasi email secara langsung:
                    </p>
                    {verificationState.previewUrl && (
                      <a
                        href={verificationState.previewUrl}
                        className="inline-flex items-center gap-2 rounded-full bg-green-cta px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
                      >
                        ✓ Verifikasi Email Sekarang →
                      </a>
                    )}
                  </div>
                )}

                {resendMessage && (
                  <p className="rounded-[10px] bg-mint-strip px-3.5 py-2 text-[12px] font-semibold text-teal">
                    {resendMessage}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
                    className="rounded-full bg-teal px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Ke Halaman Login →
                  </Link>
                  <button
                    type="button"
                    disabled={resending}
                    onClick={() => {
                      void handleResendEmail()
                    }}
                    className="rounded-full border border-border-soft bg-blush px-5 py-2.5 text-[13px] font-semibold text-teal hover:border-salmon disabled:opacity-50"
                  >
                    {resending ? 'Mengirim Ulang...' : 'Kirim Ulang Email Verifikasi'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-[26px] font-bold text-teal">Register — Step {step} of 3</h2>

            {pendingAuthItem && (
              <div className="mt-3 rounded-[12px] border border-salmon bg-salmon-tint/65 px-4 py-2.5 text-[12px] text-charcoal">
                Pesanan tertunda:{' '}
                <strong className="text-coral">
                  {pendingAuthItem.item.productName ?? pendingAuthItem.item.domainName}
                </strong>{' '}
                akan otomatis dilanjutkan setelah pendaftaran selesai.
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleNextFromStep1} className="mt-2 space-y-4">
                <p className="text-[13px] text-teal-muted">
                  Personal Information — Enter your contact details below.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-first-name" className="block text-[12px] font-bold text-teal">
                      First Name
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                      <FigmaIcon name="user-filled" size={15} className="text-teal-muted" />
                      <input
                        id="reg-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value)
                          clearFieldError('firstName')
                        }}
                        placeholder="Enter First Name"
                        className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                      />
                    </div>
                    <FieldError message={errors.firstName} />
                  </div>

                  <div>
                    <label htmlFor="reg-last-name" className="block text-[12px] font-bold text-teal">
                      Last Name
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                      <FigmaIcon name="user-filled" size={15} className="text-teal-muted" />
                      <input
                        id="reg-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value)
                          clearFieldError('lastName')
                        }}
                        placeholder="Enter Last Name"
                        className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                      />
                    </div>
                    <FieldError message={errors.lastName} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-[12px] font-bold text-teal">
                    Email Address
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                    <FigmaIcon name="at" size={15} className="text-teal-muted" />
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        clearFieldError('email')
                      }}
                      placeholder="Enter Email here"
                      className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                    />
                  </div>
                  <FieldError message={errors.email} />
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-[12px] font-bold text-teal">
                    Phone Number
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                    <FigmaIcon name="phone" size={15} className="text-teal-muted" />
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        clearFieldError('phone')
                      }}
                      placeholder="+62 812..."
                      className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                    />
                  </div>
                  <FieldError message={errors.phone} />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-teal py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Next: Billing Address →
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNextFromStep2} className="mt-2 space-y-4">
                <p className="text-[13px] text-teal-muted">
                  Billing Address — Used for tax and official domain registration.
                </p>

                <div>
                  <label htmlFor="reg-company" className="block text-[12px] font-bold text-teal">
                    Company Name (Optional)
                  </label>
                  <input
                    id="reg-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nama Instansi / Sekolah / Perusahaan"
                    className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="reg-address" className="block text-[12px] font-bold text-teal">
                    Street Address
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      clearFieldError('address')
                    }}
                    placeholder="Jl. ..."
                    className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                  />
                  <FieldError message={errors.address} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-city" className="block text-[12px] font-bold text-teal">
                      City
                    </label>
                    <input
                      id="reg-city"
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value)
                        clearFieldError('city')
                      }}
                      placeholder="Surakarta / Jakarta"
                      className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                    />
                    <FieldError message={errors.city} />
                  </div>

                  <div>
                    <label htmlFor="reg-postcode" className="block text-[12px] font-bold text-teal">
                      Postcode
                    </label>
                    <input
                      id="reg-postcode"
                      type="text"
                      value={postcode}
                      onChange={(e) => {
                        setPostcode(e.target.value)
                        clearFieldError('postcode')
                      }}
                      placeholder="57126"
                      className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] text-charcoal placeholder:text-teal-muted focus:border-salmon focus:bg-white focus:outline-none"
                    />
                    <FieldError message={errors.postcode} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-country" className="block text-[12px] font-bold text-teal">
                    Country
                  </label>
                  <select
                    id="reg-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1.5 w-full rounded-[12px] border border-border-soft bg-input-bg px-4 py-2.5 text-[13px] font-medium text-teal focus:border-salmon focus:bg-white focus:outline-none"
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="United States">United States</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-border-soft bg-blush px-6 py-3 text-[13px] font-semibold text-teal hover:border-salmon"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-teal px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Next: Account Security →
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleRegisterSubmit} className="mt-2 space-y-4">
                <p className="text-[13px] text-teal-muted">
                  Account Security — Set your password and complete verification.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-password" className="block text-[12px] font-bold text-teal">
                      Password
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                      <FigmaIcon name="lock" size={15} className="text-teal-muted" />
                      <input
                        id="reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          clearFieldError('password')
                        }}
                        placeholder="Enter Password"
                        className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                      />
                    </div>
                    <FieldError message={errors.password} />
                  </div>

                  <div>
                    <label htmlFor="reg-confirm-password" className="block text-[12px] font-bold text-teal">
                      Confirm Password
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 rounded-[12px] border border-border-soft bg-input-bg px-3.5 py-2.5 focus-within:border-salmon focus-within:bg-white">
                      <FigmaIcon name="lock" size={15} className="text-teal-muted" />
                      <input
                        id="reg-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          clearFieldError('confirmPassword')
                        }}
                        placeholder="Confirm Password"
                        className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-teal-muted focus:outline-none"
                      />
                    </div>
                    <FieldError message={errors.confirmPassword} />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-teal">
                  <input
                    type="checkbox"
                    checked={joinMailingList}
                    onChange={(e) => setJoinMailingList(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-teal"
                  />
                  <span>Join our mailing list (Receive important announcements &amp; renewal notices)</span>
                </label>

                <VerificationCaptchaWidget
                  idPrefix="register"
                  code={captchaCode}
                  value={captchaInput}
                  onChange={(val) => {
                    setCaptchaInput(val)
                    clearFieldError('captcha')
                  }}
                  onRefresh={() => {
                    setCaptchaCode(generateCaptchaCode())
                    setCaptchaInput('')
                  }}
                  turnstileChecked={turnstileChecked}
                  onToggleTurnstile={(checked) => {
                    setTurnstileChecked(checked)
                    clearFieldError('captcha')
                  }}
                  onTurnstileToken={setTurnstileToken}
                  resetSignal={turnstileResetSignal}
                  error={errors.captcha}
                />

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setStep(2)}
                    className="rounded-full border border-border-soft bg-blush px-6 py-3 text-[13px] font-semibold text-teal hover:border-salmon disabled:opacity-50"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-full bg-green-cta px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-green-cta-hover disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmitting ? 'Membuat Akun...' : 'Register / Create Account'}
                  </button>
                </div>
              </form>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/**
 * Email Verification Landing Page (`/verify-email?token=...`, RF-02.3, NF-02.7, UC-03).
 * Validates the registration verification token with the backend and activates the account.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { verifyEmailToken, resendVerificationEmail } = useHostuner()

  const token = (searchParams.get('token') ?? '').trim()
  const redirectTo = searchParams.get('redirect')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(
    token
      ? 'Sedang memverifikasi tautan email Anda...'
      : 'Token verifikasi tidak ditemukan pada tautan. Silakan gunakan tombol kirim ulang verifikasi.'
  )
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendResult, setResendResult] = useState<{ text: string; previewUrl: string | null } | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true

    async function runVerification() {
      const res = await verifyEmailToken(token)
      if (!active) return
      if (res.success && res.data) {
        setStatus('success')
        setVerifiedEmail(res.data.email)
        setMessage(res.message)
      } else {
        setStatus('error')
        setMessage(res.message || 'Token verifikasi email tidak valid atau sudah kedaluwarsa.')
      }
    }

    void runVerification()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleResendSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail.trim() || resendLoading) return
    setResendLoading(true)
    try {
      const res = await resendVerificationEmail(resendEmail.trim(), redirectTo ?? undefined)
      setResendResult({
        text: res.message,
        previewUrl: res.data?.verificationPreviewUrl ?? null,
      })
    } finally {
      setResendLoading(false)
    }
  }

  const loginLink = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'

  return (
    <PageShell>
      <div className="mx-auto max-w-[720px] rounded-[24px] border border-salmon-border bg-white p-6 shadow-soft md:p-9">
        {status === 'loading' && (
          <div className="space-y-3 py-6 text-center">
            <span className="inline-flex rounded-full bg-mint-strip px-4 py-1 text-[11px] font-bold tracking-wider text-teal uppercase">
              Memproses Verifikasi
            </span>
            <h1 className="text-[24px] font-bold text-teal">Memverifikasi Alamat Email...</h1>
            <p className="text-[13px] text-teal-muted">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4 text-center">
            <span className="inline-flex rounded-full bg-green-soft px-4 py-1 text-[11px] font-bold tracking-wider text-green-cta uppercase">
              ✓ Akun Terverifikasi &amp; Aktif
            </span>
            <h1 className="text-[26px] font-bold text-teal">Verifikasi Email Berhasil!</h1>
            <p className="mx-auto max-w-[480px] text-[13px] leading-relaxed text-charcoal">
              {verifiedEmail ? (
                <>
                  Alamat email <strong className="text-teal">{verifiedEmail}</strong> telah berhasil diverifikasi. Akun
                  Anda kini aktif dan siap digunakan untuk login serta memesan layanan Hostuner.
                </>
              ) : (
                message
              )}
            </p>
            <div className="pt-2">
              <Link
                to={loginLink}
                className="inline-flex items-center justify-center rounded-full bg-teal px-8 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Lanjut ke Halaman Login →
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5">
            <div className="space-y-2 text-center">
              <span className="inline-flex rounded-full bg-salmon-tint px-4 py-1 text-[11px] font-bold tracking-wider text-coral uppercase">
                Verifikasi Gagal
              </span>
              <h1 className="text-[24px] font-bold text-teal">Tautan Verifikasi Tidak Valid / Kedaluwarsa</h1>
              <p className="mx-auto max-w-[500px] text-[13px] text-charcoal">{message}</p>
            </div>

            <form
              onSubmit={handleResendSubmit}
              className="mx-auto max-w-[460px] space-y-3 rounded-[16px] border border-border-soft bg-blush p-5"
            >
              <label htmlFor="resend-verify-email" className="block text-[12px] font-bold text-teal">
                Kirim Ulang Tautan Verifikasi Email
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="resend-verify-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Masukkan alamat email terdaftar..."
                  className="flex-1 rounded-[12px] border border-border-soft bg-white px-3.5 py-2 text-[13px] text-charcoal focus:border-salmon focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="rounded-full bg-coral px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover disabled:opacity-50"
                >
                  {resendLoading ? 'Mengirim...' : 'Kirim Ulang'}
                </button>
              </div>
              {resendResult && (
                <div className="space-y-2 pt-1 text-[12px]">
                  <p className="font-semibold text-teal">{resendResult.text}</p>
                  {resendResult.previewUrl && (
                    <a
                      href={resendResult.previewUrl}
                      className="inline-flex rounded-full bg-green-cta px-4 py-1.5 font-semibold text-white hover:bg-green-cta-hover"
                    >
                      Buka Tautan Verifikasi Baru →
                    </a>
                  )}
                </div>
              )}
            </form>

            <div className="text-center">
              <Link to={loginLink} className="text-[13px] font-semibold text-teal hover:text-coral hover:underline">
                ← Kembali ke Halaman Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
