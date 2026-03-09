import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../server');

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:e2e',
      cwd: backendDir,
      url: 'http://127.0.0.1:4100/api/health',
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
      name: 'Backend',
    },
    {
      command: 'VITE_PROXY_TARGET=http://127.0.0.1:4100 npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: __dirname,
      url: 'http://127.0.0.1:5173/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
      name: 'Frontend',
    },
  ],
});