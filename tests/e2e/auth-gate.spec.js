import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

test.describe('开发模式下首页门禁（基于 localStorage 跨标签兜底）', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  test('设备锁定后，新开标签直接进 /home 应被拦到登录页且页面可交互', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('cas.deviceLocked', '1')
    })
    await page.goto('/home')
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByText('当前系统已锁定')).toBeVisible()
    await expect(page.getByRole('button', { name: /0|1|2|3|4|5|6|7|8|9/ }).first()).toBeVisible()
  })

  test('恢复出厂后，新开标签直接进 /home 应被拦到设置密码页且页面可交互', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('cas.factoryReset', '1')
    })
    await page.goto('/home')
    await expect(page).toHaveURL(/\/auth\/set-password/)
    await expect(page.getByRole('heading', { name: '锁屏密码设置' })).toBeVisible()
    await expect(page.getByRole('button', { name: '跳过' })).toBeVisible()
  })

  test('恢复出厂后，在设置密码页输入密码点下一步应进入确认密码页', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('cas.factoryReset', '1')
    })
    await page.goto('/auth/set-password')
    await expect(page.getByRole('heading', { name: '锁屏密码设置' })).toBeVisible()

    await page.getByRole('button', { name: '1' }).click()
    await page.getByRole('button', { name: '2' }).click()
    await page.getByRole('button', { name: '3' }).click()
    await page.getByRole('button', { name: '4' }).click()
    await page.getByRole('button', { name: '下一步' }).click()

    await expect(page).toHaveURL(/\/auth\/confirm-password/)
    await expect(page.getByRole('heading', { name: /确认密码/ })).toBeVisible()
  })
})
