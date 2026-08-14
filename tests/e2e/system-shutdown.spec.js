import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

const SYSTEM_STATUS_LONG_NAME = 'Sys\\FinforWorx\\SystemStatus'

const HANDLERS = {
  ...MOCK_API_HANDLERS,
  queryRealvalByLongNames: (payload) => {
    const longNames = payload?.param?.data?.longNames
    const names = Array.isArray(longNames) ? longNames : [longNames]
    if (names.some((name) => String(name).includes(SYSTEM_STATUS_LONG_NAME))) {
      return { [SYSTEM_STATUS_LONG_NAME]: '1' }
    }
    return MOCK_API_HANDLERS.queryRealvalByLongNames
  },
  writeRealvalByLongNames: { state: 'success' },
}

test.describe('系统重置页关机联动', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, HANDLERS)
  })

  test('点击系统关机后，左下角开关机按钮同步变灰', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('cas.userRole', '管理员')
    })
    await page.goto('/settings/base-setting/system-reset')
    await expect(page.getByRole('button', { name: '系统关机' })).toBeVisible()

    // 关机前左下角按钮是高亮（开机）状态
    await expect(page.locator('aside .power-button:visible')).not.toHaveClass(/is-off/)

    await page.getByRole('button', { name: '系统关机' }).click()
    await page.getByRole('button', { name: '确定' }).click()

    // 页面按钮文案变为系统开机
    await expect(page.getByRole('button', { name: '系统开机' })).toBeVisible()

    // 左下角开关机按钮同步变灰
    await expect(page.locator('aside .power-button:visible')).toHaveClass(/is-off/)
  })
})
