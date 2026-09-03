import { test, expect } from '@playwright/test'

const DESTINATIONS = [
  '/',
  '/queue',
  '/analytics',
  '/policy',
  '/economics',
  '/simulator',
]

test('SPA shell renders with 6-item clean nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Razorpay AI', { exact: true })).toBeVisible()
  for (const item of ['Overview & Metrics', 'Recovery Queue', 'Decline Analytics', 'Safety & Fines', 'Unit Economics & ROI', 'Scenario Simulator']) {
    await expect(page.getByText(item, { exact: true })).toBeVisible()
  }
})

test('every destination resolves client-side without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  for (const route of DESTINATIONS) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('folded page routes redirect cleanly to parent sections', async ({ page }) => {
  await page.goto('/downtime')
  await expect(page).toHaveURL(/queue#downtime/)

  await page.goto('/model-health')
  await expect(page).toHaveURL(/analytics#model-health/)

  await page.goto('/insights')
  await expect(page).toHaveURL(/audit#insights/)
})

test('Home page renders executive banner, 3-step guide, and video showcase button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Autonomous Revenue Recovery Engine')).toBeVisible()
  await expect(page.getByText('How the AI Recovers Money in 3 Simple Steps')).toBeVisible()
  await expect(page.getByRole('button', { name: /start 30-second video showcase/i })).toBeVisible()
  await expect(page.getByText('Recent Recoveries & Protected Orders')).toBeVisible()
})

test('30-Second Video Showcase starts, displays narrator bar, and steps forward', async ({ page }) => {
  await page.goto('/')
  // Start the 30-second automated showcase
  await page.getByRole('button', { name: /start 30-second video showcase/i }).click()

  // Verify floating narrator bar appears
  await expect(page.getByText(/1\. Checkout Payment Fails/i)).toBeVisible({ timeout: 5000 })

  // Click Next Step button in the narrator bar
  await page.getByTitle('Next Step').click()

  // Verify step 2 and page navigation to /queue
  await expect(page).toHaveURL(/queue/)
  await expect(page.getByText(/AI Brain Schedules Retry for Friday Salary Day/i)).toBeVisible()

  // Exit showcase
  await page.getByTitle('Exit Showcase (Esc)').click()
  await expect(page.getByText(/2\. AI Schedules Retry/i)).not.toBeVisible()
})

test('Presenter Mode toggles and executes a scenario', async ({ page }) => {
  await page.goto('/')
  // Click Presenter toggle button in TopBar
  await page.getByRole('button', { name: /presenter/i }).click()

  const presenterBar = page.getByRole('button', { name: 'Temporary fail' })
  await expect(presenterBar).toBeVisible()

  // Click temporary fail scenario
  await presenterBar.click()

  // VerdictBanner should appear with scenario title
  await expect(page.getByText(/RECOVERED — Low Balance Retried on Payday/i)).toBeVisible({ timeout: 10000 })
})

test('Customer Phone simulator opens from TopBar and allows 1-tap UPI payment', async ({ page }) => {
  await page.goto('/')
  // Click Customer Simulator in TopBar
  await page.getByRole('button', { name: /customer simulator/i }).click()

  // Verify Phone Mockup & WhatsApp header
  await expect(page.getByText('Verified Business')).toBeVisible()
  await expect(page.getByRole('button', { name: /pay via upi/i })).toBeVisible()

  // Click Pay via UPI button
  await page.getByRole('button', { name: /pay via upi/i }).click()

  // Verify success confirmation
  await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 5000 })

  // Close simulator
  await page.getByRole('button', { name: /close simulator/i }).click()
})

test('What-If Rule Sandbox on Policy page updates live simulated outcomes', async ({ page }) => {
  await page.goto('/policy')
  // Switch to Sandbox tab
  await page.getByRole('button', { name: /interactive "what-if" rule sandbox/i }).click()

  // Verify Sandbox panel heading
  await expect(page.getByRole('heading', { name: 'Interactive "What-If" Rule Sandbox' })).toBeVisible()
  await expect(page.getByText('Simulated Financial Outcome')).toBeVisible()

  // Click Visa Compliance toggle to disable
  await page.getByText('1. Card Network Compliance Guard').click()
  await expect(page.getByText(/DISABLED \(Fining!\)/i)).toBeVisible()

  // Reset to AI Best Practice
  await page.getByRole('button', { name: /reset to ai best practice/i }).click()
  await expect(page.getByText(/ACTIVE \(0 Fines\)/i)).toBeVisible()
})

test('deep-link to a client route serves the SPA, not a 404', async ({ page }) => {
  const res = await page.goto('/audit')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveTitle(/Recovery Agent/)
})
