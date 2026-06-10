import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom'

import UserLoginPage from './components/UserLoginPage'
import UserLayout from './components/layouts/UserLayout'
import DashboardPage from './components/user-dashboard/Dashboard'
import UserAssessmentsPage from './components/user/UserAssessments'
import UserAssessmentFormPage from './components/user/UserAssessmentForm'
import AssessmentPhasesPage from './components/user/AssessmentPhases'
import AssessmentReportPDFPage from './components/user/AssessmentReportPDF'

// Standalone demo build — no backend. Hardcoded credentials and a data snapshot bundled at
// build time (src/data/snapshot.json). All API client / DataGate / admin-landing plumbing
// from the live frontend was stripped here.
const DEMO_USER = {
  username: 'Aish',
  password: 'Siksha@2026',
  name: 'Aish',
  email: 'aish@siksha.demo',
  role: 'admin',
  permissions: {
    defaultRoute: '/user/assessments',
    allowedAssessmentIds: null,
    allowedTabs: null,
  },
}

const AUTH_STORAGE_KEY = 'siksha-demo.auth'

const AuthContext = createContext(null)
const ClientContext = createContext({ client: 'arcesium' })

export function useAuth() {
  return useContext(AuthContext)
}

export function useClient() {
  return useContext(ClientContext)
}

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadStoredAuth())

  useEffect(() => {
    if (auth) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [auth])

  const login = useCallback(async (username, password) => {
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      const { password: _, ...user } = DEMO_USER
      setAuth(user)
      return { ok: true, user }
    }
    return { ok: false, error: 'Invalid credentials' }
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedRoute({ children }) {
  const { auth } = useAuth()
  if (!auth) return <Navigate to="/" replace />
  return children || <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UserLoginPage />} />

          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <ClientContext.Provider value={{ client: 'arcesium' }}>
                  <UserLayout />
                </ClientContext.Provider>
              </ProtectedRoute>
            }
          >
            <Route path="assessments" element={<UserAssessmentsPage />} />
            <Route path="assessment/:id" element={<UserAssessmentFormPage />} />
            <Route path="phases/:id" element={<AssessmentPhasesPage />} />
            <Route path="report/:id" element={<AssessmentReportPDFPage />} />
            <Route path="results/:id" element={<DashboardPage />} />
            <Route path="results" element={<DashboardPage />} />
            <Route path="questionnaire/:kind" element={<DashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
