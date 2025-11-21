import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Holding, Portfolio } from '../types/Portfolio';
import { supabase } from '../supabaseClient';
import HoldingsTable from './HoldingsTable';
import MetricCard from './MetricCard';
import { Trash2, Plus, X } from 'lucide-react'; // Import X icon for modal close

// Import tickers.json
import tickersData from '../../tickers.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface PortfolioSummary {
  portfolio_id: string;
  total_current_value: number;
  total_percentage_change: number;
  holdings: Holding[];
  allocation: { name: string; value: number }[]; // Define a proper type for AllocationItem if needed
}

interface Ticker {
  ticker: string;
  name: string;
}

interface TickersData {
  crypto_tickers: Ticker[];
  indices_tickers: Ticker[];
  forex_tickers: Ticker[];
  stocks_tickers: Ticker[];
  commodities_tickers: Ticker[];
  etfs_tickers: Ticker[];
  bond_interests_tickers: Ticker[];
  miners_tickers: Ticker[];
}

const PortfolioDetailScreen: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate(); // Initialize useNavigate
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for Add Asset Modal
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<keyof TickersData | ''>('');
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  // Removed quantity and averageCost states

  // --- Delete Portfolio ---
  const handleDeletePortfolio = async () => {
    if (!portfolioId) return;
    if (!window.confirm("Are you sure you want to delete this portfolio and all its holdings?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/portfolios/${portfolioId}`);
      navigate('/portfolios'); // Redirect to portfolio overview after deletion
    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error deleting portfolio:', errorMessage);
      setError(errorMessage);
    }
  };

  // --- Add Asset ---
  const handleAddAsset = async () => {
    if (!portfolioId || !selectedTicker) { // Removed quantity and averageCost validation
      setError("Please select an asset."); // Updated error message
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/portfolios/${portfolioId}/holdings`, {
        ticker: selectedTicker,
        // Removed quantity and average_cost from payload
      });
      setIsAddAssetModalOpen(false);
      setSelectedAssetType('');
      setSelectedTicker('');
      // Removed setQuantity and setAverageCost
      setError(null);
      // Re-fetch portfolio details to update the holdings table
      fetchPortfolioDetails(); 
    } catch (err: unknown) {
      console.error("Error adding asset:", err);
      let errorMessage = "Failed to add asset.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (axios.isAxiosError(err) && err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    }
  };

  // --- Fetch Portfolio Details ---
  const fetchPortfolioDetails = useCallback(async () => {
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
      const response = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch portfolio summary');
      }
      const summaryData: PortfolioSummary = await response.json();
      setSummary(summaryData);

    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error fetching portfolio details:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]); // Add portfolioId to useCallback dependencies

  useEffect(() => {
    fetchPortfolioDetails();
  }, [portfolioId, fetchPortfolioDetails]);

  if (loading) {
    return <div className="text-white text-center py-8">Loading portfolio details...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Error: {error}</div>;
  }

  if (!portfolio) {
    return <div className="text-white text-center py-8">Portfolio not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center">{portfolio.name} Details</h1>
        <div className="flex space-x-4">
          <button 
            onClick={() => setIsAddAssetModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Asset
          </button>
          <button 
            onClick={handleDeletePortfolio}
            className="btn-danger"
            title="Delete Portfolio"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard 
            title="Number of Holdings" 
            value={summary.holdings.length.toString()}
            subValue="Assets in Portfolio"
            trend="neutral"
            isCurrency={false}
          />
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

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Add New Asset</h2>
              <button 
                onClick={() => {
                  setIsAddAssetModalOpen(false);
                  setError(null); // Clear error when closing modal
                  setSelectedAssetType('');
                  setSelectedTicker('');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {error && (
              <div className="bg-rose-500/20 text-rose-400 p-3 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="assetType" className="block text-sm font-medium text-slate-300 mb-2">Asset Type</label>
              <select
                id="assetType"
                className="input-field w-full"
                value={selectedAssetType}
                onChange={(e) => {
                  setSelectedAssetType(e.target.value as keyof TickersData);
                  setSelectedTicker(''); // Reset ticker when asset type changes
                }}
              >
                <option value="">Select Asset Type</option>
                {Object.keys(tickersData).map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_tickers', '').replace(/./, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {selectedAssetType && (
              <div className="mb-4">
                <label htmlFor="ticker" className="block text-sm font-medium text-slate-300 mb-2">Ticker</label>
                <select
                  id="ticker"
                  className="input-field w-full"
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                >
                  <option value="">Select Ticker</option>
                  {(tickersData[selectedAssetType as keyof TickersData] as Ticker[]).map((t: Ticker) => (
                    <option key={t.ticker} value={t.ticker}>
                      {t.ticker} - {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => {
                  setIsAddAssetModalOpen(false);
                  setError(null); // Clear error when closing modal
                  setSelectedAssetType('');
                  setSelectedTicker('');
                }} 
                className="btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleAddAsset} className="btn-primary">
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDetailScreen;
