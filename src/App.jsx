import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeRouteCacheContext } from './context/HomeRouteCacheContext'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { createPageEntries, createRedirectEntries } from './config/navigation'
import CasLayout from './layout/CasLayout'
import AuthGuard from './components/AuthGuard'
import { getStoredToken } from './api/client/auth'
import HomePage from './pages/HomePage'
import ModulePage from './pages/ModulePage'
import PlaygroundPage from './pages/PlaygroundPage'
import ScreenProtectPage from './pages/ScreenProtectPage'
import SetOperationPasswordPage from './pages/auth/SetOperationPasswordPage'
import ConfirmPasswordPage from './pages/auth/ConfirmPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import SystemSelectPage from './pages/auth/SystemSelectPage'
import SystemSelectConfigPage from './pages/guide/SystemSelectConfigPage'
import ProjectInfoPage from './pages/guide/ProjectInfoPage'
import AreaSelectPage from './pages/guide/AreaSelectPage'
import HeatPumpLoopPumpConfigPage from './pages/guide/HeatPumpLoopPumpConfigPage'
import TerminalLoopPumpConfigPage from './pages/guide/TerminalLoopPumpConfigPage'
import HeatPumpLayoutPage from './pages/guide/HeatPumpLayoutPage'
import EnergyPriceGuidePage from './pages/guide/EnergyPriceGuidePage'
import SystemDetectGuidePage from './pages/guide/SystemDetectGuidePage'
import InitEntryLayout from './pages/InitEntryPage'
import { useInactivityTimer } from './hooks/useInactivityTimer'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const MAX_SCALE = 1

function getScreenScale() {
  if (typeof window === 'undefined') {
    return 1
  }

  const scaleX = window.innerWidth / DESIGN_WIDTH
  const scaleY = window.innerHeight / DESIGN_HEIGHT
  return Math.min(scaleX, scaleY, MAX_SCALE)
}

const pageEntries = createPageEntries()
const redirectEntries = createRedirectEntries()
const HOME_PATH = '/home'
const homeEntry = pageEntries.find((entry) => entry.module.id === 'home') ?? null
const nonHomeEntries = pageEntries.filter((entry) => entry.module.id !== 'home')
const AppRouter = typeof window !== 'undefined' && window.location.protocol === 'file:' ? HashRouter : BrowserRouter
const GUIDE_PREVIOUS_PATH_KEY = 'guide_previous_path'
const GUIDE_ROUTE_ORDER = [
  '/guide/system-config',
  '/guide/project-info',
  '/guide/area-select',
  '/guide/heat-pump-loop-pump',
  '/guide/terminal-loop-pump',
  '/guide/heat-pump-layout',
  '/guide/energy-price',
  '/guide/system-detect',
]

function AppRoutes({ homePageTitle, onHomePageTitleChange }) {
  const location = useLocation()
  const [unsavedGuard, setUnsavedGuard] = useState({
    active: false,
    message: '当前页面有未保存更改，是否退出？',
  })
  const [hideSecondaryNav, setHideSecondaryNav] = useState(false)
  const [hideModuleTabs, setHideModuleTabs] = useState(false)
  const [moduleBreadcrumbSuffix, setModuleBreadcrumbSuffix] = useState(null)
  const [committedUnitLayoutSlots, setCommittedUnitLayoutSlots] = useState(null)
  const isHomeRoute = location.pathname === HOME_PATH || location.pathname === `${HOME_PATH}/`
  const hasToken = Boolean(getStoredToken())
  const [homeCacheAllowed, setHomeCacheAllowed] = useState(false)

  useEffect(() => {
    if (!hasToken) {
      setHomeCacheAllowed(false)
    }
  }, [hasToken])

  useInactivityTimer()
  const previousPathRef = useRef(window.sessionStorage.getItem(GUIDE_PREVIOUS_PATH_KEY))

  const guideTransitionDirection = useMemo(() => {
    const currentPath = location.pathname
    const previousPath = previousPathRef.current
    const currentIndex = GUIDE_ROUTE_ORDER.indexOf(currentPath)
    const previousIndex = GUIDE_ROUTE_ORDER.indexOf(previousPath)
    const direction = currentIndex >= 0 && previousIndex >= 0 && currentIndex < previousIndex ? 'backward' : 'forward'

    previousPathRef.current = currentPath
    window.sessionStorage.setItem(GUIDE_PREVIOUS_PATH_KEY, currentPath)
    return direction
  }, [location.pathname])

  const renderGuideRoute = (element) => (
    <div className={`guide-route-transition guide-route-transition--${guideTransitionDirection}`}>
      {element}
    </div>
  )

  useEffect(() => {
    setModuleBreadcrumbSuffix(null)
  }, [location.pathname])

  return (
    <HomeRouteCacheContext.Provider value={{ setHomeCacheAllowed }}>
      <>
      {homeEntry && hasToken && homeCacheAllowed ? (
        <div className={`app-route-cache${isHomeRoute ? ' is-active' : ''}`} aria-hidden={!isHomeRoute}>
          <CasLayout
            routeInfo={homeEntry}
            homePageTitle={homePageTitle}
            unsavedGuard={unsavedGuard}
            hideSecondaryNav={hideSecondaryNav}
            hideModuleTabs={hideModuleTabs}
            extraBreadcrumbLabel={moduleBreadcrumbSuffix}
          >
            <HomePage onActivePageChange={onHomePageTitleChange} committedUnitLayoutSlots={committedUnitLayoutSlots} />
          </CasLayout>
        </div>
      ) : null}

      <Routes>
        <Route path="/auth/set-password" element={<SetOperationPasswordPage />} />
        <Route path="/auth/confirm-password" element={<ConfirmPasswordPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/system-select" element={<SystemSelectPage />} />
        <Route path="/guide/system-config" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<SystemSelectConfigPage />)}</AuthGuard>} />
        <Route path="/guide/project-info" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<ProjectInfoPage />)}</AuthGuard>} />
        <Route path="/guide/area-select" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<AreaSelectPage />)}</AuthGuard>} />
        <Route path="/guide/heat-pump-loop-pump" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<HeatPumpLoopPumpConfigPage />)}</AuthGuard>} />
        <Route path="/guide/terminal-loop-pump" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<TerminalLoopPumpConfigPage />)}</AuthGuard>} />
        <Route path="/guide/heat-pump-layout" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<HeatPumpLayoutPage />)}</AuthGuard>} />
        <Route path="/guide/energy-price" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<EnergyPriceGuidePage />)}</AuthGuard>} />
        <Route path="/guide/system-detect" element={<AuthGuard skipInitLockCheck>{renderGuideRoute(<SystemDetectGuidePage />)}</AuthGuard>} />
        <Route element={<InitEntryLayout />}>
          <Route path="/" element={null} />
          <Route path={HOME_PATH} element={null} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/screen-protect" element={<AuthGuard><ScreenProtectPage /></AuthGuard>} />
          {redirectEntries.map((entry) => (
            <Route key={`redirect-${entry.from}`} path={entry.from} element={<Navigate to={entry.to} replace />} />
          ))}
          {nonHomeEntries.map((entry) => (
            <Route
              key={entry.key}
              path={entry.path}
              element={
                <AuthGuard><CasLayout
                  routeInfo={entry}
                  homePageTitle={homePageTitle}
                  unsavedGuard={unsavedGuard}
                  hideSecondaryNav={hideSecondaryNav}
                  hideModuleTabs={hideModuleTabs}
                  extraBreadcrumbLabel={moduleBreadcrumbSuffix}
                >
                  <ModulePage
                    routeInfo={entry}
                    onUnsavedGuardChange={setUnsavedGuard}
                    onSecondaryNavVisibilityChange={setHideSecondaryNav}
                    onModuleTabsVisibilityChange={setHideModuleTabs}
                    onDetailBreadcrumbChange={setModuleBreadcrumbSuffix}
                    onUnitLayoutCommitted={setCommittedUnitLayoutSlots}
                  />
                </CasLayout></AuthGuard>
              }
            />
          ))}
          <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
        </Route>
      </Routes>
      </>
    </HomeRouteCacheContext.Provider>
  )
}

function App() {
  const [homePageTitle, setHomePageTitle] = useState('首页')
  const [screenScale, setScreenScale] = useState(getScreenScale)

  useEffect(() => {
    let frameId = 0

    const handleResize = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        setScreenScale(getScreenScale())
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const stageStyle = useMemo(
    () => ({
      '--screen-scale': String(screenScale),
      '--screen-design-width': `${DESIGN_WIDTH}px`,
      '--screen-design-height': `${DESIGN_HEIGHT}px`,
      width: `${Math.round(DESIGN_WIDTH * screenScale)}px`,
      height: `${Math.round(DESIGN_HEIGHT * screenScale)}px`,
    }),
    [screenScale],
  )

  return (
    <div className="screen-adapter">
      <div className="screen-adapter-shell" style={stageStyle}>
        <div className="screen-adapter-stage">
          <AppRouter>
            <AppRoutes homePageTitle={homePageTitle} onHomePageTitleChange={setHomePageTitle} />
          </AppRouter>
        </div>
      </div>
    </div>
  )
}

export default App
