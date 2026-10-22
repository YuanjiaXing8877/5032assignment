import { httpsCallable } from 'firebase/functions'
import { emailFunctions } from './firebase'

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

export function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ filename: file.name, content: reader.result.split(',')[1] })
    reader.onerror = () => reject(new Error('Unable to read the attachment. Please select it again.'))
    reader.onabort = () => reject(new Error('Attachment reading was cancelled.'))
    reader.readAsDataURL(file)
  })
}

export function validateAttachments(files, required = true) {
  if ((required && !files.length) || files.length > 5 || files.some(file => !file.size) || files.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_BYTES) throw new Error(required ? 'Choose one to five non-empty files, totalling 5 MB or less.' : 'Choose up to five non-empty files, totalling 5 MB or less.')
}

export async function sendBulkEmail(payload) {
  if (!emailFunctions) throw new Error('Email service is unavailable.')
  const result = await httpsCallable(emailFunctions, 'sendBulkEmail', { timeout: 70000 })(payload)
  return result.data
}

export async function sendEmail({ to, subject, message, files }) {
  if (!emailFunctions) throw new Error('Email service is unavailable.')
  validateAttachments(files)
  const attachments = await Promise.all(files.map(encodeFile))
  const result = await httpsCallable(emailFunctions, 'sendEmail')({ to: to.trim(), subject: subject.trim(), message, attachments })
  if (!result.data?.accepted) throw new Error('Unable to confirm email acceptance.')
}
