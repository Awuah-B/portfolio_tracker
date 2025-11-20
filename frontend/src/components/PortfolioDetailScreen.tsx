import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Holding, Portfolio } from '../types/Portfolio';
import { supabase } from '../supabaseClient';
import HoldingsTable from './HoldingsTable';
import MetricCard from './MetricCard';

interface PortfolioSummary {
  portfolio_id: string;
  total_current_value: number;
  total_percentage_change: number;
  holdings: Holding[];
  allocation: any[]; // Define a proper type for AllocationItem if needed
}

const PortfolioDetailScreen: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioDetails = async () => {
      if (!portfolioId) {
        setError("Portfolio ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch portfolio details
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select('*')
          .eq('id', portfolioId)
          .single();

        if (portfolioError) throw portfolioError;
        setPortfolio(portfolioData);

        // Fetch portfolio summary from backend API
        const response = await fetch(`http://localhost:8000/portfolios/${portfolioId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch portfolio summary');
        }
        const summaryData: PortfolioSummary = await response.json();
        setSummary(summaryData);

      } catch (err: any) {
        console.error('Error fetching portfolio details:', err.message);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioDetails();
  }, [portfolioId]);

  if (loading) {
    return <div className="text-white text-center py-8">Loading portfolio details...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Error: {error}</div>;
  }

  if (!portfolio) {
    return <div className="text-white text-center py-8">Portfolio not found.</div>;
  }

  const isPositiveChange = summary && summary.total_percentage_change >= 0;

  return (
    <div className="container mx-auto p-6 bg-slate-900 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-8 text-center">{portfolio.name} Details</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Current Value"
            value={summary.total_current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            subValue={`${isPositiveChange ? '+' : ''}${summary.total_percentage_change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
            trend={isPositiveChange ? 'up' : 'down'}
            isCurrency={true}
          />
          {/* Add other metric cards here if needed */}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Holdings</h2>
        {summary && summary.holdings.length > 0 ? (
          <HoldingsTable holdings={summary.holdings} />
        ) : (
          <p className="text-slate-400">No holdings in this portfolio yet.</p>
        )}
      </div>

      {/* Add form for adding new holdings here */}
      {/* Add form for editing portfolio details here */}
    </div>
  );
};

export default PortfolioDetailScreen;
