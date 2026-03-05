import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { createPageEntries, createRedirectEntries } from './config/navigation'
import CasLayout from './layout/CasLayout'
import HomePage from './pages/HomePage'
import ModulePage from './pages/ModulePage'
import PlaygroundPage from './pages/PlaygroundPage'

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

  useEffect(() => {
    setModuleBreadcrumbSuffix(null)
  }, [location.pathname])

  return (
    <>
      {homeEntry ? (
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
        <Route path="/" element={<Navigate to={HOME_PATH} replace />} />
        <Route path={HOME_PATH} element={null} />
        <Route path="/playground" element={<PlaygroundPage />} />
        {redirectEntries.map((entry) => (
          <Route key={`redirect-${entry.from}`} path={entry.from} element={<Navigate to={entry.to} replace />} />
        ))}
        {nonHomeEntries.map((entry) => (
          <Route
            key={entry.key}
            path={entry.path}
            element={
              <CasLayout
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
              </CasLayout>
            }
          />
        ))}
        <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
      </Routes>
    </>
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
          <BrowserRouter>
            <AppRoutes homePageTitle={homePageTitle} onHomePageTitleChange={setHomePageTitle} />
          </BrowserRouter>
        </div>
      </div>
    </div>
  )
}

export default App
