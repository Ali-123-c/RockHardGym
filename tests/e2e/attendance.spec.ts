import { test, expect } from '@playwright/test'

test.describe('Attendance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/attendance')
  })

  test('shows attendance page structure', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await expect(page.getByText('Daily Log')).toBeVisible()
    await expect(page.getByText('Manual Entry')).toBeVisible()
    // Date picker should be visible
    await expect(page.locator('input[type="date"]')).toBeVisible()
    // Check-ins counter chip
    await expect(page.getByText(/\d+ Check-ins/)).toBeVisible()
  })

  test('date picker changes date', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible()
    
    // Pick yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    await dateInput.fill(yesterdayStr)
    
    // Today button should appear when not on today's date
    await expect(page.getByText('Today')).toBeVisible()
  })

  test('Manual Entry button opens modal', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: /Manual Entry/i }).click()
    // Modal should contain a search input or manual attendance text
    await expect(page.getByPlaceholder(/member/i).or(page.getByText(/Mark Attendance/i))).toBeVisible({ timeout: 5000 })
  })
})
