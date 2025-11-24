import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortfolioOverviewScreen from './components/PortfolioOverviewScreen';
import PublicDashboard from './components/PublicDashboard';
import PortfolioDetailScreen from './components/PortfolioDetailScreen';
import { AdminProvider, useAdmin } from './context/AdminContext';
import LoginPage from './pages/LoginPage';

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAdmin } = useAdmin();
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AdminProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <PortfolioOverviewScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/portfolios/:portfolioId"
            element={
              <RequireAuth>
                <PortfolioDetailScreen />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AdminProvider>
  );
}

export default App;
