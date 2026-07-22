import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

test.describe('认证流程', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  test('设置密码页应能正常打开', async ({ page }) => {
    await page.goto('/auth/set-password')
    await expect(page.getByRole('heading', { name: '锁屏密码设置' })).toBeVisible()
    await expect(page.getByText('密码为4位数字')).toBeVisible()
  })

  test('输入4位密码并点击下一步后进入确认密码页', async ({ page }) => {
    await page.goto('/auth/set-password')

    await page.getByRole('button', { name: '1' }).click()
    await page.getByRole('button', { name: '2' }).click()
    await page.getByRole('button', { name: '3' }).click()
    await page.getByRole('button', { name: '4' }).click()

    await page.getByRole('button', { name: '下一步' }).click()

    await expect(page).toHaveURL(/\/auth\/confirm-password/)
    await expect(page.getByRole('heading', { name: /确认密码/ })).toBeVisible()
  })
})
