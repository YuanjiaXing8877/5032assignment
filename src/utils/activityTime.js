export function activityTimeInput(epoch) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(epoch).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function parseActivityTime(input) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error('Enter a valid Melbourne date and time.')
  const wallClock = Date.parse(`${input}:00Z`)
  let epoch = wallClock
  for (let i = 0; i < 3; i++) epoch += wallClock - Date.parse(`${activityTimeInput(epoch)}:00Z`)
  if (!Number.isFinite(epoch) || activityTimeInput(epoch) !== input) throw new Error('This Melbourne time does not exist because of daylight saving. Choose another time.')
  return epoch
}
