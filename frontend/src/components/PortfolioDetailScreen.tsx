import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Holding, Portfolio } from '../types/Portfolio';
import { supabase } from '../supabaseClient';
import HoldingsTable from './HoldingsTable';
import MetricCard from './MetricCard';
import DashboardLayout from './DashboardLayout';
import { Trash2, Plus, X, Wallet, Briefcase, ArrowLeft, TrendingUp } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

// Import tickers.json
import tickersData from '../../tickers.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface PortfolioSummary {
  total_current_value: number;
  total_percentage_change: number;
  holdings: Holding[];
  allocation: { name: string; value: number }[];
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
  const navigate = useNavigate();
  const { isAdmin, logout } = useAdmin();

  // State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]); // For sidebar
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // State for Add Asset Modal
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<keyof TickersData | ''>('');
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [startingPrice, setStartingPrice] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  // Fetch all portfolios for sidebar
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/portfolios`);
        const data = await response.json();
        setPortfolios(data);
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      }
    };
    fetchPortfolios();
  }, []);

  // Effect to fetch current price when ticker changes
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (selectedTicker) {
        setIsFetchingPrice(true);
        try {
          const response = await axios.get(`${API_BASE_URL}/market_data/current_price/${selectedTicker}`);
          setStartingPrice(response.data);
          setError(null);
        } catch (err: unknown) {
          console.error("Error fetching current price:", err);
          setStartingPrice('');
        } finally {
          setIsFetchingPrice(false);
        }
      } else {
        setStartingPrice('');
      }
    };

    fetchCurrentPrice();
  }, [selectedTicker]);

  // --- Delete Portfolio ---
  const handleDeletePortfolio = async () => {
    if (!portfolioId) return;
    if (!window.confirm("Are you sure you want to delete this portfolio and all its holdings?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/portfolios/${portfolioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  // --- Add Asset ---
  const handleAddAsset = async () => {
    if (!portfolioId || !selectedTicker || startingPrice === '' || purchaseDate === '') {
      setError("Please fill all asset details.");
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API_BASE_URL}/portfolios/${portfolioId}/holdings`, {
        ticker: selectedTicker,
        starting_price: startingPrice,
        purchase_date: `${purchaseDate}T00:00:00`,
        asset_type: ({
          'crypto_tickers': 'crypto',
          'stocks_tickers': 'stock',
          'etfs_tickers': 'etf',
          'commodities_tickers': 'commodities',
          'bond_interests_tickers': 'bonds',
          'miners_tickers': 'etf',
          'indices_tickers': 'stock',
          'forex_tickers': 'commodities'
        } as Record<string, string>)[selectedAssetType as string] || 'stock',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAddAssetModalOpen(false);
      setSelectedAssetType('');
      setSelectedTicker('');
      setStartingPrice('');
      setPurchaseDate('');
      setError(null);
      fetchPortfolioDetails();
    } catch (err: unknown) {
      console.error("Error adding asset:", err);
      setError("Failed to add asset.");
    }
  };

  // --- Fetch Portfolio Details ---
  const fetchPortfolioDetails = useCallback(async () => {
    if (!portfolioId) return;

    setIsRefreshing(true);
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

      // Fetch portfolio summary
      const response = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}`);
      if (!response.ok) throw new Error('Failed to fetch portfolio summary');

      const summaryData: PortfolioSummary = await response.json();
      setSummary(summaryData);
      setLastUpdated(new Date());

    } catch (err: unknown) {
      console.error('Error fetching portfolio details:', err);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchPortfolioDetails();
  }, [portfolioId, fetchPortfolioDetails]);

  if (loading && !portfolio) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!portfolio) {
    return <div className="text-white text-center py-8">Portfolio not found.</div>;
  }

  return (
    <DashboardLayout
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      onRefresh={fetchPortfolioDetails}
      onLogout={isAdmin ? logout : undefined}
      selectedPortfolioName={portfolio.name}
      onViewFullHoldings={null} // Already here
      sidebarContent={
        <>
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Back to Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {portfolios.map((p) => {
              const isSelected = p.id === portfolioId;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/portfolios/${p.id}`)} // Navigate on click
                  className={`
                    w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden
                    ${isSelected
                      ? 'bg-gradient-to-br from-slate-800 to-slate-800/80 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60'
                    }
                  `}
                >
                  {isSelected && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}

                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {p.name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      }
    >
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900">{portfolio.name}</h1>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setIsAddAssetModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
          <button
            onClick={handleDeletePortfolio}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Portfolio</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <MetricCard
            title=""
            value={`${summary.total_percentage_change >= 0 ? '+' : ''}${summary.total_percentage_change.toFixed(2)}%`}
            // @ts-ignore
            icon={TrendingUp}
            trend={summary.total_percentage_change >= 0 ? 'up' : 'down'}
            isPercentage
            delay={100}
          />
          <MetricCard
            title=""
            value={summary.holdings.length.toString()}
            // @ts-ignore
            icon={Briefcase}
            trend="neutral"
            delay={200}
          />
        </div>
      )}

      <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-1">
        <div className="p-4 border-b border-slate-800/50 mb-4">
          <h2 className="text-lg font-bold text-white">Holdings</h2>
        </div>
        {summary && summary.holdings.length > 0 ? (
          <HoldingsTable holdings={summary.holdings} onRefresh={fetchPortfolioDetails} />
        ) : (
          <div className="text-center p-12 text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No holdings in this portfolio yet.</p>
            {isAdmin && (
              <button
                onClick={() => setIsAddAssetModalOpen(true)}
                className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Add your first asset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-black/50 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Asset</h2>
              <button
                onClick={() => {
                  setIsAddAssetModalOpen(false);
                  setError(null);
                  setSelectedAssetType('');
                  setSelectedTicker('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asset Type</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                  value={selectedAssetType}
                  onChange={(e) => {
                    setSelectedAssetType(e.target.value as keyof TickersData);
                    setSelectedTicker('');
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ticker</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
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

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Starting Price</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    placeholder="Fetching price..."
                    value={startingPrice}
                    readOnly
                    step="any"
                  />
                  {isFetchingPrice && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => {
                  setIsAddAssetModalOpen(false);
                  setError(null);
                  setSelectedAssetType('');
                  setSelectedTicker('');
                  setStartingPrice('');
                  setPurchaseDate('');
                }}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                disabled={!selectedTicker || startingPrice === '' || purchaseDate === ''}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PortfolioDetailScreen;
