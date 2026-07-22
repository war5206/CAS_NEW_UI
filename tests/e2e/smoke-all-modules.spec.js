import { test, expect } from '@playwright/test'
import { mockAlgorithmProcess, MOCK_API_HANDLERS } from './helpers/mockApi'

/**
 * 全系统冒烟测试：验证每个一级模块/子页面都能正常打开，不白屏、不崩溃。
 * 使用管理员角色，确保基础设置、系统参数等需要权限的页面也能进入。
 */

const SMOKE_CASES = [
  { path: '/home', expected: '室外温度' },
  { path: '/settings/mode-select', expected: '冷热模式' },
  { path: '/settings/mode-setting/climate-compensation', expected: '气候补偿' },
  { path: '/settings/mode-setting/smart-timer', expected: '智能定时' },
  { path: '/settings/mode-setting/smart-start-stop', expected: '智能启停' },
  { path: '/settings/mode-setting/peak-valley', expected: '热电协同' },
  { path: '/settings/mode-setting/coupling-energy', expected: '耦合能源' },
  { path: '/settings/device-params/heat-pump', expected: '热泵' },
  { path: '/settings/base-setting/system-params', expected: '系统参数' },
  { path: '/alerts/system-alarm', expected: '系统报警' },
  { path: '/alerts/fault-tree', expected: '故障树' },
  { path: '/alerts/alarm-analysis', expected: '告警分析' },
  { path: '/analysis/data-overview', expected: '数据综述' },
  { path: '/analysis/power-statistics', expected: '用电统计' },
  { path: '/analysis/water-statistics', expected: '用水统计' },
  { path: '/analysis/heat-statistics', expected: '热量统计' },
  { path: '/analysis/cold-statistics', expected: '冷量统计' },
  { path: '/analysis/cost-analysis', expected: '费用分析' },
  { path: '/operations/system-management/system-status-data', expected: '系统状态数据' },
  { path: '/operations/device-management/heat-pump', expected: '热泵' },
  { path: '/operations/archive-management', expected: '档案管理' },
  { path: '/operations/system-manual', expected: '系统说明书' },
  { path: '/monitor', expected: '当前暂无监控设备接入' },
]

test.describe('全系统冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    // 在页面脚本执行前写入管理员角色，确保需要权限的页面能正常渲染
    await page.addInitScript(() => {
      localStorage.setItem('cas.userRole', '管理员')
    })
    await mockAlgorithmProcess(page, MOCK_API_HANDLERS)
  })

  for (const { path, expected } of SMOKE_CASES) {
    test(`${path} 能正常打开`, async ({ page }) => {
      await page.goto(path)

      // 等待页面稳定：没有 init 加载中的提示
      await expect(page.getByText('正在进入系统…')).not.toBeVisible()

      // 定位到当前页面可见内容区，排除被 aria-hidden 的 home 缓存等区域
      const contentLocator =
        path === '/monitor'
          ? page.locator('.monitor-layout-content:visible')
          : page.locator('.main:visible')

      // 验证页面上出现了期望的关键文字
      await expect(contentLocator.getByText(expected).first()).toBeVisible()
    })
  }
})
