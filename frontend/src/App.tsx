import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import HoldingsTable from './components/HoldingsTable';
import MetricCard from './components/MetricCard';
import SimplePieChart from './components/SimplePieChart';
import type { Portfolio } from './types/Portfolio'; // We'll update this type later
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  Plus, 
  Trash2, 
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Clock,
  Star,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

import ALL_TICKERS_DATA from '../tickers.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const flattenTickers = (data: any) => {
  const allTickers: { ticker: string; name: string; type: string }[] = [];
  Object.entries(data).forEach(([categoryKey, categoryValue]) => {
    (categoryValue as any[]).forEach(item => {
      let type = 'Unknown';
      if (categoryKey === 'crypto_tickers') type = 'Crypto';
      else if (categoryKey === 'stocks_tickers') type = 'Stock';
      else if (categoryKey === 'forex_tickers') type = 'Forex';
      else if (categoryKey === 'commodities_tickers') type = 'Commodity';
      else if (categoryKey === 'etfs_tickers') type = 'ETF';
      else if (categoryKey === 'indices_tickers') type = 'Index';
      else if (categoryKey === 'bond_interests_tickers') type = 'Bond';
      else if (categoryKey === 'miners_tickers') type = 'Miner';
      allTickers.push({ ...item, type });
    });
  });
  return allTickers;
};

const ALL_FLATTENED_TICKERS = flattenTickers(ALL_TICKERS_DATA);



interface AssetInfo {
  name: string;
  type: string;
}

interface HoldingCalculatedResponse {
  id: string;
  portfolio_id: string;
  ticker: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  last_updated: string;
  current_price: number;
  position_value: number;
  cost_basis: number;
  unrealised_gain: number;
  unrealised_gain_percent: number;
  asset_info?: AssetInfo;
}

interface AllocationItem {
  name: string;
  value: number;
  type: string;
}

interface PortfolioSummary {
  portfolio_id: string;
  total_value: number;
  total_cost_basis: number;
  total_unrealised_gain: number;
  total_unrealised_gain_percent: number;
  holdings: HoldingCalculatedResponse[];
  allocation: AllocationItem[];
}

function App() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePortfolioModalOpen, setIsCreatePortfolioModalOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  
  // Form State
  const [symbol, setSymbol] = useState('BTC-USD'); // Default to a crypto ticker
  const [amount, setAmount] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [assetType, setAssetType] = useState('CRYPTO'); // Default asset type
  const [selectedAssetTypeFilter, setSelectedAssetTypeFilter] = useState('CRYPTO'); // New state for filtering tickers

  // --- Fetch Portfolios ---
  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/portfolios`);
        setPortfolios(response.data || []);
        if (response.data && response.data.length > 0 && !selectedPortfolioId) {
          setSelectedPortfolioId(response.data[0].id);
        }
      } catch (err) {
        console.error("Error fetching portfolios:", err);
        setError("Failed to fetch portfolios.");
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolios();
  }, []);

  // --- Fetch Portfolio Summary (Holdings with Live Prices) ---
  useEffect(() => {
    const fetchPortfolioSummary = async () => {
      if (!selectedPortfolioId) {
        setPortfolioSummary(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/portfolios/${selectedPortfolioId}`);
        setPortfolioSummary(response.data);
      } catch (err) {
        console.error("Error fetching portfolio summary:", err);
        setError("Failed to fetch portfolio summary.");
        setPortfolioSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioSummary();
    // Refresh every 3 minutes
    const interval = setInterval(fetchPortfolioSummary, 180000); 
    return () => clearInterval(interval);
  }, [selectedPortfolioId]);

  // --- Calculations ---
  const portfolio = useMemo(() => {
    if (!portfolioSummary) {
      return { 
        id: '', 
        name: 'No Portfolio', 
        totalValue: 0, 
        totalCost: 0, 
        totalUnrealisedGain: 0, 
        totalPercent: 0, 
        items: [], 
        allocation: [] 
      };
    }

    const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const portfolioName = currentPortfolio ? currentPortfolio.name : 'No Portfolio';

    return {
      id: portfolioSummary.portfolio_id,
      name: portfolioName,
      totalValue: portfolioSummary.total_value,
      totalCost: portfolioSummary.total_cost_basis,
      totalUnrealisedGain: portfolioSummary.total_unrealised_gain,
      totalPercent: portfolioSummary.total_unrealised_gain_percent,
      items: portfolioSummary.holdings,
      allocation: portfolioSummary.allocation,
    };
  }, [portfolioSummary, selectedPortfolioId, portfolios]);

  const bestPerformer = useMemo(() => {
    if (portfolio.items.length === 0) return null;
    return portfolio.items.reduce((a, b) => a.unrealised_gain > b.unrealised_gain ? a : b);
  }, [portfolio.items]);

  const worstPerformer = useMemo(() => {
    if (portfolio.items.length === 0) return null;
    return portfolio.items.reduce((a, b) => a.unrealised_gain < b.unrealised_gain ? a : b);
  }, [portfolio.items]);

  // --- Actions ---
  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/portfolios`, { name: newPortfolioName.trim() });
      setPortfolios(prev => [...prev, response.data]);
      setSelectedPortfolioId(response.data.id);
      setIsCreatePortfolioModalOpen(false);
      setNewPortfolioName('');
    } catch (err) {
      console.error("Error creating portfolio:", err);
      setError("Failed to create portfolio.");
    }
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolioId || !window.confirm("Are you sure you want to delete this portfolio and all its holdings?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/portfolios/${selectedPortfolioId}`);
      setPortfolios(prev => prev.filter(p => p.id !== selectedPortfolioId));
      setSelectedPortfolioId(null); // Clear selected portfolio
      setPortfolioSummary(null); // Clear summary
    } catch (err) {
      console.error("Error deleting portfolio:", err);
      setError("Failed to delete portfolio.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !avgCost || !selectedPortfolioId) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/portfolios/${selectedPortfolioId}/holdings`, { 
        ticker: symbol, 
        quantity: parseFloat(amount), 
        avg_cost: parseFloat(avgCost),
        asset_type: assetType.toLowerCase() // Convert to lowercase to match backend Enum
      });
      // Re-fetch portfolio summary to update holdings and calculations
      const summaryResponse = await axios.get(`${API_BASE_URL}/portfolios/${selectedPortfolioId}`);
      setPortfolioSummary(summaryResponse.data);

      setIsModalOpen(false); 
      setAmount(''); 
      setAvgCost('');
      setSymbol('BTC-USD'); // Reset symbol
      setAssetType('CRYPTO'); // Reset asset type
    } catch (err: any) {
      console.error("Error adding holding:", err);
      setError(err.response?.data?.detail || "Failed to add holding.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedPortfolioId || !window.confirm("Are you sure you want to delete this holding?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/holdings/${id}`);
      // Re-fetch portfolio summary to update holdings and calculations
      const summaryResponse = await axios.get(`${API_BASE_URL}/portfolios/${selectedPortfolioId}`);
      setPortfolioSummary(summaryResponse.data);
    } catch (err) {
      console.error("Error deleting holding:", err);
      setError("Failed to delete holding.");
    }
  };

  if (loading) return <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Mobile Header */}
      <div className="md:hidden glass-panel p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xl tracking-tight">
          <Wallet className="w-6 h-6" />
          <span></span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-500/20">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex max-w-[1600px] mx-auto">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 p-6 border-r border-white/5 bg-[#0f172a]/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3 text-white font-bold text-2xl mb-12 pl-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"></span>
          </div>
          
          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${view === 'dashboard' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard className={`w-5 h-5 ${view === 'dashboard' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="font-medium tracking-wide">Dashboard</span>
            </button>
            <button 
              onClick={() => setView('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${view === 'analytics' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <PieChartIcon className={`w-5 h-5 ${view === 'analytics' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="font-medium tracking-wide">Analytics</span>
            </button>
          </nav>

          {/* Portfolio Selector in Sidebar Footer */}
          <div className="pt-6 border-t border-white/10">
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-2">Active Portfolio</p>
             <div className="relative group">
                <select
                  value={selectedPortfolioId || ''}
                  onChange={(e) => setSelectedPortfolioId(e.target.value)}
                  className="w-full appearance-none bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block px-4 py-3 pr-8 outline-none transition-all cursor-pointer hover:bg-slate-800"
                >
                  {portfolios.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  {portfolios.length === 0 && <option value="">No Portfolios</option>}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-white transition-colors" />
             </div>
             <button 
                onClick={() => setIsCreatePortfolioModalOpen(true)}
                className="mt-3 w-full flex items-center justify-center space-x-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 py-2 hover:bg-indigo-500/10 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Create New Portfolio</span>
              </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24">
          
          {/* Content Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                 {portfolio.name}
              </h1>
              <div className="flex items-center space-x-2 mt-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-slate-400 text-sm font-medium">Live Market Updates Active</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedPortfolioId && (
                <button 
                  onClick={handleDeletePortfolio}
                  className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete Portfolio"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-5 h-5" />
                <span>Add Asset</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Grid - Styling Wrappers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Total Profit / Loss" 
                value={portfolio.totalUnrealisedGain.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                subValue={`${portfolio.totalPercent >= 0 ? '+' : ''}${portfolio.totalPercent.toFixed(2)}%`}
                trend={portfolio.totalPercent >= 0 ? 'up' : 'down'}
                isCurrency={true}
              />
            </div>
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <MetricCard 
                title="Best Performer" 
                value={bestPerformer ? bestPerformer.ticker : 'N/A'}
                subValue={bestPerformer ? `${bestPerformer.unrealised_gain >= 0 ? '+' : ''}${((bestPerformer.unrealised_gain / bestPerformer.cost_basis) * 100).toFixed(2)}%` : '0%'}
                trend={bestPerformer ? (bestPerformer.unrealised_gain >= 0 ? 'up' : 'down') : 'neutral'}
                isCurrency={false}
              />
            </div>
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Portfolio Value" 
                value={portfolio.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                subValue={`${portfolio.totalPercent >= 0 ? '+' : ''}${portfolio.totalPercent.toFixed(2)}% Overall`}
                trend={portfolio.totalPercent >= 0 ? 'up' : 'down'}
                isCurrency={true}
              />
            </div>
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Worst Performer" 
                value={worstPerformer ? worstPerformer.ticker : 'N/A'}
                subValue={worstPerformer ? `${worstPerformer.unrealised_gain >= 0 ? '+' : ''}${((worstPerformer.unrealised_gain / worstPerformer.cost_basis) * 100).toFixed(2)}%` : '0%'}
                trend={worstPerformer ? (worstPerformer.unrealised_gain >= 0 ? 'up' : 'down') : 'neutral'}
                isCurrency={false}
              />
            </div>
          </div>

          {/* Dynamic View Content */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 min-h-[400px]">
            {view === 'dashboard' ? (
              <>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Holdings</h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-white/5">{portfolio.items.length} Assets</span>
                </div>
                <HoldingsTable holdings={portfolio.items} onDelete={handleDelete} />
              </>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-white mb-6">Asset Allocation</h3>
                  <div className="flex items-center justify-center">
                     <SimplePieChart data={portfolio.allocation} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {portfolio.allocation.map((item) => (
                      <div key={item.name} className="flex justify-between text-sm text-slate-300">
                        <span>{item.name} ({item.type})</span>
                        <span>${item.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-white mb-6">Performance Breakdown</h3>
                  <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {portfolio.items.map(asset => (
                      <div key={asset.ticker} className="group bg-slate-700/30 p-4 rounded-lg hover:bg-slate-600/50 transition-colors">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{asset.ticker}</span>
                          <span className={`font-mono flex items-center space-x-1 ${asset.unrealised_gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {asset.unrealised_gain >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {asset.unrealised_gain >= 0 ? '+' : ''}{((asset.unrealised_gain / asset.cost_basis) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${asset.unrealised_gain >= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-rose-400'}`}
                            style={{ width: `${Math.min(Math.abs((asset.unrealised_gain / asset.cost_basis) * 100), 100)}%` }} 
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- Create Portfolio Modal --- */}
      {isCreatePortfolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-modal rounded-2xl w-full max-w-md relative p-1 shadow-2xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">New Portfolio</h2>
                    <button onClick={() => setIsCreatePortfolioModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
              
              <form onSubmit={handleCreatePortfolio} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                  <input 
                    type="text" 
                    required
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="e.g., Long Term Hodl"
                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98]"
                >
                  Create Portfolio
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Asset Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-modal rounded-2xl w-full max-w-md relative shadow-2xl">
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="2xl font-bold text-white">Add Asset</h2>
                        <p className="text-slate-400 text-sm mt-1">Track a new position</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
              
              <form onSubmit={handleAdd} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Asset Symbol</label>
                  <div className="relative">
                    <select 
                        value={symbol}
                        onChange={(e) => {
                          const selectedTicker = ALL_FLATTENED_TICKERS.find(t => t.ticker === e.target.value);
                          if (selectedTicker) {
                            setSymbol(selectedTicker.ticker);
                            // assetType is already set by selectedAssetTypeFilter, no need to infer again
                          }
                        }}
                        className="w-full appearance-none bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        {ALL_FLATTENED_TICKERS
                            .filter(s => s.type.toUpperCase() === selectedAssetTypeFilter)
                            .map(s => (
                                <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                            ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Asset Type</label>
                  <div className="relative">
                    <select 
                        value={selectedAssetTypeFilter}
                        onChange={(e) => {
                          const newFilter = e.target.value;
                          setSelectedAssetTypeFilter(newFilter);
                          setAssetType(newFilter); // Also update the assetType state for submission

                          // Reset symbol to the first available ticker of the new type
                          const firstTickerOfType = ALL_FLATTENED_TICKERS.find(t => t.type.toUpperCase() === newFilter);
                          if (firstTickerOfType) {
                            setSymbol(firstTickerOfType.ticker);
                          } else {
                            setSymbol(''); // No tickers for this type
                          }
                        }}
                        className="w-full appearance-none bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="CRYPTO">Crypto</option>
                        <option value="STOCK">Stock</option>
                        <option value="ETF">ETF</option>
                        <option value="COMMODITIES">Commodity</option>
                        <option value="BONDS">Bond</option>
                        <option value="FOREX">Forex</option>
                        <option value="INDEX">Index</option>
                        <option value="MINER">Miner</option>
                        <option value="UNKNOWN">Unknown</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Avg. Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-500">$</span>
                      <input 
                        type="number" 
                        step="any"
                        required
                        value={avgCost}
                        onChange={(e) => setAvgCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-8 pr-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl mt-2 shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Transaction</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;