import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PortfolioOverviewScreen from './components/PortfolioOverviewScreen'; // New component for main overview
import PortfolioDetailScreen from './components/PortfolioDetailScreen'; // New component for portfolio details

import { AdminProvider } from './context/AdminContext';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <AdminProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PortfolioOverviewScreen />} />
          <Route path="/portfolios/:portfolioId" element={<PortfolioDetailScreen />} />
        </Routes>
      </Router>
    </AdminProvider>
  );
}

export default App;
