import { defineConfig } from 'vitest/config'
import { config as loadEnv } from 'dotenv'
import path from 'path'

// This MUST run before defineConfig, and before any app code (env.ts, db/index.ts)
// gets imported anywhere. It runs in the main process, before Vitest spawns
// worker threads — and worker threads inherit process.env at spawn time, so
// this guarantees every test file, globalSetup, and setup.ts all see the
// test values instead of your dev .env.
loadEnv({ path: path.resolve(import.meta.dirname, '.env.test') })

export default defineConfig({
  test: {
    environment: 'node',

    // Vitest will find any file matching these patterns.
    // This covers both co-located tests (auth.test.ts inside modules/auth/)
    // and any tests inside a dedicated __tests__/ folder.
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Automatically clear mock calls and instances before every test
    clearMocks: true,

    // Disable globals to enforce explicit imports (aligns with your strict tsconfig)
    globals: false,

    // This file runs once before any test suite executes.
    globalSetup: ['src/test/globalSetup.ts'],

    // This file runs before each test FILE (not each test).
    setupFiles: ['src/test/setup.ts'],

    // Coverage configuration — run with `vitest run --coverage`
    coverage: {
      provider: 'v8', // Uses Node's built-in V8 coverage — no extra deps
      reporter: ['text', 'html'], // 'text' prints to terminal, 'html' creates a browsable report
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/test/**',
        'src/db/migrations/**', // Migrations are infrastructure, not logic worth covering
      ],
    },
  },
})