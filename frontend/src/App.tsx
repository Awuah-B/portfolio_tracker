import { useState, useEffect } from 'react';
import Portfolio from './types/Portfolio.ts';
import PortfolioSummary from './components/PortfolioSummary';
import HoldingsTable from './components/HoldingsTable';

function App() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/portfolios/my-portfolio');
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        const data = await response.json();
        setPortfolio(data);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unknown error occurred');
        }
      }
    };

    fetchPortfolio();
  }, []);

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  if (!portfolio) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-8">Portfolio Tracker</h1>
      <PortfolioSummary portfolio={portfolio} />
      <HoldingsTable holdings={portfolio.holdings} />
    </div>
  );
}

export default App;