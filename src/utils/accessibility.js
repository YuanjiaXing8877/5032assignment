import { nextTick } from 'vue'

export async function focusTarget(selector, { scroll = true } = {}) {
  await nextTick()
  const target = typeof selector === 'string' ? document.querySelector(selector) : selector
  if (!target) return
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
  if (scroll) target.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}

export async function focusFirstError(form) {
  await nextTick()
  const element = typeof form === 'string' ? document.querySelector(form) : form
  await focusTarget(element?.querySelector('[aria-invalid="true"], :invalid'), { scroll: true })
}

export function ratingKeyValue(key, current) {
  if (key === 'Home') return 1
  if (key === 'End') return 5
  if (['ArrowRight', 'ArrowUp'].includes(key)) return current === 5 ? 1 : current + 1
  if (['ArrowLeft', 'ArrowDown'].includes(key)) return current === 1 ? 5 : current - 1
  return null
}
