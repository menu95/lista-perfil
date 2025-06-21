import { defineConfig } from 'vite'
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js', // Arquivo de configuração opcional para os testes
    env: {
      VITE_GEMINI_API_KEY: 'test-api-key-gemini', // Chave mock para testes
    },
  },
})
