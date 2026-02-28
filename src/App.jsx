import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { createPageEntries, createRedirectEntries } from './config/navigation'
import CasLayout from './layout/CasLayout'
import HomePage from './pages/HomePage'
import ModulePage from './pages/ModulePage'
import PlaygroundPage from './pages/PlaygroundPage'

const pageEntries = createPageEntries()
const redirectEntries = createRedirectEntries()
const HOME_PATH = '/home'
const homeEntry = pageEntries.find((entry) => entry.module.id === 'home') ?? null
const nonHomeEntries = pageEntries.filter((entry) => entry.module.id !== 'home')

function AppRoutes({ homePageTitle, onHomePageTitleChange }) {
  const location = useLocation()
  const isHomeRoute = location.pathname === HOME_PATH || location.pathname === `${HOME_PATH}/`

  return (
    <>
      {homeEntry ? (
        <div className={`app-route-cache${isHomeRoute ? ' is-active' : ''}`} aria-hidden={!isHomeRoute}>
          <CasLayout routeInfo={homeEntry} homePageTitle={homePageTitle}>
            <HomePage onActivePageChange={onHomePageTitleChange} />
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
              <CasLayout routeInfo={entry} homePageTitle={homePageTitle}>
                <ModulePage routeInfo={entry} />
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

  return (
    <BrowserRouter>
      <AppRoutes homePageTitle={homePageTitle} onHomePageTitleChange={setHomePageTitle} />
    </BrowserRouter>
  )
}

export default App
