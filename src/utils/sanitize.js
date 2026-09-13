const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g
const ANGLE_BRACKETS = /[<>]/g
const REPEATED_WHITESPACE = /\s+/g

function normalise(value) {
  return String(value ?? '').normalize('NFKC')
}

export function sanitizePlainText(value, maxLength = 100) {
  return normalise(value)
    .replace(CONTROL_CHARACTERS, '')
    .replace(ANGLE_BRACKETS, '')
    .replace(REPEATED_WHITESPACE, ' ')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeEmail(value) {
  return normalise(value)
    .replace(CONTROL_CHARACTERS, '')
    .replace(ANGLE_BRACKETS, '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
}

export function sanitizePhone(value) {
  return sanitizePlainText(value, 24)
}
