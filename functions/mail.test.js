import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMail, deliverMail, MAX_ATTACHMENT_BYTES } from './mail.js'

const input = () => ({ to: 'member@example.com', subject: 'Activity details', message: 'Please find the attached details.', attachments: [{ filename: 'details.txt', content: Buffer.from('Meeting at 9am.').toString('base64') }] })

test('preserves attachment bytes and uses configured sender and reply address', () => {
  const payload = buildMail(input(), 'sender@example.com', 'reply@example.com')
  assert.equal(Buffer.from(payload.attachments[0].content, 'base64').toString(), 'Meeting at 9am.')
  assert.equal(payload.from.email, 'sender@example.com')
  assert.equal(payload.reply_to.email, 'reply@example.com')
  assert.equal(payload.attachments[0].disposition, 'attachment')
})

test('rejects invalid recipient, missing attachments, malformed content and oversized files', () => {
  for (const change of [{ to: 'invalid' }, { subject: 'Header\r\ninjection' }, { attachments: [] }, { attachments: [{ filename: '../file', content: 'YQ==' }] }, { attachments: [{ filename: 'file', content: 'not base64' }] }, { attachments: [{ filename: 'file', content: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1).toString('base64') }] }]) {
    assert.throws(() => buildMail({ ...input(), ...change }, 'sender@example.com'))
  }
})

test('enforces combined attachment size', () => {
  const file = { filename: 'file.bin', content: Buffer.alloc(3 * 1024 * 1024).toString('base64') }
  assert.throws(() => buildMail({ ...input(), attachments: [file, file] }, 'sender@example.com'), /5 MB/)
})

test('sends the SendGrid request and reports only accepted responses as success', async () => {
  const payload = buildMail(input(), 'sender@example.com')
  const result = await deliverMail(payload, 'test-key', async (url, options) => {
    assert.equal(url, 'https://api.sendgrid.com/v3/mail/send')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.deepEqual(JSON.parse(options.body), payload)
    return { status: 202 }
  })
  assert.deepEqual(result, { accepted: true })
  await assert.rejects(deliverMail(payload, 'test-key', async () => ({ status: 401 })))
  await assert.rejects(deliverMail(payload, 'test-key', async () => { throw new Error('Network failure') }))
})
