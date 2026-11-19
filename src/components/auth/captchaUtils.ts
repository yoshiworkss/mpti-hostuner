const CAPTCHA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const DEFAULT_CAPTCHA_CODE = 'ILYHTTYD'

export function generateCaptchaCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += CAPTCHA_ALPHABET[Math.floor(Math.random() * CAPTCHA_ALPHABET.length)]
  }
  return out
}
