import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PortfolioOverviewScreen from './components/PortfolioOverviewScreen'; // New component for main overview
import PortfolioDetailScreen from './components/PortfolioDetailScreen'; // New component for portfolio details

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PortfolioOverviewScreen />} />
        <Route path="/portfolios/:portfolioId" element={<PortfolioDetailScreen />} />
      </Routes>
    </Router>
  );
}

export default App;