import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

export const palette = {
  ink: '#202b3c', accent: '#234e70', strong: '#172b4d', soft: '#edf1f6',
  page: '#e5efe7', muted: '#566273', border: '#737f8d', focus: '#1c4ea3', error: '#a1262f'
}

export default definePreset(Aura, {
  semantic: {
    primary: { 50: '#eff4fb', 100: '#dfe8f4', 200: '#bacfe6', 300: '#8daed1', 400: '#5b86b6', 500: '#356797', 600: '#28577e', 700: palette.accent, 800: '#1e3f5a', 900: palette.strong, 950: '#102033' },
    focusRing: { width: '3px', style: 'solid', color: palette.focus, offset: '3px' },
    colorScheme: { light: {
      primary: { color: palette.accent, contrastColor: '#ffffff', hoverColor: palette.strong, activeColor: '#102033' },
      highlight: { background: palette.soft, focusBackground: '#dfe8f4', color: palette.strong, focusColor: '#102033' },
      text: { color: palette.ink, mutedColor: palette.muted },
      formField: { color: palette.ink, borderColor: palette.border, hoverBorderColor: palette.accent, focusBorderColor: palette.accent, invalidBorderColor: palette.error, placeholderColor: palette.muted }
    } }
  }
})
