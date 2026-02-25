import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { createPageEntries, createRedirectEntries } from './config/navigation'
import CasLayout from './layout/CasLayout'
import HomePage from './pages/HomePage'
import ModulePage from './pages/ModulePage'

const pageEntries = createPageEntries()
const redirectEntries = createRedirectEntries()

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        {redirectEntries.map((entry) => (
          <Route key={`redirect-${entry.from}`} path={entry.from} element={<Navigate to={entry.to} replace />} />
        ))}
        {pageEntries.map((entry) => (
          <Route
            key={entry.key}
            path={entry.path}
            element={
              <CasLayout routeInfo={entry}>
                {entry.module.id === 'home' ? <HomePage /> : <ModulePage routeInfo={entry} />}
              </CasLayout>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
