import jwt from 'jsonwebtoken'
import { getDb } from '../config/db.js'
import { ENV } from '../config/env.js'
import { sendError } from '../utils/response.js'

export function signAuthToken(user) {
  return jwt.sign(
    {
      id: Number(user.id),
      email: user.email,
      role: user.role,
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  )
}

export function setAuthCookie(res, token) {
  const isProd = ENV.NODE_ENV === 'production'
  res.cookie(ENV.COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

export function clearAuthCookie(res) {
  const isProd = ENV.NODE_ENV === 'production'
  res.clearCookie(ENV.COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  })
}

export function extractTokenFromRequest(req) {
  if (req.cookies && req.cookies[ENV.COOKIE_NAME]) {
    return req.cookies[ENV.COOKIE_NAME]
  }
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  return null
}

/**
 * Middleware `requireAuth`:
 * - Verifies JWT from HttpOnly cookie (or Authorization Bearer header)
 * - Reloads live user record from SQLite
 * - Rejects unauthenticated guests with HTTP 401
 * - Rejects accounts with `status === 'SUSPENDED'` with HTTP 403
 */
export function requireAuth(req, res, next) {
  const token = extractTokenFromRequest(req)
  if (!token) {
    return sendError(res, 401, 'Sesi autentikasi tidak ditemukan. Silakan login terlebih dahulu.')
  }

  let decoded
  try {
    decoded = jwt.verify(token, ENV.JWT_SECRET)
  } catch {
    return sendError(res, 401, 'Sesi login tidak valid atau telah kedaluwarsa. Silakan login kembali.')
  }

  const db = getDb()
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(decoded.id))
  if (!userRow) {
    return sendError(res, 401, 'Akun pengguna tidak ditemukan.')
  }

  if (userRow.status === 'SUSPENDED') {
    return sendError(
      res,
      403,
      'Akun Anda sedang berstatus SUSPENDED. Hubungi tim Support Hostuner.',
      { email: 'Akun berstatus SUSPENDED.' }
    )
  }

  req.user = userRow
  return next()
}

/**
 * Middleware `requireAdmin`:
 * - Must run after `requireAuth`
 * - Ensures `req.user.role === 'admin'`, otherwise rejects with HTTP 403
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return sendError(res, 401, 'Silakan login terlebih dahulu.')
  }
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Akses ditolak. Halaman atau aksi ini khusus untuk Super Administrator.')
  }
  return next()
}
