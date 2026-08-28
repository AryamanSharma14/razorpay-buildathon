import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
// Absolute, quoted — Windows cmd mangles relative exe paths like '../.venv/...'.
const venvPython = path.join(repoRoot, '.venv', 'Scripts', 'python.exe')

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
    command: `"${venvPython}" -m uvicorn src.main:app --port 8123 --log-level warning`,
    cwd: repoRoot,
    url: 'http://127.0.0.1:8123/ping',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { DEMO_MODE: 'true' },
  },
})
