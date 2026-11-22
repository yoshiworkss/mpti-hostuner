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
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runMigrations()
  console.log('[db:migrate] SQLite 3NF schema migrations applied successfully.')
}
