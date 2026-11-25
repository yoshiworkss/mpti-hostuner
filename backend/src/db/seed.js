import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { getDb } from '../config/db.js'
import { runMigrations } from './migrate.js'
import {
  DEFAULT_DEMO_PASSWORD,
  SEED_ANNOUNCEMENTS,
  SEED_CATEGORIES,
  SEED_INVOICES,
  SEED_KB_ARTICLES,
  SEED_LOGS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_TICKETS,
  SEED_USERS,
} from './seedData.js'

const __filename = fileURLToPath(import.meta.url)

/**
 * Idempotent Database Seeder for Hostuner-25.
 * When `reset = true`, wipes existing records first to restore a clean baseline.
 */
export function runSeed({ reset = false, db = getDb() } = {}) {
  runMigrations(db)
  const passwordHash = bcrypt.hashSync(DEFAULT_DEMO_PASSWORD, 10)

  const seedTx = db.transaction(() => {
    if (reset) {
      db.exec(`
        DELETE FROM contact_messages;
        DELETE FROM kb_articles;
        DELETE FROM announcements;
        DELETE FROM activity_logs;
        DELETE FROM tickets;
        DELETE FROM invoices;
        DELETE FROM order_items;
        DELETE FROM orders;
        DELETE FROM products;
        DELETE FROM categories;
        DELETE FROM users;
      `)
    }

    // 1. Seed Users (idempotent via INSERT OR IGNORE + UPDATE profile; pre-verified for demo/admin accounts)
    const upsertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, role, phone, company, address, city, postcode, country, status, email_verified, email_verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        phone = excluded.phone,
        company = excluded.company,
        address = excluded.address,
        city = excluded.city,
        postcode = excluded.postcode,
        country = excluded.country,
        status = excluded.status,
        email_verified = 1,
        email_verified_at = COALESCE(users.email_verified_at, excluded.email_verified_at)
    `)
    for (const u of SEED_USERS) {
      upsertUser.run(
        u.id,
        u.name,
        u.email,
        passwordHash,
        u.role,
        u.phone,
        u.company ?? null,
        u.address ?? null,
        u.city ?? null,
        u.postcode ?? null,
        u.country ?? 'Indonesia',
        u.status,
        u.createdAt,
        u.createdAt
      )
    }

    // 2. Seed 9 Store Categories
    const upsertCategory = db.prepare(`
      INSERT INTO categories (id, gid, name, slug, description)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        gid = excluded.gid,
        name = excluded.name,
        description = excluded.description
    `)
    for (const c of SEED_CATEGORIES) {
      upsertCategory.run(c.id, c.gid, c.name, c.slug, c.description)
    }

    // 3. Seed 15 Real Hostuner Products
    const upsertProduct = db.prepare(`
      INSERT INTO products (
        id, category_id, name, slug, price_monthly, price_annual,
        display_cycle, disk_space, bandwidth, specs, is_free_domain, stock_label, is_featured
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        category_id = excluded.category_id,
        name = excluded.name,
        price_monthly = excluded.price_monthly,
        price_annual = excluded.price_annual,
        display_cycle = excluded.display_cycle,
        disk_space = excluded.disk_space,
        bandwidth = excluded.bandwidth,
        specs = excluded.specs,
        is_free_domain = excluded.is_free_domain,
        stock_label = excluded.stock_label,
        is_featured = excluded.is_featured
    `)
    for (const p of SEED_PRODUCTS) {
      upsertProduct.run(
        p.id,
        p.categoryId,
        p.name,
        p.slug,
        p.priceMonthly,
        p.priceAnnual,
        p.displayCycle,
        p.diskSpace,
        p.bandwidth,
        JSON.stringify(p.specs),
        p.isFreeDomain ? 1 : 0,
        p.stockLabel ?? null,
        p.isFeatured ? 1 : 0
      )
    }

    // 4. Seed Initial Order #101 & Order Items
    const insertOrder = db.prepare(`
      INSERT OR IGNORE INTO orders (id, user_id, order_number, total_amount, order_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const checkOrderItems = db.prepare(`SELECT COUNT(*) AS cnt FROM order_items WHERE order_id = ?`)
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (
        item_uid, order_id, product_id, item_type, product_name,
        domain_name, domain_action, domain_price, billing_cycle,
        unit_price, subtotal, is_free_domain_applied
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const ord of SEED_ORDERS) {
      insertOrder.run(
        ord.id,
        ord.userId,
        ord.orderNumber,
        ord.totalAmountIdr,
        ord.orderStatus,
        ord.createdAt
      )
      const { cnt } = checkOrderItems.get(ord.id)
      if (Number(cnt) === 0) {
        for (const item of ord.items) {
          insertOrderItem.run(
            item.id,
            ord.id,
            item.productId ?? null,
            item.type,
            item.productName ?? null,
            item.domainName,
            item.domainAction ?? 'register',
            item.domainPriceIdr,
            item.billingCycle,
            item.unitPriceIdr,
            item.subtotalIdr,
            item.isFreeDomainApplied ? 1 : 0
          )
        }
      }
    }

    // 5. Seed Invoice #INV-2026-0892 (QRIS Statis + PPN 11% + Kode Unik Rp 128 = Rp 399.728)
    const upsertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, order_id, invoice_number, payment_method, payment_method_name,
        payment_status, subtotal_idr, annual_discount_saved_idr, domain_price_idr,
        setup_fee_idr, tax_rate_percent, tax_amount_idr, unique_code_idr,
        total_due_idr, items_summary, due_date, paid_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(invoice_number) DO NOTHING
    `)
    for (const inv of SEED_INVOICES) {
      upsertInvoice.run(
        inv.id,
        inv.orderId,
        inv.invoiceNumber,
        inv.paymentMethodId,
        inv.paymentMethodName,
        inv.paymentStatus,
        inv.breakdown.subtotalIdr,
        inv.breakdown.annualDiscountSavedIdr,
        inv.breakdown.domainPriceIdr,
        inv.breakdown.setupFeeIdr,
        inv.breakdown.taxRatePercent,
        inv.breakdown.taxAmountIdr,
        inv.breakdown.uniqueVerificationCodeIdr,
        inv.breakdown.totalDueIdr,
        JSON.stringify(inv.itemsSummary),
        inv.dueDate,
        inv.paidAt,
        inv.createdAt
      )
    }

    // 6. Seed Support Tickets
    const upsertTicket = db.prepare(`
      INSERT INTO tickets (
        ticket_uid, ticket_number, user_id, user_email, department,
        subject, message, invoice_number, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticket_number) DO NOTHING
    `)
    for (const t of SEED_TICKETS) {
      upsertTicket.run(
        t.id,
        t.ticketNumber,
        t.userId,
        t.userEmail,
        t.department,
        t.subject,
        t.message,
        t.invoiceNumber ?? null,
        t.status,
        t.createdAt
      )
    }

    // 7. Seed Announcements, KB Articles & Activity Logs
    const upsertAnn = db.prepare(`
      INSERT INTO announcements (ann_uid, date_label, month_group, title, body)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(ann_uid) DO NOTHING
    `)
    for (const a of SEED_ANNOUNCEMENTS) {
      upsertAnn.run(a.id, a.dateLabel, a.monthGroup, a.title, a.body)
    }

    const upsertKb = db.prepare(`
      INSERT INTO kb_articles (kb_uid, slug, category_slug, category_label, title, snippet, content, views, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO NOTHING
    `)
    for (const kb of SEED_KB_ARTICLES) {
      upsertKb.run(
        kb.id,
        kb.slug,
        kb.categorySlug,
        kb.categoryLabel,
        kb.title,
        kb.snippet,
        kb.content,
        kb.views,
        kb.updatedAt
      )
    }

    const upsertLog = db.prepare(`
      INSERT INTO activity_logs (log_uid, log_type, timestamp, badge, message)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(log_uid) DO NOTHING
    `)
    for (const l of SEED_LOGS) {
      upsertLog.run(l.id, l.logType, l.timestamp, l.badge, l.message)
    }
  })

  seedTx()
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const reset = process.argv.includes('--reset')
  runSeed({ reset })
  console.log(
    `[db:seed] Database seeded successfully (${reset ? 'hard reset' : 'idempotent'}). Demo password: "${DEFAULT_DEMO_PASSWORD}"`
  )
}
