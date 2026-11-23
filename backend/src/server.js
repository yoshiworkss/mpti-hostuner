import { createApp } from './app.js'
import { ENV } from './config/env.js'
import { runSeed } from './db/seed.js'

// Initialize 3NF SQLite tables & idempotent seed data on startup
runSeed({ reset: false })

const app = createApp()

app.listen(ENV.PORT, () => {
  console.log(`====================================================================`)
  console.log(`  HOSTUNER-25 BACKEND REST API (Node.js + Express + SQLite 3NF)`)
  console.log(`  Listening on : http://localhost:${ENV.PORT}/api`)
  console.log(`  Payment Rule : 100% QRIS Statis (qris-statis) + PPN ${ENV.PPN_RATE_PERCENT}% + Rp ${ENV.UNIQUE_VERIFICATION_CODE_IDR}`)
  console.log(`  CORS Origins : ${ENV.CORS_ALLOWED_ORIGINS.join(', ')}`)
  console.log(`====================================================================`)
})
