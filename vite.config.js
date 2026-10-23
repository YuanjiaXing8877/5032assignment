import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: { include: ['jspdf', 'jspdf-autotable'] },
  build: {
    rolldownOptions: {
      // Table PDFs use text and an embedded font, without HTML or SVG rendering.
      external: ['canvg', 'html2canvas', 'dompurify']
    }
  }
})
