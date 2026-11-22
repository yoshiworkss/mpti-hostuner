import { useEffect, useRef } from 'react'
import { FieldError } from '../ui/FeedbackStates'

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string
        theme?: 'light' | 'dark' | 'auto'
        callback?: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: () => void
      }
    ) => string
    remove?: (widgetId: string) => void
  }
}

interface VerificationCaptchaWidgetProps {
  code: string
  value: string
  onChange: (nextValue: string) => void
  onRefresh: () => void
  turnstileChecked: boolean
  onToggleTurnstile: (checked: boolean) => void
  onTurnstileToken?: (token: string | null) => void
  error?: string
  idPrefix?: string
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-api-script'
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ''

/**
 * Auth-only Verification Captcha matching Figma Page FIX V6 (`34 Login`, `35 Reset`, `38 Register 3`)
 * combined with official Cloudflare Turnstile widget (`05_SRS FR-08`) when `VITE_TURNSTILE_SITE_KEY` is configured,
 * and a clean development fallback checkbox when `VITE_TURNSTILE_SITE_KEY` is empty.
 */
export function VerificationCaptchaWidget({
  code,
  value,
  onChange,
  onRefresh,
  turnstileChecked,
  onToggleTurnstile,
  onTurnstileToken,
  error,
  idPrefix = 'captcha',
}: VerificationCaptchaWidgetProps) {
  const inputId = `${idPrefix}-security-code`
  const turnstileId = `${idPrefix}-turnstile-check`
  const isCodeMatch = value.trim().toUpperCase() === code.toUpperCase()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const toggleCallbackRef = useRef(onToggleTurnstile)
  const tokenCallbackRef = useRef(onTurnstileToken)

  useEffect(() => {
    toggleCallbackRef.current = onToggleTurnstile
    tokenCallbackRef.current = onTurnstileToken
  }, [onToggleTurnstile, onTurnstileToken])

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return

    let cancelled = false
    const win = window as TurnstileWindow

    function mountTurnstileWidget() {
      if (cancelled || !containerRef.current || !win.turnstile) return
      if (widgetIdRef.current && win.turnstile.remove) {
        try {
          win.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore cleanup errors
        }
      }
      containerRef.current.innerHTML = ''
      widgetIdRef.current = win.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token: string) => {
          toggleCallbackRef.current(true)
          tokenCallbackRef.current?.(token)
        },
        'expired-callback': () => {
          toggleCallbackRef.current(false)
          tokenCallbackRef.current?.(null)
        },
        'error-callback': () => {
          toggleCallbackRef.current(false)
          tokenCallbackRef.current?.(null)
        },
      })
    }

    if (win.turnstile) {
      mountTurnstileWidget()
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = TURNSTILE_SCRIPT_ID
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      const handleLoad = () => mountTurnstileWidget()
      script.addEventListener('load', handleLoad)
      return () => {
        cancelled = true
        script?.removeEventListener('load', handleLoad)
        if (widgetIdRef.current && win.turnstile?.remove) {
          try {
            win.turnstile.remove(widgetIdRef.current)
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && win.turnstile?.remove) {
        try {
          win.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-center text-[12px] font-medium text-teal-muted">
        Please enter the security code shown below to continue.
      </p>

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {/* Soft Salmon Security Code Capsule (Figma 34/35/38) */}
        <div className="inline-flex items-center justify-between gap-2 rounded-full bg-salmon px-5 py-2.5 text-white sm:min-w-[190px]">
          <span
            aria-label={`Kode keamanan ${code}`}
            className="select-none font-mono text-[14px] font-bold tracking-[0.2em]"
          >
            {code}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            title="Muat ulang kode keamanan"
            aria-label="Muat ulang kode keamanan"
            className="rounded-full bg-white/20 px-2 py-0.5 text-[12px] font-bold text-white transition-colors hover:bg-white/35"
          >
            ↻
          </button>
        </div>

        {/* White Outline Security Code Input Capsule */}
        <div className="flex-1 sm:max-w-[210px]">
          <label htmlFor={inputId} className="sr-only">
            Security Code
          </label>
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter code here"
            className={`w-full rounded-full border bg-white px-5 py-2.5 text-center text-[13px] font-semibold tracking-wider text-charcoal placeholder:font-normal placeholder:tracking-normal placeholder:text-teal-muted focus:outline-none ${
              isCodeMatch ? 'border-green-cta bg-green-soft/40' : 'border-salmon focus:border-coral'
            }`}
          />
        </div>
      </div>

      {/* Cloudflare Turnstile Official Widget or Dev Fallback Slot (SRS FR-08 / Decision A2) */}
      {TURNSTILE_SITE_KEY ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-border-soft bg-blush px-4 py-3">
          <div ref={containerRef} data-testid={`${idPrefix}-cf-turnstile`} />
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
              turnstileChecked ? 'bg-green-soft text-green-cta' : 'bg-white text-teal-muted'
            }`}
          >
            {turnstileChecked ? '✓ Cloudflare Turnstile Verified' : 'Cloudflare Turnstile Anti-Bot'}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border-soft bg-blush px-4 py-2.5 text-[12px]">
          <label htmlFor={turnstileId} className="flex cursor-pointer items-center gap-2.5 font-medium text-teal">
            <input
              id={turnstileId}
              type="checkbox"
              checked={turnstileChecked}
              onChange={(e) => {
                const next = e.target.checked
                onToggleTurnstile(next)
                onTurnstileToken?.(next ? 'turnstile-local-verified' : null)
              }}
              className="h-4 w-4 rounded accent-green-cta"
            />
            <span>Verifikasi saya bukan robot</span>
          </label>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
              turnstileChecked ? 'bg-green-soft text-green-cta' : 'bg-white text-teal-muted'
            }`}
          >
            {turnstileChecked ? '✓ Turnstile Ready' : 'Cloudflare Turnstile'}
          </span>
        </div>
      )}

      <div className="flex justify-center">
        <FieldError message={error} />
      </div>
    </div>
  )
}
