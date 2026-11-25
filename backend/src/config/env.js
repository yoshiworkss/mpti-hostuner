import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const BACKEND_ROOT = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(BACKEND_ROOT, '.env') })

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'https://mpti-hostuner.vercel.app',
]

const parsedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

const nodeEnv = process.env.NODE_ENV || 'development'
const rawJwtSecret = (process.env.JWT_SECRET || '').trim()

const INSECURE_DEFAULT_SECRETS = new Set([
  '',
  'replace-with-strong-random-jwt-secret-in-production',
  'hostuner-25-mpti-uns-default-dev-secret',
])

export function assertProductionEnvSecurity(envMode = nodeEnv, jwtSecret = rawJwtSecret) {
  if (envMode === 'production' && INSECURE_DEFAULT_SECRETS.has(String(jwtSecret || '').trim())) {
    throw new Error(
      '[FATAL SECURITY] NODE_ENV=production mewajibkan JWT_SECRET yang kuat dan unik di backend/.env (tidak boleh kosong atau menggunakan nilai default)!'
    )
  }
}

assertProductionEnvSecurity()

export const ENV = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: process.env.DATABASE_URL || './data/hostuner.sqlite',
  JWT_SECRET: rawJwtSecret || 'hostuner-25-mpti-uns-default-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'hostuner_token',
  CORS_ALLOWED_ORIGINS: parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_ORIGINS,
  TURNSTILE_SECRET_KEY: (process.env.TURNSTILE_SECRET_KEY || '').trim(),
  TURNSTILE_DEV_BYPASS:
    process.env.TURNSTILE_DEV_BYPASS !== undefined
      ? process.env.TURNSTILE_DEV_BYPASS === 'true'
      : nodeEnv !== 'production',
  // Locked at 11% per final decision (01_FRONTEND_STATUS_DECISIONS_AND_GAPS.md & 05_SRS)
  PPN_RATE_PERCENT: 11,
  // Locked at Rp 128 per final decision (QRIS Statis verification code)
  UNIQUE_VERIFICATION_CODE_IDR: 128,
  // Email Verification (RF-02.3, NF-02.7, UC-03, UC-04 EX-02)
  APP_PUBLIC_URL: (process.env.APP_PUBLIC_URL || 'https://hostuner.yoshiworks.web.id').trim().replace(/\/+$/, ''),
  SMTP_HOST: (process.env.SMTP_HOST || '').trim(),
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: (process.env.SMTP_USER || '').trim(),
  SMTP_PASS: (process.env.SMTP_PASS || '').trim(),
  SMTP_FROM: (process.env.SMTP_FROM || 'Hostuner Portal <no-reply@hostuner.yoshiworks.web.id>').trim(),
  EMAIL_VERIFICATION_TTL_HOURS: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24),
}
