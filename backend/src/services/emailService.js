import nodemailer from 'nodemailer'
import { ENV } from '../config/env.js'

/**
 * Checks whether real SMTP credentials are configured in backend/.env.
 */
export function isSmtpConfigured() {
  return Boolean(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS)
}

/**
 * Sends a registration email verification link (RF-02.3, NF-02.7, UC-03).
 * - Uses real SMTP via nodemailer when SMTP_HOST/USER/PASS are configured.
 * - Falls back cleanly to simulation mode (returning a preview URL for demo/UAT
 *   without requiring paid third-party email infrastructure) when SMTP is unset.
 */
export async function sendVerificationEmail({ to, name, verifyUrl, expiresHours = ENV.EMAIL_VERIFICATION_TTL_HOURS }) {
  const safeName = String(name || 'Pelanggan Hostuner').trim()

  if (!isSmtpConfigured()) {
    console.log(`[email:simulation] Verification link for ${to}: ${verifyUrl}`)
    return {
      delivered: true,
      deliveryMode: 'simulation',
      previewUrl: verifyUrl,
    }
  }

  const transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
  })

  const textBody = [
    `Halo ${safeName},`,
    '',
    'Terima kasih telah mendaftar di Website Portal Hostuner-25.',
    'Silakan verifikasi alamat email Anda dengan membuka tautan berikut agar akun Anda aktif:',
    '',
    verifyUrl,
    '',
    `Tautan ini berlaku selama ${expiresHours} jam.`,
    'Jika Anda tidak merasa mendaftar akun di Hostuner, abaikan email ini.',
    '',
    'Salam hangat,',
    'Tim Hostuner Webhosting',
  ].join('\n')

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
      <div style="background: #23535f; color: #ffffff; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 20px;">Verifikasi Email Akun Hostuner-25</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Terima kasih telah mendaftar di Website Portal <strong>Hostuner-25</strong>. Sebelum dapat login dan melakukan pemesanan layanan, silakan verifikasi alamat email Anda melalui tombol di bawah ini:</p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${verifyUrl}" style="background: #ea6f58; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: bold; display: inline-block;">
            Verifikasi Email Sekarang
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">Atau salin tautan berikut ke browser Anda:<br/><a href="${verifyUrl}" style="color: #23535f;">${verifyUrl}</a></p>
        <p style="font-size: 12px; color: #6b7280;">Tautan ini berlaku selama ${expiresHours} jam. Abaikan email ini jika Anda tidak merasa mendaftar.</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: ENV.SMTP_FROM,
    to,
    subject: 'Verifikasi Email Akun Anda — Hostuner-25',
    text: textBody,
    html: htmlBody,
  })

  return {
    delivered: true,
    deliveryMode: 'smtp',
    previewUrl: null,
  }
}
