import { useSyncExternalStore } from 'react'
import { guideStore } from '../store/guideStore'

// 缓存初始状态
const initialState = guideStore.getState()

export function useGuideStore() {
  const state = useSyncExternalStore(
    guideStore.subscribe,
    guideStore.getState,
    () => initialState
  )

  return {
    ...state,
    setSystemTypeId: guideStore.setSystemTypeId,
    setSystemConfig: guideStore.setSystemConfig,
    setProjectInfo: guideStore.setProjectInfo,
    setAreaSelection: guideStore.setAreaSelection,
    setHeatPumpLoopPumpConfig: guideStore.setHeatPumpLoopPumpConfig,
    setTerminalLoopPumpConfig: guideStore.setTerminalLoopPumpConfig,
  }
}
