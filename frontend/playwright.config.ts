import { defineConfig, devices } from '@playwright/test'

// Serves the COMMITTED build via the real FastAPI app in DEMO_MODE — the exact
// artifact the demo runs. No Vite dev server.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8123',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      '../.venv/Scripts/python.exe -m uvicorn src.main:app --port 8123 --log-level warning',
    cwd: '..',
    url: 'http://127.0.0.1:8123/ping',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { DEMO_MODE: 'true' },
  },
})
