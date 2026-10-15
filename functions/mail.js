export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

export function buildMail(data, from, replyTo) {
  const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
  if (!data || typeof data.to !== 'string' || data.to.length > 254 || !emailPattern.test(data.to)) throw new Error('Enter a valid recipient email address.')
  if (typeof data.subject !== 'string' || !data.subject.trim() || data.subject.length > 150 || /[\r\n]/.test(data.subject)) throw new Error('Enter a subject of up to 150 characters.')
  if (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 10000) throw new Error('Enter a message of up to 10,000 characters.')
  if (!Array.isArray(data.attachments) || data.attachments.length < 1 || data.attachments.length > 5) throw new Error('Attach between one and five files.')
  let total = 0
  const attachments = data.attachments.map((file) => {
    if (!file || typeof file.filename !== 'string' || !file.filename.trim() || file.filename.length > 180 || /[\x00-\x1f\x7f/\\]/.test(file.filename)) throw new Error('Invalid attachment filename.')
    if (typeof file.content !== 'string' || !file.content.length || file.content.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) throw new Error('Invalid attachment content.')
    const bytes = Buffer.from(file.content, 'base64')
    if (bytes.toString('base64') !== file.content) throw new Error('Invalid attachment content.')
    total += bytes.length
    if (total > MAX_ATTACHMENT_BYTES) throw new Error('Attachments must total 5 MB or less.')
    return { filename: file.filename, content: file.content, type: 'application/octet-stream', disposition: 'attachment' }
  })
  return {
    personalizations: [{ to: [{ email: data.to }] }],
    from: { email: from, name: 'GreenLink Melbourne' },
    ...(replyTo ? { reply_to: { email: replyTo } } : {}),
    subject: data.subject.trim(),
    content: [{ type: 'text/plain', value: data.message }],
    attachments
  }
}

export async function deliverMail(payload, apiKey, fetcher = fetch) {
  const response = await fetcher('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  })
  if (response.status !== 202) {
    // Inspect provider errors without logging recipients, message bodies or files.
    const detail = await response.text().catch(() => '')
    let code = 'unavailable'
    let reason = 'provider-unavailable'
    let message = 'The email service rejected this request. Please try again later.'
    if (/verified sender|sender identity|from address.*verified/i.test(detail)) {
      code = 'failed-precondition'
      reason = 'sender-unverified'
      message = 'The sender email has not been verified. Complete sender verification before sending.'
    } else if (response.status === 401) {
      code = 'failed-precondition'
      reason = 'invalid-api-key'
      message = 'The email service API key is invalid or expired. Please contact the administrator.'
    } else if (response.status === 403) {
      code = 'failed-precondition'
      reason = 'sending-not-authorised'
      message = 'The email service has not authorised sending. Check the account status and Mail Send permission.'
    } else if (response.status === 429 || /credits.*exceeded|maximum credits|quota/i.test(detail)) {
      code = 'resource-exhausted'
      reason = 'provider-limit'
      message = 'The email service sending limit has been reached. Please check the sending allowance.'
    } else if (response.status === 400 || response.status === 413) {
      code = 'invalid-argument'
      reason = 'provider-validation'
      message = 'The email service rejected the message or attachments. Check the recipient and selected files.'
    }
    const error = new Error(message)
    Object.assign(error, { code, reason, providerStatus: response.status })
    throw error
  }
  return { accepted: true }
}
