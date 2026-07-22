import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

test.describe('模式选择页', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  test('同步完成后显示智能模式与冷热模式选项', async ({ page }) => {
    await page.goto('/settings/mode-select')

    const modeSelectPage = page.locator('.mode-select-page')
    await expect(modeSelectPage.getByRole('button', { name: '智能模式' })).toBeVisible()
    await expect(modeSelectPage.getByRole('button', { name: '手动模式' })).toBeVisible()
    await expect(modeSelectPage.getByRole('button', { name: '制热' })).toBeVisible()
    await expect(modeSelectPage.getByRole('button', { name: '制冷' })).toBeVisible()
  })

  test('点击制冷后应下发 hpRunModeSwitch 请求', async ({ page }) => {
    await page.goto('/settings/mode-select')

    const modeSelectPage = page.locator('.mode-select-page')
    await expect(modeSelectPage.getByRole('button', { name: '制冷' })).toBeVisible()

    const requestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('algorithm/process/execute')) return false
      const payload = request.postDataJSON() || {}
      return (
        payload.algorithmProcessId === 'hpRunModeSwitch' &&
        payload.param?.data?.runMode === '0'
      )
    })

    await modeSelectPage.getByRole('button', { name: '制冷' }).click()

    const confirmDialog = page.getByRole('dialog', { name: '二次确认' })
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: '确定' }).click()

    const request = await requestPromise
    expect(request).toBeTruthy()
  })
})
