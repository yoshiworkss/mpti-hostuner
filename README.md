# Hostuner-25 — Frontend Web Application

Aplikasi Frontend portal layanan **Web Hosting IIX, Proxmox VPS Virtualizor, Paket Hosting Sekolah (`.sch.id`), Domain Indonesia, Client Area, & Admin Portal** untuk proyek **Manajemen Proyek TI (D3 TI SV UNS)**.

Dibangun dengan **React 19 + TypeScript + Vite 8 + Tailwind CSS v4**, selaras 1:1 dengan Figma `Page FIX V6` dan spesifikasi SRS (`05_SRS_Hostuner_25.docx`, `UC-01`–`UC-08`, `NFR-01`–`NFR-05`).

---

## 1. Perintah Utama (Local Development & Build)

```bash
# Install dependencies
npm install

# Jalankan server development (mode DEV mengaktifkan /tahap-1 QA workbench & helper dev)
npm run dev

# Cek kualitas kode & linting (Oxlint)
npm run lint

# Build produksi (TypeScript strict check + Vite code-split chunks; /tahap-1 otomatis di-tree-shake)
npm run build

# Pratinjau hasil build produksi secara lokal (import.meta.env.DEV === false)
npm run preview
```

---

## 2. Deployment ke Vercel (Siap SPA Deep-Linking)

Repositori ini sudah dilengkapi [vercel.json](./vercel.json) berisi:
- **SPA Rewrite** (`/(.*) -> /index.html`) agar *refresh* (`F5`) atau akses langsung ke rute seperti `/store/hosting-iix`, `/checkout`, atau `/admin` tidak menghasilkan 404.
- **Security Headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

### Cara Deploy ke Vercel (Tanpa Wajib Push ke GitHub Terlebih Dahulu)
1. Pastikan `npm run build` berjalan sukses.
2. Dari folder `hostuner-frontend`, jalankan Vercel CLI:
   ```bash
   npx vercel
   ```
   *(Atau untuk production deploy: `npx vercel --prod`)*
3. Jika suatu saat sudah dihubungkan ke GitHub + Vercel Dashboard, cukup pilih preset **Vite**, Build Command `npm run build`, Output Directory `dist`, dan isi *Environment Variables* sesuai [.env.example](./.env.example).

---

## 3. Panduan Serah Terima & Integrasi Backend (Untuk Hanif — Node.js REST API)

Saat ini Frontend berjalan dalam **mode mandiri (`localStorage`, storage key `hostuner_v6_frontend_state_v2`)** ketika `VITE_API_BASE_URL` kosong, sehingga dapat langsung diuji oleh UI/UX, QA, dan Klien.

Fondasi integrasi ke **Node.js REST API + SQLite/PostgreSQL** sudah disiapkan pada:
- **Environment variables:** [.env.example](./.env.example) (`VITE_API_BASE_URL`, `VITE_TURNSTILE_SITE_KEY`, `VITE_HOSTUNER_QRIS_IMAGE_URL`)
- **HTTP Client & Kontrak Endpoint:** [src/services/apiClient.ts](./src/services/apiClient.ts) (menggunakan `fetch` + `credentials: 'include'` untuk cookie `HttpOnly` JWT)
- **Tipe Data & Kontrak JSON (`NFR-05`):** [src/types/hostuner.ts](./src/types/hostuner.ts)
- **State Provider Aktif:** [src/context/HostunerRevisionProvider.tsx](./src/context/HostunerRevisionProvider.tsx)

### Format Respon Standar JSON (`05_SRS NFR-05`)
```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "errors": {}
}
```

### Daftar Endpoint REST API yang Disiapkan di `src/services/apiClient.ts`

| Modul | Method & Endpoint | Payload / Catatan Penting |
| :--- | :--- | :--- |
| **Auth** | `GET /api/auth/me` | Mengembalikan sesi `UserAccount` dari cookie `HttpOnly` JWT |
| **Auth** | `POST /api/auth/login` | `{ email, password, roleHint, turnstileToken }` — verifikasi password hash + Cloudflare Turnstile |
| **Auth** | `POST /api/auth/register` | `{ name, email, password, phone, company?, address?, city?, postcode?, country?, turnstileToken }` |
| **Auth** | `POST /api/auth/logout` | Menghapus cookie sesi JWT |
| **Catalog** | `GET /api/categories` | Mengembalikan 9 kategori Store (`StoreCategory[]`) |
| **Catalog** | `GET /api/products?category=:slug` | Mengembalikan katalog produk (`HostingProduct[]`) |
| **Orders** | `GET /api/orders/me` | Riwayat pesanan milik akun yang sedang login |
| **Invoices** | `GET /api/invoices/me` | Riwayat invoice milik akun yang sedang login |
| **Invoices** | `GET /api/invoices/:invoiceNumber` | Wajib cek kepemilikan (`invoice.userId === req.user.id || req.user.role === 'admin'`) |
| **Orders** | `POST /api/orders` | `{ items, paymentMethodId: "qris-statis", includePpn11 }` — menerbitkan order & invoice QRIS Statis (+ Kode Unik `Rp 128`) |
| **Tickets** | `GET /api/tickets/me`, `POST /api/tickets` | Mendukung JSON atau `FormData` untuk upload bukti scan QRIS (`.jpg/.png/.pdf`) |
| **Admin Product** | `POST /api/admin/products`, `PUT /api/admin/products/:id`, `DELETE /api/admin/products/:id` | Khusus `role === 'admin'` (`UC-05`) |
| **Admin User** | `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/:id`, `DELETE /api/admin/users/:id` | Khusus `role === 'admin'` (`UC-06`) |
| **Admin Billing** | `PATCH /api/admin/invoices/:id/pay` | Khusus `role === 'admin'` (`UC-08`: ubah invoice -> `paid` & order -> `active`) |

### Catatan Cakupan Integrasi Backend (Wajib Disinkronkan Bersama Hanif)
1. **6 Tabel Inti (`09_Skema_Database.sql`):** `users`, `categories`, `products`, `orders`, `order_items`, `invoices` sudah terpetakan langsung di `apiClient.ts`.
2. **Async Migration pada Provider:** Saat menghubungkan `HostunerRevisionProvider.tsx` ke `hostunerBackendApi`, ubah aksi mutasi (`loginUser`, `registerCustomer`, `createOrderForReviewItems`, `saveProduct`, `saveUser`, `markInvoicePaid`) dari sinkron menjadi `async / Promise<ApiResponse<T>>` dengan *submitting state* pada tombol.
3. **Cloudflare Turnstile (`FR-08`):** [VerificationCaptchaWidget.tsx](./src/components/auth/VerificationCaptchaWidget.tsx) saat ini menggunakan verifikasi lokal + slot Turnstile; setelah Hanif menyediakan `VITE_TURNSTILE_SITE_KEY` dan endpoint verifikasi secret key di backend, pasang widget script resmi Cloudflare Turnstile dan kirim token nyatanya lewat `turnstileToken`.
4. **Gambar QRIS Statis Resmi:** Set `VITE_HOSTUNER_QRIS_IMAGE_URL` (mis. taruh file di `public/qris-hostuner.png` lalu isi `/qris-hostuner.png`) agar tampil otomatis pada halaman Invoice (`/checkout/invoice/:invoiceNumber`).
5. **Modul Tambahan (Opsional di Backend / Tetap Lokal untuk Demo):** `Announcements`, `Knowledgebase`, `Downloads` (saat ini toast demo tanpa file PDF biner), `Contact Us` (state lokal), `Network Status`, `Affiliates`, dan `Activity Logs` dapat tetap dijalankan di state frontend atau dihubungkan ke tabel tambahan bila waktu sprint mencukupi.

---

## 4. Struktur Direktori Aktif (`src/`)

- `src/App.tsx` — Router utama dengan `React.lazy()` code-splitting (seluruh rute publik, auth, checkout, client, support, dan 6 modul admin).
- `src/context/HostunerRevisionProvider.tsx` — State provider aktif (QRIS Statis, per-user cart, login gate, RBAC, per-user invoices & tickets).
- `src/services/apiClient.ts` — HTTP client siap-pakai untuk REST API Node.js.
- `src/services/hostunerRevisionStore.ts` — Persisten lokal `v2` (QRIS Statis + sanitasi anti-bank lama).
- `src/components/layout/` — `PageShell`, `TopUtilityBar`, `CapsuleNavbar`, `HybridSidebar`, `Footer`.
- `src/components/admin/AdminAccessGuard.tsx` — Guard ketat khusus `role === 'admin'`.
- `src/pages/` — Seluruh halaman aktif Tahap 2–5 (`HomePage`, `StoreCategoryPage`, `DomainSearchPage`, `OrderFlowPages`, `ShoppingCartPage`, `ReviewCheckoutPage`, `QrisInvoicePage`, `AuthRevisionPages`, `ClientAreaPage`, `AnnouncementsPage`, `KnowledgebasePages`, `DownloadsPage`, `SupportPortalPages`, `AdminOverviewLogsPages`, `AdminCrudPages`, `AdminContentPaymentPages`, `NotFoundPage`).

---

## 5. Akun Demo & Catatan Pengujian QA (Untuk Zidnii)

- **Metode Pembayaran:** 100% **QRIS Statis Resmi Hostuner** (`NMID: ID1025008941203` + Kode Unik `Rp 128`). Tidak ada opsi transfer bank (`BCA`/`Mandiri`/`BNI`/`BRI`).
- **Akun Seed Lokal** *(mode lokal menerima password minimal 6 karakter; verifikasi password hash nyata aktif setelah backend tersambung)*:
  - Client 1 (punya layanan & invoice seed): `budi@sman1solo.sch.id`
  - Client 2 (akun bersih untuk uji isolasi data): `siti@bisniskami.co.id`
  - Administrator: `admin@hostuner.com` *(masuk melalui tombol `Login as Admin` pada `/login`)*
- **Catatan Transparan untuk Checklist QA:**
  - Pemilih bahasa (`English ▾ / Indonesia`) di Top Bar saat ini berfungsi sebagai indikator UI bahasa (teks halaman memakai campuran istilah teknis Inggris & deskripsi Indonesia sesuai standar Figma `Page FIX V6`).
  - Rute `/tahap-1` (QA Workbench) hanya aktif pada `npm run dev` dan terhapus otomatis dari hasil *production build* (`npm run build`).
