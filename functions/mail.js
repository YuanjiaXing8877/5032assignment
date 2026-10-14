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
  if (response.status !== 202) throw new Error('Email provider rejected the request.')
  return { accepted: true }
}
