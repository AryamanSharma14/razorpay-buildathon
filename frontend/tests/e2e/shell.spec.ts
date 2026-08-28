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

test('KPI info tooltips appear on hover and are not clipped', async ({ page }) => {
  await page.goto('/')
  const trigger = page.locator('span[aria-describedby]').first()
  await expect(trigger).toBeVisible()

  const tipId = await trigger.getAttribute('aria-describedby')
  const tip = page.locator(`[id="${tipId}"]`)

  // hidden before hover
  await expect(tip).toHaveCSS('opacity', '0')

  await trigger.hover()
  // hover wiring works: bubble fades in (retries through the 150ms transition)
  await expect(tip).toHaveCSS('opacity', '1')

  // bubble must sit fully inside the viewport (no edge overflow)
  const box = await tip.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(box!.width).toBeGreaterThan(40)
})
