import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { BACKEND_ROOT, ENV } from './env.js'

let dbInstance = null
let txDepth = 0

export function resolveDbPath(customUrl = ENV.DATABASE_URL) {
  if (customUrl === ':memory:') return ':memory:'
  const resolved = path.isAbsolute(customUrl)
    ? customUrl
    : path.resolve(BACKEND_ROOT, customUrl)
  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return resolved
}

export function getDb() {
  if (!dbInstance) {
    const dbPath = resolveDbPath()
    const rawDb = new DatabaseSync(dbPath)
    rawDb.exec('PRAGMA foreign_keys = ON;')
    rawDb.exec('PRAGMA journal_mode = WAL;')

    /**
     * Wraps a synchronous callback inside an atomic SQLite transaction
     * (`BEGIN IMMEDIATE ... COMMIT` / `ROLLBACK`), supporting nested savepoints.
     */
    rawDb.transaction = function transaction(fn) {
      return (...args) => {
        const isTopLevel = txDepth === 0
        const savepointName = `sp_${txDepth}`
        txDepth += 1
        try {
          if (isTopLevel) {
            rawDb.exec('BEGIN IMMEDIATE;')
          } else {
            rawDb.exec(`SAVEPOINT ${savepointName};`)
          }
          const result = fn(...args)
          if (isTopLevel) {
            rawDb.exec('COMMIT;')
          } else {
            rawDb.exec(`RELEASE SAVEPOINT ${savepointName};`)
          }
          return result
        } catch (err) {
          if (isTopLevel) {
            try {
              rawDb.exec('ROLLBACK;')
            } catch {
              // ignore rollback errors
            }
          } else {
            try {
              rawDb.exec(`ROLLBACK TO SAVEPOINT ${savepointName};`)
              rawDb.exec(`RELEASE SAVEPOINT ${savepointName};`)
            } catch {
              // ignore savepoint rollback errors
            }
          }
          throw err
        } finally {
          txDepth -= 1
        }
      }
    }

    dbInstance = rawDb
  }
  return dbInstance
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    txDepth = 0
  }
}
