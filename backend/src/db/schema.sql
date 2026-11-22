-- ==============================================================================
-- DATABASE SCHEMA: HOSTUNER BILLING & MODERNIZATION (HOSTUNER-25)
-- Mata Kuliah: Manajemen Proyek Teknologi Informasi (MPTI)
-- D3 Teknik Informatika - Universitas Sebelas Maret (UNS)
-- Normalisasi: 3NF (Third Normal Form) | RDBMS: SQLite (Kompatibel PostgreSQL)
-- Diselaraskan 100% dengan 02_BACKEND_API_AND_DATABASE_CONTRACT.md & src/types/hostuner.ts
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. TABEL INTI 1: USERS (Otentikasi, Profil Billing & Multi-Role: Admin vs Customer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    phone VARCHAR(25) NOT NULL DEFAULT '',
    company VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Indonesia',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
);

-- ------------------------------------------------------------------------------
-- 2. TABEL INTI 2: CATEGORIES (9 Kategori Layanan Hosting Hostuner)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gid VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
);

-- ------------------------------------------------------------------------------
-- 3. TABEL INTI 3: PRODUCTS (15 Paket Layanan Hosting & VPS Riil Hostuner)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    price_monthly DECIMAL(12, 2) NOT NULL,
    price_annual DECIMAL(12, 2) NOT NULL,
    display_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (display_cycle IN ('monthly', 'annually')),
    disk_space VARCHAR(50) NOT NULL,
    bandwidth VARCHAR(50) NOT NULL,
    specs TEXT NOT NULL DEFAULT '[]',
    is_free_domain BOOLEAN NOT NULL DEFAULT 0,
    stock_label VARCHAR(50),
    is_featured BOOLEAN NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- 4. TABEL INTI 4: ORDERS (Header Transaksi Pemesanan Layanan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    order_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'active', 'cancelled')),
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 5. TABEL INTI 5: ORDER_ITEMS (Rincian Item Pesanan — product_id NULLABLE untuk Domain-Only!)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_uid VARCHAR(60),
    order_id INTEGER NOT NULL,
    product_id INTEGER NULL,
    item_type VARCHAR(30) NOT NULL DEFAULT 'hosting_domain' CHECK (item_type IN ('hosting_domain', 'domain_only', 'domain_transfer')),
    product_name VARCHAR(150),
    domain_name VARCHAR(255) NOT NULL,
    domain_action VARCHAR(20) DEFAULT 'register' CHECK (domain_action IN ('register', 'transfer', 'existing')),
    domain_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'annually' CHECK (billing_cycle IN ('monthly', 'annually')),
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    is_free_domain_applied BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- 6. TABEL INTI 6: INVOICES (Faktur Tagihan QRIS Statis + PPN 11% + Kode Unik Rp 128)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER UNIQUE NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'qris-statis' CHECK (payment_method = 'qris-statis'),
    payment_method_name VARCHAR(100) NOT NULL DEFAULT 'QRIS Statis Resmi Hostuner',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'expired')),
    subtotal_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    annual_discount_saved_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    domain_price_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    setup_fee_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate_percent INTEGER NOT NULL DEFAULT 11,
    tax_amount_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unique_code_idr INTEGER NOT NULL DEFAULT 128,
    total_due_idr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    items_summary TEXT NOT NULL DEFAULT '[]',
    due_date VARCHAR(50) NOT NULL,
    paid_at VARCHAR(50),
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- TABEL PENDUKUNG (Prioritas 2: Support Tickets, Activity Logs, Announcements, KB)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_uid VARCHAR(50) UNIQUE NOT NULL,
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL CHECK (department IN ('Konfirmasi Pembayaran', 'Support')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    invoice_number VARCHAR(50),
    attachment_path VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Answered', 'Customer-Reply', 'Closed')),
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_uid VARCHAR(50) UNIQUE NOT NULL,
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('product', 'user', 'payment')),
    timestamp VARCHAR(50) NOT NULL,
    badge VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ann_uid VARCHAR(50) UNIQUE NOT NULL,
    date_label VARCHAR(30) NOT NULL,
    month_group VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_uid VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    category_slug VARCHAR(30) NOT NULL CHECK (category_slug IN ('hosting', 'vps')),
    category_label VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 1,
    updated_at VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
);

-- ------------------------------------------------------------------------------
-- INDEKS PERFORMA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
