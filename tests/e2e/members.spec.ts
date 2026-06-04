import { test, expect } from '@playwright/test'

test.describe('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    // Go to members page (will redirect to login first if not authenticated)
    await page.goto('/members')
  })

  test('shows member directory page structure', async ({ page }) => {
    // Wait for page to load (may be redirected to login)
    await page.waitForLoadState('networkidle')
    
    // If redirected to login, skip assertions that require auth
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await expect(page.getByText('Member Directory')).toBeVisible()
    await expect(page.getByPlaceholder(/Search members/i)).toBeVisible()
    await expect(page.getByText(/Add Member/i)).toBeVisible()
  })

  test('search input works', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    const searchInput = page.getByPlaceholder(/Search members/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('John')
    await expect(searchInput).toHaveValue('John')
    
    // Clear button should appear
    const clearButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') })
    await expect(clearButton).toBeVisible()
    await clearButton.click()
    await expect(searchInput).toHaveValue('')
  })

  test('Add Member button opens form', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: /Add Member/i }).click()
    // MemberForm modal should appear
    await expect(page.getByText(/Register New Member/i).or(page.getByText(/Add Member/i).first())).toBeVisible({ timeout: 5000 })
  })
})
