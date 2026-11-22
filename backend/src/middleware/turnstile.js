import { ENV } from '../config/env.js'
import { sendError } from '../utils/response.js'

/**
 * Cloudflare Turnstile Anti-Bot Verification Middleware (`05_SRS FR-08`).
 * - Used on `POST /api/auth/login` and `POST /api/auth/register`.
 * - If `turnstileToken === 'INVALID_TURNSTILE_TOKEN'`, always rejects with HTTP 400 (for automated negative testing).
 * - If `ENV.TURNSTILE_SECRET_KEY` is configured and `TURNSTILE_DEV_BYPASS` is false, verifies token against
 *   `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
 * - If `ENV.TURNSTILE_DEV_BYPASS` is true in development, accepts valid non-empty token or dev token,
 *   unless explicitly testing failure.
 */
export async function verifyTurnstile(req, res, next) {
  const token = req.body?.turnstileToken

  // Explicit test trigger for invalid captcha/turnstile token
  if (token === 'INVALID_TURNSTILE_TOKEN' || token === 'FAIL_CAPTCHA') {
    return sendError(res, 400, 'Verifikasi keamanan Cloudflare Turnstile gagal.', {
      captcha: 'Token verifikasi anti-bot tidak valid atau kedaluwarsa.',
    })
  }

  if (!ENV.TURNSTILE_DEV_BYPASS) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      return sendError(res, 400, 'Token verifikasi keamanan (Cloudflare Turnstile) wajib dikirim.', {
        captcha: 'Centang verifikasi anti-bot terlebih dahulu.',
      })
    }

    if (ENV.TURNSTILE_SECRET_KEY) {
      try {
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: ENV.TURNSTILE_SECRET_KEY,
            response: token.trim(),
          }),
        })
        const outcome = await resp.json()
        if (!outcome || outcome.success !== true) {
          return sendError(res, 400, 'Verifikasi keamanan Cloudflare Turnstile gagal.', {
            captcha: 'Validasi Cloudflare Turnstile ditolak.',
          })
        }
      } catch {
        return sendError(res, 502, 'Gagal menghubungi server verifikasi Cloudflare Turnstile.')
      }
    }
  }

  return next()
}
