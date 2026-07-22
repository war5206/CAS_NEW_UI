import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: [
      'tests/e2e/**',
      'playwright.config.js',
      'node_modules',
      '.mimocode',
      'dist',
      'release',
      '.idea',
      '.vscode',
    ],
    env: {
      VITE_PROJECT_PROFILE: 'standard',
      VITE_API_BASE_URL: 'http://localhost:8080',
      VITE_DEFAULT_USERNAME: 'admin',
      VITE_DEFAULT_PASSWORD: 'FinforWorx3.0',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'electron/',
        'dist/',
        'release/',
      ],
    },
  },
})
