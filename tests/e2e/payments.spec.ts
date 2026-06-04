import { test, expect } from '@playwright/test'

test.describe('Payment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/payments')
  })

  test('shows payments page structure', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await expect(page.getByRole('heading', { name: 'Payments' }).or(page.locator('h1:has-text("Payments")'))).toBeVisible()
    // Stats cards should show
    await expect(page.getByText('Total Revenue')).toBeVisible()
    await expect(page.locator('p:has-text("Pending Collections")')).toBeVisible()
    // Tabs should be visible
    await expect(page.getByRole('button', { name: /^Pending/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
    // Month picker
    await expect(page.locator('input[type="month"]')).toBeVisible()
  })

  test('can switch between Pending and History tabs', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    // Click History tab
    await page.getByRole('button', { name: 'History' }).click()
    // Click Pending tab
    await page.getByRole('button', { name: /Pending( \d+)?$/ }).click()
    await expect(page.getByText('Pending Collections')).toBeVisible()
  })

  test('Record Payment button exists', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await expect(page.getByRole('button', { name: /Record Payment/i })).toBeVisible()
  })
})
