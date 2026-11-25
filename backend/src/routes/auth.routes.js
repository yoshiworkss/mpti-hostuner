import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getDb } from '../config/db.js'
import { ENV } from '../config/env.js'
import { clearAuthCookie, requireAuth, setAuthCookie, signAuthToken } from '../middleware/auth.js'
import { verifyTurnstile } from '../middleware/turnstile.js'
import { sendVerificationEmail } from '../services/emailService.js'
import { mapUserRow } from '../utils/dto.js'
import { appendActivityLog, getIsoDateTime, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ENV.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000).toISOString()
  return { token, expiresAt }
}

function resolvePublicBaseUrl(req) {
  const reqOrigin = String(req.headers.origin || '').trim().replace(/\/+$/, '')
  if (reqOrigin && ENV.CORS_ALLOWED_ORIGINS.includes(reqOrigin)) {
    return reqOrigin
  }
  return ENV.APP_PUBLIC_URL
}

function buildVerifyUrl(req, token, redirectTo) {
  const base = resolvePublicBaseUrl(req)
  const params = new URLSearchParams({ token })
  if (redirectTo && typeof redirectTo === 'string' && redirectTo.startsWith('/')) {
    params.set('redirect', redirectTo)
  }
  return `${base}/verify-email?${params.toString()}`
}

/**
 * GET /api/auth/me
 * Returns currently authenticated user from HttpOnly JWT cookie.
 */
router.get('/me', requireAuth, (req, res) => {
  return sendSuccess(res, 200, 'Sesi pengguna aktif.', mapUserRow(req.user))
})

/**
 * POST /api/auth/login
 * Validates credentials, Turnstile token, account status (ACTIVE vs SUSPENDED),
 * email verification status (RF-02.3 / NF-02.7 / UC-04 EX-02), and roleHint.
 */
router.post('/login', verifyTurnstile, (req, res) => {
  const { email, password, roleHint } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  const errors = {}
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    errors.email = 'Masukkan alamat email yang valid.'
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    errors.password = 'Password wajib diisi minimal 6 karakter.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi form login gagal.', errors)
  }

  const db = getDb()
  const userRow = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (!userRow || !bcrypt.compareSync(cleanPassword, userRow.password)) {
    return sendError(res, 401, 'Email atau password tidak valid.', {
      email: 'Email atau password yang Anda masukkan salah.',
    })
  }

  if (userRow.status === 'SUSPENDED') {
    return sendError(
      res,
      403,
      'Akun ini sedang berstatus SUSPENDED. Hubungi tim Support Hostuner.',
      { email: 'Akun ini sedang berstatus SUSPENDED.' }
    )
  }

  // UC-04 EX-02 & NF-02.7: Block login until user completes email verification
  if (!userRow.email_verified) {
    return sendError(
      res,
      403,
      'Akun Anda belum diverifikasi. Silakan buka tautan verifikasi pada email Anda terlebih dahulu sebelum login.',
      {
        email: 'Email belum diverifikasi. Cek kotak masuk Anda atau kirim ulang tautan verifikasi.',
        code: 'EMAIL_NOT_VERIFIED',
      }
    )
  }

  if (roleHint === 'admin' && userRow.role !== 'admin') {
    return sendError(
      res,
      403,
      'Akun ini tidak memiliki hak akses Administrator. Gunakan akun Admin atau kembali ke Login Client.',
      { email: 'Akun ini bukan Administrator.' }
    )
  }

  const token = signAuthToken(userRow)
  setAuthCookie(res, token)
  appendActivityLog(
    'user',
    'LOGIN',
    `${userRow.name} (${userRow.email}) berhasil masuk sebagai ${userRow.role.toUpperCase()}`,
    db
  )

  return sendSuccess(res, 200, 'Login berhasil.', mapUserRow(userRow))
})

/**
 * POST /api/auth/register
 * Registers a new customer account with bcrypt password hashing (RF-02.1, RF-02.2),
 * generates a 24h email verification token, and sends a verification email (RF-02.3, NF-02.7, UC-03).
 * Does NOT auto-login until email verification is completed.
 */
router.post('/register', verifyTurnstile, async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    company,
    address,
    city,
    postcode,
    country,
    redirectTo,
  } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')
  const cleanPhone = String(phone || '').trim()

  const errors = {}
  if (cleanName.length < 2) {
    errors.name = 'Nama lengkap wajib diisi minimal 2 karakter.'
  }
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    errors.email = 'Format alamat email tidak valid.'
  }
  if (cleanPassword.length < 6) {
    errors.password = 'Password wajib diisi minimal 6 karakter.'
  }
  if (cleanPhone.length < 8) {
    errors.phone = 'Nomor telepon wajib diisi minimal 8 karakter.'
  }
  if (Object.keys(errors).length > 0) {
    return sendError(res, 422, 'Validasi data pendaftaran gagal.', errors)
  }

  const db = getDb()
  const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (existing) {
    return sendError(res, 409, 'Email sudah terdaftar.', {
      email: 'Alamat email ini sudah digunakan. Silakan login atau gunakan email lain.',
    })
  }

  const passwordHash = bcrypt.hashSync(cleanPassword, 10)
  const createdAt = getIsoDateTime()
  const { token: verifyToken, expiresAt } = generateVerificationToken()

  const info = db
    .prepare(
      `INSERT INTO users (
        name, email, password, role, phone, company, address, city, postcode, country,
        status, email_verified, email_verified_at, verification_token, verification_token_expires_at, created_at
       )
       VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, NULL, ?, ?, ?)`
    )
    .run(
      cleanName,
      cleanEmail,
      passwordHash,
      cleanPhone,
      company ? String(company).trim() : null,
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      postcode ? String(postcode).trim() : null,
      country ? String(country).trim() : 'Indonesia',
      verifyToken,
      expiresAt,
      createdAt
    )

  const newUserRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(info.lastInsertRowid))
  const verifyUrl = buildVerifyUrl(req, verifyToken, redirectTo)

  let delivery = { delivered: true, deliveryMode: 'simulation', previewUrl: verifyUrl }
  try {
    delivery = await sendVerificationEmail({
      to: cleanEmail,
      name: cleanName,
      verifyUrl,
    })
  } catch (mailErr) {
    console.error('[auth/register] Failed sending SMTP verification email:', mailErr)
    return sendError(
      res,
      502,
      'Akun berhasil dibuat, namun gagal mengirim email verifikasi SMTP. Gunakan tombol Kirim Ulang Verifikasi.'
    )
  }

  appendActivityLog(
    'user',
    'REGISTER',
    `${newUserRow.name} (${newUserRow.email}) mendaftar akun baru (menunggu verifikasi email)`,
    db
  )

  return sendSuccess(
    res,
    201,
    'Registrasi berhasil. Silakan verifikasi alamat email Anda sebelum login.',
    {
      ...mapUserRow(newUserRow),
      verificationRequired: true,
      deliveryMode: delivery.deliveryMode,
      verificationPreviewUrl: delivery.previewUrl,
    }
  )
})

function handleVerifyEmail(req, res) {
  const rawToken = String(req.body?.token ?? req.query?.token ?? '').trim()
  if (!rawToken || rawToken.length < 16) {
    return sendError(res, 400, 'Token verifikasi email tidak valid atau kosong.', {
      token: 'Token verifikasi tidak valid.',
    })
  }

  const db = getDb()
  const userRow = db
    .prepare(`SELECT * FROM users WHERE verification_token = ?`)
    .get(rawToken)

  if (!userRow) {
    return sendError(
      res,
      400,
      'Token verifikasi email tidak valid atau sudah pernah digunakan. Silakan login atau kirim ulang email verifikasi.',
      { token: 'Token tidak ditemukan atau sudah digunakan.' }
    )
  }

  if (userRow.verification_token_expires_at) {
    const expiresMs = Date.parse(userRow.verification_token_expires_at)
    if (Number.isFinite(expiresMs) && expiresMs < Date.now()) {
      return sendError(
        res,
        400,
        'Tautan verifikasi email sudah kedaluwarsa. Silakan kirim ulang email verifikasi.',
        { token: 'Token verifikasi kedaluwarsa.' }
      )
    }
  }

  const verifiedAt = getIsoDateTime()
  db.prepare(
    `UPDATE users
     SET email_verified = 1,
         email_verified_at = ?,
         verification_token = NULL,
         verification_token_expires_at = NULL
     WHERE id = ?`
  ).run(verifiedAt, Number(userRow.id))

  const updatedRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(userRow.id))
  appendActivityLog(
    'user',
    'VERIFY',
    `${updatedRow.name} (${updatedRow.email}) menyelesaikan verifikasi email dan mengaktifkan akun`,
    db
  )

  return sendSuccess(
    res,
    200,
    'Verifikasi email berhasil! Akun Anda kini aktif, silakan login.',
    mapUserRow(updatedRow)
  )
}

/**
 * GET & POST /api/auth/verify-email
 * Verifies token from email link and activates user account (RF-02.3, UC-03).
 */
router.get('/verify-email', handleVerifyEmail)
router.post('/verify-email', handleVerifyEmail)

/**
 * POST /api/auth/resend-verification
 * Generates a fresh verification token and resends the verification email.
 */
router.post('/resend-verification', async (req, res) => {
  const { email, redirectTo } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return sendError(res, 422, 'Masukkan alamat email yang valid.', {
      email: 'Format alamat email tidak valid.',
    })
  }

  const db = getDb()
  const userRow = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(cleanEmail)
  if (!userRow) {
    return sendError(res, 404, 'Alamat email tidak terdaftar pada sistem Hostuner.', {
      email: 'Email tidak ditemukan.',
    })
  }

  if (userRow.email_verified) {
    return sendError(res, 400, 'Akun dengan email ini sudah terverifikasi. Silakan langsung login.', {
      email: 'Email sudah terverifikasi.',
    })
  }

  const { token: nextToken, expiresAt } = generateVerificationToken()
  db.prepare(
    `UPDATE users
     SET verification_token = ?, verification_token_expires_at = ?
     WHERE id = ?`
  ).run(nextToken, expiresAt, Number(userRow.id))

  const verifyUrl = buildVerifyUrl(req, nextToken, redirectTo)
  let delivery = { delivered: true, deliveryMode: 'simulation', previewUrl: verifyUrl }
  try {
    delivery = await sendVerificationEmail({
      to: userRow.email,
      name: userRow.name,
      verifyUrl,
    })
  } catch (mailErr) {
    console.error('[auth/resend-verification] Failed sending SMTP email:', mailErr)
    return sendError(res, 502, 'Gagal mengirim ulang email verifikasi melalui SMTP.')
  }

  return sendSuccess(res, 200, 'Tautan verifikasi email baru telah dikirim.', {
    email: userRow.email,
    deliveryMode: delivery.deliveryMode,
    verificationPreviewUrl: delivery.previewUrl,
  })
})

/**
 * POST /api/auth/logout
 * Clears HttpOnly JWT cookie.
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  return sendSuccess(res, 200, 'Anda telah keluar dari sesi.', null)
})

export default router
