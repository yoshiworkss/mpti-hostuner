import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { closeDb, getDb } from '../src/config/db.js'
import { assertProductionEnvSecurity } from '../src/config/env.js'
import { runSeed } from '../src/db/seed.js'

/**
 * End-to-End Automated Test Suite for Hostuner-25 Backend REST API.
 * Verifies all Priority 1 & Priority 2 endpoints, 3NF SQLite constraints,
 * VPS hardening (trust proxy, production JWT_SECRET fail-fast),
 * camelCase DTO contracts, and HTTP status codes (200/201/400/401/403/404/409/422).
 */
async function runAllTests() {
  console.log('====================================================================')
  console.log('  HOSTUNER-25 BACKEND AUTOMATED VERIFICATION SUITE')
  console.log('====================================================================')

  // Reset & seed clean database baseline
  runSeed({ reset: true })
  const app = createApp()
  const server = app.listen(0)
  const { port } = server.address()
  const BASE = `http://127.0.0.1:${port}/api`

  let passed = 0
  function recordPass(label) {
    passed += 1
    console.log(`  [PASS #${String(passed).padStart(2, '0')}] ${label}`)
  }

  async function request(path, { method = 'GET', body, cookie, origin } = {}) {
    const headers = {}
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (cookie) headers['Cookie'] = cookie
    if (origin) headers['Origin'] = origin

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    })

    const setCookieHeader = res.headers.get('set-cookie') || ''
    const cookiePair = setCookieHeader ? setCookieHeader.split(';')[0] : null
    const json = await res.json().catch(() => null)
    return { status: res.status, headers: res.headers, cookie: cookiePair, json }
  }

  try {
    // 0. VPS Hardening Checks (Production Fail-Fast JWT_SECRET & Trust Proxy)
    {
      assert.throws(() => {
        assertProductionEnvSecurity('production', 'replace-with-strong-random-jwt-secret-in-production')
      }, /FATAL SECURITY/)
      assert.throws(() => {
        assertProductionEnvSecurity('production', '')
      }, /FATAL SECURITY/)
      assert.doesNotThrow(() => {
        assertProductionEnvSecurity('production', 'strong-production-random-secret-99887766')
      })
      recordPass('VPS Hardening: assertProductionEnvSecurity rejects default/empty JWT_SECRET in production')
    }

    // 1. Healthcheck, Trust Proxy & CORS Policy
    {
      const res = await request('/health', { origin: 'https://mpti-hostuner.vercel.app' })
      assert.equal(res.status, 200)
      assert.equal(res.json.success, true)
      assert.equal(res.json.data.trustProxy, true)
      assert.equal(res.json.data.paymentMethod, 'qris-statis')
      assert.equal(res.json.data.ppnRatePercent, 11)
      assert.equal(res.json.data.uniqueVerificationCodeIdr, 128)
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://mpti-hostuner.vercel.app')
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
      recordPass('GET /api/health (trustProxy: true) & CORS whitelist (https://mpti-hostuner.vercel.app) -> 200')

      const badCors = await request('/health', { origin: 'https://evil-attacker.example.com' })
      assert.equal(badCors.status, 403)
      assert.equal(badCors.json.success, false)
      recordPass('CORS rejects non-whitelisted origin -> 403')
    }

    // 2. Public Catalog (9 Categories, 15 Real Products, Domain Checker, Contact Us)
    {
      const catRes = await request('/categories')
      assert.equal(catRes.status, 200)
      assert.equal(catRes.json.data.length, 9)
      assert.equal(catRes.json.data[0].slug, 'hosting-iix')
      assert.equal(catRes.json.data[6].slug, 'paket-hosting-sekolah')
      recordPass('GET /api/categories returns 9 exact Hostuner categories -> 200')

      const prodRes = await request('/products')
      assert.equal(prodRes.status, 200)
      assert.equal(prodRes.json.data.length, 15)
      const hostingPro = prodRes.json.data.find((p) => p.slug === 'hosting-pro')
      assert.ok(hostingPro)
      assert.equal(hostingPro.categorySlug, 'hosting-iix')
      assert.equal(hostingPro.priceMonthly, 30000)
      assert.equal(hostingPro.priceAnnual, 360000)
      assert.equal(hostingPro.isFreeDomain, true)
      assert.ok(Array.isArray(hostingPro.specs))
      recordPass('GET /api/products returns 15 real products in camelCase DTO format -> 200')

      const filteredRes = await request('/products?category=paket-hosting-sekolah&freeDomain=true')
      assert.equal(filteredRes.status, 200)
      assert.equal(filteredRes.json.data.length, 1)
      assert.equal(filteredRes.json.data[0].stockLabel, '59 Available')
      recordPass('GET /api/products?category=paket-hosting-sekolah&freeDomain=true -> 200')

      const domOk = await request('/domain/check?domain=sman1surakarta.sch.id')
      assert.equal(domOk.status, 200)
      assert.equal(domOk.json.data.available, true)
      assert.equal(domOk.json.data.tld, '.sch.id')
      assert.equal(domOk.json.data.newPriceIdr, 55000)
      recordPass('GET /api/domain/check (available .sch.id domain) -> 200')

      const domTaken = await request('/domain/check?domain=portalbisniskami.com')
      assert.equal(domTaken.status, 200)
      assert.equal(domTaken.json.data.available, false)
      recordPass('GET /api/domain/check (domain already ordered) -> 200 (available: false)')

      const domInvalid = await request('/domain/check?domain=invalid_domain')
      assert.equal(domInvalid.status, 422)
      assert.equal(domInvalid.json.success, false)
      recordPass('GET /api/domain/check (invalid domain format) -> 422')

      const contactOk = await request('/contact', {
        method: 'POST',
        body: {
          name: 'Calon Pelanggan UNS',
          email: 'calon@uns.ac.id',
          subject: 'Pertanyaan Paket Sekolah',
          message: 'Apakah gratis domain .sch.id sudah termasuk aktivasi?',
        },
      })
      assert.equal(contactOk.status, 201)
      recordPass('POST /api/contact stores pre-sales contact inquiry -> 201')
    }

    // 3. Authentication, Turnstile Verification & Password Hashing
    let budiCookie = null
    let sitiCookie = null
    let adminCookie = null
    let newCustomerId = null

    {
      const guestMe = await request('/auth/me')
      assert.equal(guestMe.status, 401)
      recordPass('GET /api/auth/me rejects unauthenticated Guest -> 401')

      const badCaptcha = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'budi@sman1solo.sch.id',
          password: 'Hostuner25!',
          turnstileToken: 'INVALID_TURNSTILE_TOKEN',
        },
      })
      assert.equal(badCaptcha.status, 400)
      assert.ok(badCaptcha.json.errors?.captcha)
      recordPass('POST /api/auth/login rejects invalid Turnstile token -> 400')

      const invalidLoginForm = await request('/auth/login', {
        method: 'POST',
        body: { email: 'not-an-email', password: '123' },
      })
      assert.equal(invalidLoginForm.status, 422)
      assert.ok(invalidLoginForm.json.errors?.email)
      assert.ok(invalidLoginForm.json.errors?.password)
      recordPass('POST /api/auth/login rejects malformed input -> 422')

      const wrongPass = await request('/auth/login', {
        method: 'POST',
        body: { email: 'budi@sman1solo.sch.id', password: 'WrongPassword123' },
      })
      assert.equal(wrongPass.status, 401)
      recordPass('POST /api/auth/login rejects wrong password -> 401')

      const customerAsAdmin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'budi@sman1solo.sch.id',
          password: 'Hostuner25!',
          roleHint: 'admin',
        },
      })
      assert.equal(customerAsAdmin.status, 403)
      recordPass('POST /api/auth/login blocks customer from Admin login mode -> 403')

      const budiLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'budi@sman1solo.sch.id', password: 'Hostuner25!' },
      })
      assert.equal(budiLogin.status, 200)
      assert.ok(budiLogin.cookie)
      assert.equal(budiLogin.json.data.email, 'budi@sman1solo.sch.id')
      assert.equal(budiLogin.json.data.role, 'customer')
      assert.equal('password' in budiLogin.json.data, false)
      budiCookie = budiLogin.cookie
      recordPass('POST /api/auth/login succeeds for Budi & issues HttpOnly JWT cookie (no password field) -> 200')

      const sitiLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'siti@bisniskami.co.id', password: 'Hostuner25!' },
      })
      assert.equal(sitiLogin.status, 200)
      sitiCookie = sitiLogin.cookie

      const dupReg = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Budi Duplicate',
          email: 'budi@sman1solo.sch.id',
          password: 'Hostuner25!',
          phone: '081226008891',
        },
      })
      assert.equal(dupReg.status, 409)
      recordPass('POST /api/auth/register rejects duplicate email -> 409')

      const newReg = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Hanif Tester',
          email: 'hanif.tester@student.uns.ac.id',
          password: 'Hostuner25!',
          phone: '083172758008',
          company: 'D3 TI SV UNS',
          city: 'Surakarta',
        },
      })
      assert.equal(newReg.status, 201)
      assert.equal(newReg.cookie, null)
      assert.equal(newReg.json.data.role, 'customer')
      assert.equal(newReg.json.data.emailVerified, false)
      assert.equal(newReg.json.data.verificationRequired, true)
      assert.ok(newReg.json.data.verificationPreviewUrl)
      assert.equal('password' in newReg.json.data, false)
      newCustomerId = newReg.json.data.id

      // Verify password in SQLite is bcrypt-hashed & account awaits email verification
      const dbRow = getDb()
        .prepare(`SELECT password, email_verified, verification_token FROM users WHERE id = ?`)
        .get(newCustomerId)
      assert.ok(dbRow.password.startsWith('$2'))
      assert.equal(dbRow.email_verified, 0)
      assert.ok(dbRow.verification_token && dbRow.verification_token.length >= 32)
      recordPass('POST /api/auth/register creates unverified customer with bcrypt hash & verification token (no auto-login) -> 201')

      // UC-04 EX-02: Login MUST be rejected (403 EMAIL_NOT_VERIFIED) before email verification
      const unverifiedLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'hanif.tester@student.uns.ac.id', password: 'Hostuner25!' },
      })
      assert.equal(unverifiedLogin.status, 403)
      assert.equal(unverifiedLogin.json.errors?.code, 'EMAIL_NOT_VERIFIED')
      recordPass('POST /api/auth/login blocks unverified account (UC-04 EX-02 / NF-02.7) -> 403')

      // Invalid token rejected -> 400
      const badTokenRes = await request('/auth/verify-email', {
        method: 'POST',
        body: { token: 'invalid-token-00000000000000000000' },
      })
      assert.equal(badTokenRes.status, 400)
      recordPass('POST /api/auth/verify-email rejects invalid token -> 400')

      // Resend verification rotates token cleanly -> 200
      const resendRes = await request('/auth/resend-verification', {
        method: 'POST',
        body: { email: 'hanif.tester@student.uns.ac.id' },
      })
      assert.equal(resendRes.status, 200)
      const rotatedPreviewUrl = resendRes.json.data.verificationPreviewUrl
      const rotatedToken = new URL(rotatedPreviewUrl).searchParams.get('token')
      assert.ok(rotatedToken && rotatedToken !== dbRow.verification_token)
      recordPass('POST /api/auth/resend-verification rotates verification token -> 200')

      // Verify email with valid token activates account -> 200
      const verifyOk = await request('/auth/verify-email', {
        method: 'POST',
        body: { token: rotatedToken },
      })
      assert.equal(verifyOk.status, 200)
      assert.equal(verifyOk.json.data.emailVerified, true)
      assert.ok(verifyOk.json.data.emailVerifiedAt)

      // Replay of used token must fail -> 400
      const replayVerify = await request('/auth/verify-email', {
        method: 'POST',
        body: { token: rotatedToken },
      })
      assert.equal(replayVerify.status, 400)
      recordPass('POST /api/auth/verify-email activates account & prevents token replay -> 200 / 400')

      // Login now succeeds after email verification -> 200
      const verifiedLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'hanif.tester@student.uns.ac.id', password: 'Hostuner25!' },
      })
      assert.equal(verifiedLogin.status, 200)
      assert.ok(verifiedLogin.cookie)
      recordPass('POST /api/auth/login succeeds after email verification -> 200')
    }

    // 4. Seed Invoice #INV-2026-0892 & Strict Ownership Isolation
    {
      const guestInv = await request('/invoices/INV-2026-0892')
      assert.equal(guestInv.status, 401)
      recordPass('GET /api/invoices/INV-2026-0892 rejects Guest -> 401')

      const sitiInv = await request('/invoices/INV-2026-0892', { cookie: sitiCookie })
      assert.equal(sitiInv.status, 403)
      recordPass('GET /api/invoices/INV-2026-0892 rejects other customer (Siti viewing Budi invoice) -> 403')

      const missingInv = await request('/invoices/INV-2026-9999', { cookie: budiCookie })
      assert.equal(missingInv.status, 404)
      recordPass('GET /api/invoices/:invoiceNumber returns 404 for unknown invoice -> 404')

      const budiInv = await request('/invoices/INV-2026-0892', { cookie: budiCookie })
      assert.equal(budiInv.status, 200)
      assert.equal(budiInv.json.data.invoiceNumber, 'INV-2026-0892')
      assert.equal(budiInv.json.data.paymentMethodId, 'qris-statis')
      assert.equal(budiInv.json.data.breakdown.subtotalIdr, 360000)
      assert.equal(budiInv.json.data.breakdown.taxRatePercent, 11)
      assert.equal(budiInv.json.data.breakdown.taxAmountIdr, 39600)
      assert.equal(budiInv.json.data.breakdown.uniqueVerificationCodeIdr, 128)
      assert.equal(budiInv.json.data.breakdown.totalDueIdr, 399728)
      recordPass('GET /api/invoices/INV-2026-0892 returns exact Rp 399.728 breakdown to owner (Budi) -> 200')
    }

    // 5. Order Creation (Server-side Price Calculation, PPN 11% + Rp 128, Domain-Only Nullable product_id)
    {
      const bankTransferOrder = await request('/orders', {
        method: 'POST',
        cookie: budiCookie,
        body: {
          paymentMethodId: 'bca-va',
          items: [
            {
              type: 'hosting_domain',
              productId: 1,
              domainName: 'sekolahku.com',
              billingCycle: 'annually',
            },
          ],
        },
      })
      assert.equal(bankTransferOrder.status, 422)
      recordPass('POST /api/orders strictly rejects non-QRIS payment method (e.g. BCA) -> 422')

      // (a) Hosting + Annual Free Domain (with client attempting price tampering subtotalIdr: 100)
      const orderHostingFreeDom = await request('/orders', {
        method: 'POST',
        cookie: budiCookie,
        body: {
          paymentMethodId: 'qris-statis',
          includePpn11: true,
          items: [
            {
              id: 'cart-1',
              type: 'hosting_domain',
              productId: 7, // Hosting Pro (Rp 360.000/yr, isFreeDomain: true)
              domainName: 'akademiksolo.com',
              domainAction: 'register',
              billingCycle: 'annually',
              unitPriceIdr: 100, // tampered by client!
              subtotalIdr: 100, // tampered by client!
            },
          ],
        },
      })
      assert.equal(orderHostingFreeDom.status, 201)
      assert.equal(orderHostingFreeDom.json.data.breakdown.subtotalIdr, 360000)
      assert.equal(orderHostingFreeDom.json.data.breakdown.domainPriceIdr, 0)
      assert.equal(orderHostingFreeDom.json.data.breakdown.taxRatePercent, 11)
      assert.equal(orderHostingFreeDom.json.data.breakdown.taxAmountIdr, 39600)
      assert.equal(orderHostingFreeDom.json.data.breakdown.uniqueVerificationCodeIdr, 128)
      assert.equal(orderHostingFreeDom.json.data.breakdown.totalDueIdr, 399728)
      recordPass('POST /api/orders recalculates server-side price (ignores tampered client price) + Free Domain -> 201')

      // (b) Domain-Only Order (`productId: null`)
      const orderDomainOnly = await request('/orders', {
        method: 'POST',
        cookie: sitiCookie,
        body: {
          paymentMethodId: 'qris-statis',
          includePpn11: true,
          items: [
            {
              id: 'cart-dom-1',
              type: 'domain_only',
              domainName: 'tokositi.co.id', // .co.id = Rp 275.000
              domainAction: 'register',
              billingCycle: 'annually',
              unitPriceIdr: 275000,
              subtotalIdr: 275000,
            },
          ],
        },
      })
      assert.equal(orderDomainOnly.status, 201)
      // Rp 275.000 + PPN 11% (Rp 30.250) + Kode Unik Rp 128 = Rp 305.378
      assert.equal(orderDomainOnly.json.data.breakdown.subtotalIdr, 275000)
      assert.equal(orderDomainOnly.json.data.breakdown.taxAmountIdr, 30250)
      assert.equal(orderDomainOnly.json.data.breakdown.uniqueVerificationCodeIdr, 128)
      assert.equal(orderDomainOnly.json.data.breakdown.totalDueIdr, 305378)
      recordPass('POST /api/orders succeeds for Domain-Only order (order_items.product_id = NULL) -> 201')
    }

    // 6. Support Tickets (`requireAuth` on GET /api/tickets/me and POST /api/tickets, JSON & FormData)
    {
      const guestTickets = await request('/tickets/me')
      assert.equal(guestTickets.status, 401)
      const guestPostTicket = await request('/tickets', {
        method: 'POST',
        body: {
          department: 'Konfirmasi Pembayaran',
          subject: 'Tes Guest',
          message: 'Pesan dari guest tanpa login',
        },
      })
      assert.equal(guestPostTicket.status, 401)
      recordPass('GET /api/tickets/me & POST /api/tickets reject Guest (requireAuth) -> 401')

      const formData = new FormData()
      formData.append('department', 'Konfirmasi Pembayaran')
      formData.append('subject', 'Bukti Scan QRIS INV-2026-0892 (FormData)')
      formData.append('message', 'Sudah transfer Rp 399.728 via QRIS Statis Hostuner.')
      formData.append('invoiceNumber', 'INV-2026-0892')
      const fakePngBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
      formData.append('attachment', fakePngBlob, 'bukti-qris.png')

      const budiCreateTicket = await request('/tickets', {
        method: 'POST',
        cookie: budiCookie,
        body: formData,
      })
      assert.equal(budiCreateTicket.status, 201)
      assert.equal(budiCreateTicket.json.data.userEmail, 'budi@sman1solo.sch.id')
      recordPass('POST /api/tickets (multipart/form-data file upload) creates ticket for authenticated customer -> 201')
    }

    // 7. Admin Portal Guard, CRUD Product, CRUD User, Self-Delete Guard & UC-08 Atomic Confirm Paid
    {
      const customerAdminTry = await request('/admin/users', { cookie: budiCookie })
      assert.equal(customerAdminTry.status, 403)
      recordPass('GET /api/admin/users rejects Customer role -> 403')

      const adminLogin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'admin@hostuner.com',
          password: 'Hostuner25!',
          roleHint: 'admin',
        },
      })
      assert.equal(adminLogin.status, 200)
      adminCookie = adminLogin.cookie
      recordPass('POST /api/auth/login succeeds for Super Administrator (admin@hostuner.com) -> 200')

      // Admin CRUD Product
      const createProd = await request('/admin/products', {
        method: 'POST',
        cookie: adminCookie,
        body: {
          categorySlug: 'cloud-hosting-plesk',
          name: 'Plesk Cloud Starter',
          priceMonthly: 45000,
          priceAnnual: 459000,
          displayCycle: 'monthly',
          diskSpace: '2 GB NVMe',
          bandwidth: 'Unmetered',
          specs: ['2 GB NVMe Space', 'Plesk Onyx Panel', 'Free SSL'],
          isFreeDomain: false,
          isFeatured: true,
        },
      })
      assert.equal(createProd.status, 201)
      const createdProdId = createProd.json.data.id

      const updateProd = await request(`/admin/products/${createdProdId}`, {
        method: 'PUT',
        cookie: adminCookie,
        body: {
          categorySlug: 'cloud-hosting-plesk',
          name: 'Plesk Cloud Starter V2',
          priceMonthly: 50000,
          priceAnnual: 510000,
          displayCycle: 'monthly',
          diskSpace: '4 GB NVMe',
          bandwidth: 'Unmetered',
          specs: ['4 GB NVMe Space', 'Plesk Onyx Panel'],
          isFreeDomain: true,
          isFeatured: true,
        },
      })
      assert.equal(updateProd.status, 200)
      assert.equal(updateProd.json.data.name, 'Plesk Cloud Starter V2')

      const delUsedProd = await request('/admin/products/7', {
        method: 'DELETE',
        cookie: adminCookie,
      })
      assert.equal(delUsedProd.status, 409)
      recordPass('DELETE /api/admin/products/:id protects product referenced by order_items -> 409')

      const delNewProd = await request(`/admin/products/${createdProdId}`, {
        method: 'DELETE',
        cookie: adminCookie,
      })
      assert.equal(delNewProd.status, 200)
      recordPass('POST / PUT / DELETE /api/admin/products CRUD lifecycle -> 201 / 200')

      // Admin Self-Delete Protection
      const selfDel = await request('/admin/users/99', {
        method: 'DELETE',
        cookie: adminCookie,
      })
      assert.equal(selfDel.status, 400)
      recordPass('DELETE /api/admin/users/99 blocks Admin self-deletion -> 400')

      // Admin Suspend User & Verify Suspended Login Block
      const suspendUser = await request(`/admin/users/${newCustomerId}`, {
        method: 'PUT',
        cookie: adminCookie,
        body: {
          name: 'Hanif Tester',
          email: 'hanif.tester@student.uns.ac.id',
          phone: '083172758008',
          role: 'customer',
          status: 'SUSPENDED',
        },
      })
      assert.equal(suspendUser.status, 200)
      assert.equal(suspendUser.json.data.status, 'SUSPENDED')

      const suspendedLogin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'hanif.tester@student.uns.ac.id',
          password: 'Hostuner25!',
        },
      })
      assert.equal(suspendedLogin.status, 403)
      recordPass('Suspended user account is blocked from logging in -> 403')

      const delTestUser = await request(`/admin/users/${newCustomerId}`, {
        method: 'DELETE',
        cookie: adminCookie,
      })
      assert.equal(delTestUser.status, 200)
      recordPass('PUT / DELETE /api/admin/users CRUD lifecycle -> 200')

      // UC-08 Confirm Invoice Paid (Atomic Transaction: invoice -> paid, paidAt filled, order -> active)
      const confirmPaid = await request('/admin/invoices/1/pay', {
        method: 'PATCH',
        cookie: adminCookie,
      })
      assert.equal(confirmPaid.status, 200)
      assert.equal(confirmPaid.json.data.paymentStatus, 'paid')
      assert.ok(confirmPaid.json.data.paidAt)

      const budiOrdersAfterPay = await request('/orders/me', { cookie: budiCookie })
      assert.equal(budiOrdersAfterPay.status, 200)
      const seedOrder101 = budiOrdersAfterPay.json.data.find((o) => o.id === 101)
      assert.ok(seedOrder101)
      assert.equal(seedOrder101.orderStatus, 'active')
      recordPass('PATCH /api/admin/invoices/1/pay (UC-08) atomically updates invoice->paid & order->active -> 200')

      // 36. Full E2E Smoke Flow (Wrong password -> Register -> Logout -> Incognito Re-login -> Checkout -> 403 Other User -> Admin Confirm PAID -> Remote Invoice PAID & Order Active)
      const smokeWrongLogin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'budi@sman1solo.sch.id',
          password: 'SalahPassword999!',
          turnstileToken: 'turnstile-local-verified',
        },
      })
      assert.equal(smokeWrongLogin.status, 401)
      assert.equal(smokeWrongLogin.cookie, null)

      const smokeRegister = await request('/auth/register', {
        method: 'POST',
        body: {
          name: 'Raka Pratama',
          email: 'raka.smoke@hostuner.test',
          phone: '081277788899',
          password: 'Hostuner25!',
          company: 'SMK Negeri 5 Surakarta',
          address: 'Jl. Adi Sucipto No. 42',
          city: 'Surakarta',
          postcode: '57143',
          country: 'Indonesia',
          turnstileToken: 'turnstile-local-verified',
        },
      })
      assert.equal(smokeRegister.status, 201)
      assert.equal(smokeRegister.cookie, null)
      assert.equal(smokeRegister.json.data.verificationRequired, true)
      const rakaToken = new URL(smokeRegister.json.data.verificationPreviewUrl).searchParams.get('token')
      assert.ok(rakaToken)

      // Unverified login blocked -> 403
      const rakaBlockedLogin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'raka.smoke@hostuner.test',
          password: 'Hostuner25!',
          turnstileToken: 'turnstile-local-verified',
        },
      })
      assert.equal(rakaBlockedLogin.status, 403)
      assert.equal(rakaBlockedLogin.json.errors?.code, 'EMAIL_NOT_VERIFIED')

      // Verify email via GET /api/auth/verify-email?token=... -> 200
      const rakaVerify = await request(`/auth/verify-email?token=${encodeURIComponent(rakaToken)}`)
      assert.equal(rakaVerify.status, 200)
      assert.equal(rakaVerify.json.data.emailVerified, true)

      // Now login succeeds & issues HttpOnly cookie
      const rakaRelogin = await request('/auth/login', {
        method: 'POST',
        body: {
          email: 'raka.smoke@hostuner.test',
          password: 'Hostuner25!',
          turnstileToken: 'turnstile-local-verified',
        },
      })
      assert.equal(rakaRelogin.status, 200)
      const rakaCookie = rakaRelogin.cookie
      assert.ok(rakaCookie && rakaCookie.includes('hostuner_token='))

      // Verify /api/auth/me returns full profile for bootstrapFromBackend merge into prev.users
      const rakaMe = await request('/auth/me', { cookie: rakaCookie })
      assert.equal(rakaMe.status, 200)
      assert.equal(rakaMe.json.data.email, 'raka.smoke@hostuner.test')
      assert.equal(rakaMe.json.data.emailVerified, true)

      // Checkout Hosting + Domain order -> QRIS invoice
      const rakaCheckout = await request('/orders', {
        method: 'POST',
        cookie: rakaCookie,
        body: {
          paymentMethodId: 'qris-statis',
          includePpn11: true,
          items: [
            {
              id: 'cart-smoke-1',
              type: 'hosting_domain',
              productId: 1,
              domainName: 'smkn5solo-smoke.sch.id',
              domainAction: 'register',
              billingCycle: 'annually',
            },
          ],
        },
      })
      assert.equal(rakaCheckout.status, 201)
      const rakaInvoiceNum = rakaCheckout.json.data.invoiceNumber
      const rakaInvoiceId = rakaCheckout.json.data.id

      // Other user (Budi) opening Raka's invoice gets 403
      const budiForbiddenOnRaka = await request(`/invoices/${encodeURIComponent(rakaInvoiceNum)}`, {
        cookie: budiCookie,
      })
      assert.equal(budiForbiddenOnRaka.status, 403)

      // Admin confirms PAID (UC-08) -> Remote GET /api/invoices/:invoiceNumber returns paymentStatus: 'paid' & order is 'active'
      const adminPayRaka = await request(`/admin/invoices/${rakaInvoiceId}/pay`, {
        method: 'PATCH',
        cookie: adminCookie,
      })
      assert.equal(adminPayRaka.status, 200)

      const rakaRemoteInvoiceAfterPay = await request(`/invoices/${encodeURIComponent(rakaInvoiceNum)}`, {
        cookie: rakaCookie,
      })
      assert.equal(rakaRemoteInvoiceAfterPay.status, 200)
      assert.equal(rakaRemoteInvoiceAfterPay.json.data.paymentStatus, 'paid')

      const rakaOrdersAfterPay = await request('/orders/me', { cookie: rakaCookie })
      assert.equal(rakaOrdersAfterPay.status, 200)
      assert.equal(rakaOrdersAfterPay.json.data[0].orderStatus, 'active')
      recordPass('Full E2E Smoke Flow (401 rollback -> Register -> Incognito Re-login -> Checkout QRIS -> 403 Ownership -> Admin UC-08 PAID -> Remote Invoice PAID & Order Active)')
    }

    // Re-seed clean state after tests so database is left in pristine initial state
    runSeed({ reset: true })

    console.log('====================================================================')
    console.log(`  ALL ${passed} END-TO-END BACKEND TESTS PASSED (100% GREEN)`)
    console.log('====================================================================')
  } finally {
    server.close()
    closeDb()
  }
}

runAllTests().catch((err) => {
  console.error('[TEST FAILURE]', err)
  process.exit(1)
})
