import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/utils'
import ModeSelectPage from './ModeSelectPage'

const hpRunModeSwitch = vi.fn()
const writeRealvalByLongNames = vi.fn()
const queryRealvalByLongNames = vi.fn()
const queryManualSwitch = vi.fn()

vi.mock('../api/modules/settings', () => ({
  hpRunModeSwitch: (...args) => hpRunModeSwitch(...args),
  writeRealvalByLongNames: (...args) => writeRealvalByLongNames(...args),
  queryRealvalByLongNames: (...args) => queryRealvalByLongNames(...args),
  queryManualSwitch: (...args) => queryManualSwitch(...args),
}))

vi.mock('../hooks/useActionConfirm', () => ({
  useActionConfirm: () => ({
    requestConfirm: (_config, onConfirm) => onConfirm?.(),
    closeConfirm: vi.fn(),
    confirmModal: null,
  }),
}))

vi.mock('../utils/climateModeState', () => ({
  getStoredClimateMode: () => 'climate',
  setStoredClimateMode: vi.fn(),
}))

vi.mock('../utils/temperatureModeState', () => ({
  getStoredTemperatureMode: () => 'heating',
  setStoredTemperatureMode: vi.fn(),
  getConstantSetTempLongName: (mode) => `Sys\\FinforWorx\\SetTemperature1`,
}))

function createRealvalResponse(valueMap) {
  return {
    data: {
      success: true,
      data: valueMap,
    },
  }
}

describe('ModeSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRealvalByLongNames.mockResolvedValue(
      createRealvalResponse({
        'Sys\\FinforWorx\\SystemOperatingMode': 0,
        'Sys\\FinforWorx\\HPTotalRunMode': 1,
        'Sys\\FinforWorx\\QHBC': 1,
        'Sys\\FinforWorx\\ZNDS': 1,
        'Sys\\FinforWorx\\GFTJ': 1,
        'Sys\\FinforWorx\\OHNY': 1,
        'Sys\\FinforWorx\\Function1': 1,
      }),
    )
    writeRealvalByLongNames.mockResolvedValue({ data: { data: { state: 'success' } } })
    hpRunModeSwitch.mockResolvedValue({ data: { data: { state: 'success' } } })
    queryManualSwitch.mockResolvedValue({ data: { success: true, data: { manualSwitch: [] } } })
  })

  it('同步完成后应显示模式选项', async () => {
    renderWithProviders(<ModeSelectPage />)

    expect(screen.getByText('正在同步模式状态...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('正在同步模式状态...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('智能模式')).toBeInTheDocument()
    expect(screen.getByText('手动模式')).toBeInTheDocument()
    expect(screen.getByText('制热')).toBeInTheDocument()
    expect(screen.getByText('制冷')).toBeInTheDocument()
  })

  it('点击制冷应调用 hpRunModeSwitch 下置 0', async () => {
    renderWithProviders(<ModeSelectPage />)

    await waitFor(() => {
      expect(screen.queryByText('正在同步模式状态...')).not.toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('制冷'))

    await waitFor(() => {
      expect(hpRunModeSwitch).toHaveBeenCalledWith(0)
    })
  })

  it('气候补偿开关关闭应调用 writeRealvalByLongNames', async () => {
    renderWithProviders(<ModeSelectPage />)

    await waitFor(() => {
      expect(screen.queryByText('正在同步模式状态...')).not.toBeInTheDocument()
    })

    // 当前气候补偿为开启，点击后应关闭
    const climateSwitch = screen.getByLabelText('气候补偿关闭')
    await userEvent.click(climateSwitch)

    await waitFor(() => {
      expect(writeRealvalByLongNames).toHaveBeenCalledWith(
        expect.objectContaining({
          'Sys\\FinforWorx\\QHBC': 0,
        }),
      )
    })
  })
})
