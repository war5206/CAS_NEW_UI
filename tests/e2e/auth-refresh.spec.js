import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

test.describe('认证页刷新', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  test('直接打开 /auth/set-password 刷新后仍留在该页', async ({ page }) => {
    await page.goto('/auth/set-password')
    await expect(page.getByRole('heading', { name: '锁屏密码设置' })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/auth\/set-password/)
    await expect(page.getByRole('heading', { name: '锁屏密码设置' })).toBeVisible()
  })

  test('直接打开 /auth/login 刷新后仍留在该页', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })
})
