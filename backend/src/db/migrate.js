import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDb } from '../config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function runMigrations(db = getDb()) {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf-8')
  db.exec(sql)

  // Idempotent in-place column migration for existing SQLite databases (RF-02.3 / NF-02.7)
  const userCols = new Set(db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name))
  if (!userCols.has('email_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;`)
  }
  if (!userCols.has('email_verified_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified_at VARCHAR(40);`)
    db.exec(`UPDATE users SET email_verified_at = created_at WHERE email_verified = 1 AND email_verified_at IS NULL;`)
  }
  if (!userCols.has('verification_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN verification_token VARCHAR(128);`)
  }
  if (!userCols.has('verification_token_expires_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN verification_token_expires_at VARCHAR(40);`)
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runMigrations()
  console.log('[db:migrate] SQLite 3NF schema migrations applied successfully.')
}
