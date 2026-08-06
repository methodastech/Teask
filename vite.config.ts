import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Declared rather than pulled in from @types/node: this is the only Node global
// the config touches, and it is not worth a dependency for one lookup.
declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Honour a caller-assigned port (the preview harness sets PORT); vite does
    // not read it on its own and would otherwise drift to 5174 when 5173 is busy.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
