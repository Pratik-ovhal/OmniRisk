import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import BankLoginPage from './pages/BankLoginPage'
import BankDashboardPage from './pages/BankDashboardPage'
import PreLoanRiskCheckPage from './pages/PreLoanRiskCheckPage'
import DemoTwinPage from './pages/DemoTwinPage'
import BorrowerAwarenessPage from './pages/BorrowerAwarenessPage'
import ProtectedRoute from './components/common/ProtectedRoute'

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Dedicated Bank Login Page */}
        <Route path="/login" element={<BankLoginPage />} />

        {/* Protected Bank Officer Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <BankDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pre-loan-check"
          element={
            <ProtectedRoute>
              <PreLoanRiskCheckPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/demo-twin"
          element={
            <ProtectedRoute>
              <DemoTwinPage />
            </ProtectedRoute>
          }
        />

        {/* Route Aliases for seamless linking */}
        <Route path="/bank/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/bank/pre-loan-check" element={<Navigate to="/pre-loan-check" replace />} />
        <Route path="/bank/twin-demo" element={<Navigate to="/demo-twin" replace />} />

        {/* Public Borrower Awareness View (Accessible by unique token) */}
        <Route path="/borrower/:token" element={<BorrowerAwarenessPage />} />

        {/* Fallback & Root Redirect to Dashboard (which guards to /login if unauth) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
