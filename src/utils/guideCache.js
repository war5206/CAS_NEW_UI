import { guideStore } from '@/features/guide/store/guideStore'

const GUIDE_PREVIOUS_PATH_KEY = 'guide_previous_path'
const ENERGY_PRICE_GUIDE_ENTERED_FLAG = 'cas_energy_price_guide_entered'
const ENERGY_PRICE_GUIDE_STATE_KEY = 'cas_energy_price_state_guide'

export function clearGuideWizardCache() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(GUIDE_PREVIOUS_PATH_KEY)
    window.sessionStorage.removeItem(ENERGY_PRICE_GUIDE_ENTERED_FLAG)
    window.localStorage.removeItem(ENERGY_PRICE_GUIDE_STATE_KEY)
  }
  guideStore.resetGuideState()
}
