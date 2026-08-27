import { test, expect } from '@playwright/test'

const ROUTES = [
  '/',
  '/queue',
  '/analytics',
  '/funnel',
  '/policy',
  '/downtime',
  '/model-health',
  '/audit',
  '/economics',
  '/insights',
  '/simulator',
]

test('SPA shell renders with grouped nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Recovery Agent', { exact: true })).toBeVisible()
  for (const group of ['Recovery', 'Analysis', 'Ops', 'Business', 'AI', 'Demo']) {
    await expect(page.getByText(group, { exact: true })).toBeVisible()
  }
})

test('every route resolves client-side without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  for (const route of ROUTES) {
    await page.goto(route)
    await expect(page.locator('main h1')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('deep-link to a client route serves the SPA, not a 404', async ({ page }) => {
  const res = await page.goto('/audit')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveTitle(/Recovery Agent/)
})
