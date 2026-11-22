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

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: process.env.DATABASE_URL || './data/hostuner.sqlite',
  JWT_SECRET: process.env.JWT_SECRET || 'hostuner-25-mpti-uns-default-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'hostuner_token',
  CORS_ALLOWED_ORIGINS: parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_ORIGINS,
  TURNSTILE_SECRET_KEY: (process.env.TURNSTILE_SECRET_KEY || '').trim(),
  TURNSTILE_DEV_BYPASS:
    process.env.TURNSTILE_DEV_BYPASS !== undefined
      ? process.env.TURNSTILE_DEV_BYPASS === 'true'
      : (process.env.NODE_ENV || 'development') !== 'production',
  // Locked at 11% per final decision (01_FRONTEND_STATUS_DECISIONS_AND_GAPS.md & 05_SRS)
  PPN_RATE_PERCENT: 11,
  // Locked at Rp 128 per final decision (QRIS Statis verification code)
  UNIQUE_VERIFICATION_CODE_IDR: 128,
}
