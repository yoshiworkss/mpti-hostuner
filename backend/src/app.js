import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { ENV } from './config/env.js'
import adminRoutes from './routes/admin.routes.js'
import authRoutes from './routes/auth.routes.js'
import catalogRoutes from './routes/catalog.routes.js'
import contentRoutes from './routes/content.routes.js'
import ordersRoutes from './routes/orders.routes.js'
import ticketsRoutes from './routes/tickets.routes.js'
import { sendError, sendSuccess } from './utils/response.js'

export function createApp() {
  const app = express()

  // Trust reverse proxy (Nginx / Cloudflare on VPS) for HTTPS secure cookies & client IP
  app.set('trust proxy', 1)

  // Explicit CORS whitelist with credentials: true (02_BACKEND_API_AND_DATABASE_CONTRACT.md Section 1.B)
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (e.g., Postman, curl, server-to-server)
        if (!origin) return callback(null, true)
        const normalizedOrigin = origin.replace(/\/+$/, '')
        if (ENV.CORS_ALLOWED_ORIGINS.includes(normalizedOrigin)) {
          return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} tidak diizinkan oleh kebijakan CORS Hostuner-25.`))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // Healthcheck Endpoint
  app.get('/api/health', (_req, res) => {
    return sendSuccess(res, 200, 'Hostuner-25 REST API operational.', {
      service: 'hostuner-25-backend',
      status: 'ok',
      trustProxy: Boolean(app.get('trust proxy')),
      paymentMethod: 'qris-statis',
      ppnRatePercent: ENV.PPN_RATE_PERCENT,
      uniqueVerificationCodeIdr: ENV.UNIQUE_VERIFICATION_CODE_IDR,
      allowedOrigins: ENV.CORS_ALLOWED_ORIGINS,
    })
  })

  // Mount API routes
  app.use('/api/auth', authRoutes)
  app.use('/api', catalogRoutes)
  app.use('/api', ordersRoutes)
  app.use('/api/tickets', ticketsRoutes)
  app.use('/api', contentRoutes)
  app.use('/api/admin', adminRoutes)

  // Standard 404 Not Found JSON response (SRS NFR-05)
  app.use((req, res) => {
    return sendError(res, 404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`)
  })

  // Global Error Handler (SRS NFR-05)
  app.use((err, _req, res, _next) => {
    if (err && String(err.message || '').includes('CORS')) {
      return sendError(res, 403, err.message)
    }
    const status = err.statusCode || 500
    return sendError(res, status, err.message || 'Terjadi kesalahan internal pada server API Hostuner.')
  })

  return app
}
