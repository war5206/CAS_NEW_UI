import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

test.describe('主导航切换', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  test('能从设置页通过主导航切换到各一级模块', async ({ page }) => {
    await page.goto('/settings/mode-select')
    const modeSelectPage = page.locator('.mode-select-page')
    await expect(modeSelectPage.getByRole('button', { name: '智能模式' })).toBeVisible()

    const primaryNav = page.locator('aside nav')

    await primaryNav.getByRole('link', { name: '告警' }).click()
    await expect(page).toHaveURL(/\/alerts\/system-alarm/)

    await primaryNav.getByRole('link', { name: '分析' }).click()
    await expect(page).toHaveURL(/\/analysis\/data-overview/)

    await primaryNav.getByRole('link', { name: '运维' }).click()
    await expect(page).toHaveURL(/\/operations\/system-management\/system-status-data/)

    await primaryNav.getByRole('link', { name: '监控' }).click()
    await expect(page).toHaveURL(/\/monitor/)

    await primaryNav.getByRole('link', { name: '首页' }).click()
    await expect(page).toHaveURL(/\/home/)
  })
})
