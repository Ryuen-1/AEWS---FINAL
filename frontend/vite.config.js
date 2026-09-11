import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('/src/pages/Admin') || normalized.includes('/src/components/admin/')) {
            return 'admin'
          }
          if (normalized.includes('/src/pages/AmuStaff') || normalized.includes('/src/components/amu-staff/')) {
            return 'amu-staff'
          }
          if (normalized.includes('/src/pages/Instructor') || normalized.includes('/src/components/instructor/')) {
            return 'instructor'
          }
          if (normalized.includes('/src/pages/Student') || normalized.includes('/src/components/StudentLayout') || normalized.includes('/src/components/NeedsAssessmentPreviewModal')) {
            return 'student'
          }
          if (normalized.includes('/src/utils/pdfGenerator')) {
            return 'pdf-tools'
          }
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('\\react\\') || id.includes('\\react-dom\\') || id.includes('\\react-router-dom\\')) {
            return 'vendor-react'
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts'
          }
          if (id.includes('jspdf-autotable')) {
            return 'vendor-pdf-table'
          }
          if (id.includes('jspdf')) {
            return 'vendor-pdf-core'
          }
          if (id.includes('html2canvas')) {
            return 'vendor-canvas'
          }
          if (id.includes('dompurify')) {
            return 'vendor-sanitize'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
          return undefined
        },
      },
    },
  },
})
