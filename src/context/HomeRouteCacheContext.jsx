import { createContext, useContext } from 'react'

/** Set to true when InitEntryLayout has aligned routes and lockStatus is not 1 (see InitEntryPage). */
export const HomeRouteCacheContext = createContext({
  setHomeCacheAllowed: () => {},
})

export function useHomeRouteCacheControls() {
  return useContext(HomeRouteCacheContext)
}
