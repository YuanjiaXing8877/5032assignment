import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { palette } from '../src/theme.js'
import { ratingKeyValue } from '../src/utils/accessibility.js'
import { directionsUrl } from '../src/utils/geo.js'

function luminance(hex) {
  const values = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722
}
const ratio = (foreground, background) => {
  const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b)
  return (high + .05) / (low + .05)
}

test('shared theme text colours meet AA on the surfaces where they are used', () => {
  for (const background of ['#ffffff', palette.soft, palette.page, '#e8e5df', '#e8edf3']) {
    for (const foreground of [palette.ink, palette.accent, palette.strong, palette.muted, palette.error]) {
      assert.ok(ratio(foreground, background) >= 4.5, `${foreground} on ${background}`)
    }
  }
  assert.ok(ratio('#ffffff', palette.accent) >= 4.5)
  assert.ok(ratio('#8a5700', '#ffffff') >= 4.5)
  assert.ok(ratio(palette.border, '#ffffff') >= 3)
  assert.ok(ratio(palette.focus, palette.soft) >= 3)
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
  for (const [token, value] of [['accent', palette.accent], ['accent-strong', palette.strong], ['page', palette.page], ['muted', palette.muted], ['control-border', palette.border], ['focus', palette.focus]]) assert.ok(css.includes(`--${token}: ${value};`))
})
test('rating arrow keys wrap, Home and End select boundaries, and ordinary keys keep native behaviour', () => {
  assert.equal(ratingKeyValue('ArrowRight', 5), 1)
  assert.equal(ratingKeyValue('ArrowLeft', 1), 5)
  assert.equal(ratingKeyValue('ArrowUp', 2), 3)
  assert.equal(ratingKeyValue('ArrowDown', 4), 3)
  assert.equal(ratingKeyValue('Home', 4), 1)
  assert.equal(ratingKeyValue('End', 2), 5)
  assert.equal(ratingKeyValue('Tab', 2), null)
  assert.equal(ratingKeyValue(' ', 2), null)
})
test('text directions preserve the selected endpoints and mode without requesting device location', () => {
  const url = new URL(directionsUrl({lat:-37.8,lng:144.9}, {lat:-37.9,lng:145}, 'WALKING'))
  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.searchParams.get('api'), '1')
  assert.equal(url.searchParams.get('origin'), '-37.8,144.9')
  assert.equal(url.searchParams.get('destination'), '-37.9,145')
  assert.equal(url.searchParams.get('travelmode'), 'walking')
  assert.throws(() => directionsUrl({}, {}, 'invalid'))
})
