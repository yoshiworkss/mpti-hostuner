import { getDb } from '../config/db.js'

/**
 * Standard JSON Response Helpers aligned with 05_SRS Section 5 (NFR-05):
 * `{ success: boolean, message: string, data: T | null, errors?: Record<string, string> }`
 */
export function sendSuccess(res, status, message, data = null) {
  return res.status(status).json({
    success: true,
    message,
    data,
  })
}

export function sendError(res, status, message, errors = undefined) {
  const payload = {
    success: false,
    message,
    data: null,
  }
  if (errors && Object.keys(errors).length > 0) {
    payload.errors = errors
  }
  return res.status(status).json(payload)
}

export function getNowTimestamp() {
  const d = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm}`
}

export function getIsoDateTime() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export function formatIdr(amountIdr) {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountIdr) || 0)
  return `Rp ${formatted}`
}

export function appendActivityLog(logType, badge, message, db = getDb()) {
  const logUid = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const timestamp = getNowTimestamp()
  db.prepare(`
    INSERT INTO activity_logs (log_uid, log_type, timestamp, badge, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(logUid, logType, timestamp, badge, message)
}
