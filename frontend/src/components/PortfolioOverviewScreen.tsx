import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Portfolio } from '../types/Portfolio';
import { 
  Trash2, 
  RefreshCw,
  X
} from 'lucide-react';
import MetricCard from './MetricCard';
import SimplePieChart from './SimplePieChart'; // Assuming this component will be updated to use new data

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface PortfolioSummary {
  portfolio_id: string;
  total_current_value: number;
  total_percentage_change: number;
  holdings: any[]; // HoldingCalculatedResponse[]
  allocation: any[]; // AllocationItem[]
}

const PortfolioOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false); // State for create portfolio form
  const [newPortfolioName, setNewPortfolioName] = useState('');

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

  // --- Fetch Portfolio Summary ---
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
    const interval = setInterval(fetchPortfolioSummary, 180000); 
    return () => clearInterval(interval);
  }, [selectedPortfolioId]);

  // --- Calculations ---
  const portfolio = useMemo(() => {
    if (!portfolioSummary) {
      return { 
        id: '', 
        name: 'No Portfolio', 
        totalCurrentValue: 0, 
        totalPercentageChange: 0, 
        items: [], 
        allocation: [] 
      };
    }

    const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const portfolioName = currentPortfolio ? currentPortfolio.name : 'No Portfolio';

    return {
      id: portfolioSummary.portfolio_id,
      name: portfolioName,
      totalCurrentValue: portfolioSummary.total_current_value,
      totalPercentageChange: portfolioSummary.total_percentage_change,
      items: portfolioSummary.holdings,
      allocation: portfolioSummary.allocation,
    };
  }, [portfolioSummary, selectedPortfolioId, portfolios]);

  // --- Create Portfolio ---
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/portfolios`, { name: newPortfolioName.trim() });
      setPortfolios(prev => [...prev, response.data]);
      setSelectedPortfolioId(response.data.id);
      setNewPortfolioName('');
      setIsCreating(false);
      setError(null);
    } catch (err: any) {
      console.error("Error creating portfolio:", err);
      setError(err.response?.data?.detail || "Failed to create portfolio.");
    }
  };

  // --- Delete Portfolio ---
  const handleDeletePortfolio = async () => {
    if (!selectedPortfolioId || !window.confirm("Are you sure you want to delete this portfolio and all its holdings?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/portfolios/${selectedPortfolioId}`);
      setPortfolios(prev => prev.filter(p => p.id !== selectedPortfolioId));
      setSelectedPortfolioId(null);
      setPortfolioSummary(null);
      setError(null);
    } catch (err) {
      console.error("Error deleting portfolio:", err);
      setError("Failed to delete portfolio.");
    }
  };

  if (loading) return <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  const isPositiveChange = portfolio.totalPercentageChange >= 0;

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30">
      
      <div className="flex max-w-[1600px] mx-auto">
        
        {/* Desktop Sidebar - Only Portfolio Management */}
        <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 p-6 border-r border-white/5 bg-[#0f172a]/50 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-8 tracking-tight">Portfolio Tracker</h1>
          
          {/* Portfolio Selector */}
          <div className="flex-1">
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
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-3 w-full flex items-center justify-center space-x-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 py-2 hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              <span>Create New Portfolio</span>
            </button>
            {isCreating && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    createPortfolio();
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                    <input 
                      type="text" 
                      required
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      placeholder="e.g., Long Term Hodl"
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="flex-1 bg-slate-700/50 text-slate-400 py-2 rounded-lg text-sm font-medium hover:bg-slate-600/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24">
          
          {/* Content Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {portfolio.name} Overview
              </h1>
              <div className="flex items-center space-x-2 mt-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-slate-400 text-sm font-medium">Live Market Updates Active</p>
              </div>

              {/* Mobile Portfolio Controls */}
              <div className="md:hidden mt-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Portfolio</p>
                <div className="relative group mb-3">
                  <select
                    value={selectedPortfolioId || ''}
                    onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    className="w-full appearance-none bg-slate-900/50 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block px-4 py-3 pr-8 outline-none transition-all cursor-pointer hover:bg-slate-800"
                  >
                    {portfolios.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    {portfolios.length === 0 && <option value="">No Portfolios</option>}
                  </select>
                </div>
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
                onClick={() => navigate(`/portfolios/${selectedPortfolioId}`)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>View Details</span>
              </button>
            </div>
          </div>

          {/* Global Error Message */}
          {error && (
            <div className="glass-panel p-4 mb-6 text-rose-400 text-sm rounded-xl border border-rose-500/20 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Total Current Value" 
                value={portfolio.totalCurrentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                subValue={`${isPositiveChange ? '+' : ''}${portfolio.totalPercentageChange.toFixed(2)}%`}
                trend={isPositiveChange ? 'up' : 'down'}
                isCurrency={true}
              />
            </div>
            {/* Placeholder for other metric cards */}
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <MetricCard 
                title="Total Percentage Change" 
                value={`${isPositiveChange ? '+' : ''}${portfolio.totalPercentageChange.toFixed(2)}%`}
                subValue="Overall Portfolio"
                trend={isPositiveChange ? 'up' : 'down'}
                isCurrency={false}
              />
            </div>
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Number of Holdings" 
                value={portfolio.items.length.toString()}
                subValue="Assets in Portfolio"
                trend="neutral"
                isCurrency={false}
              />
            </div>
            <div className="glass-panel p-1 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MetricCard 
                title="Asset Allocation" 
                value="View Chart"
                subValue="Distribution of Assets"
                trend="neutral"
                isCurrency={false}
              />
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 min-h-[300px] mb-10">
            <h3 className="text-lg font-bold text-white mb-6">Portfolio Performance Chart</h3>
            {/* This is where a performance chart component would go */}
            <div className="flex items-center justify-center h-48 text-slate-500">
              [Performance Chart Placeholder]
            </div>
          </div>

          {/* Asset Allocation Chart */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 min-h-[300px]">
            <h3 className="text-lg font-bold text-white mb-6">Asset Allocation</h3>
            <div className="flex items-center justify-center mb-6">
              {portfolio.allocation.length > 0 ? (
                <SimplePieChart data={portfolio.allocation} />
              ) : (
                <p className="text-slate-400">No allocation data available.</p>
              )}
            </div>
            <div className="space-y-2">
              {portfolio.allocation.map((item) => (
                <div key={item.name} className="flex justify-between text-sm text-slate-300">
                  <span>{item.name} ({item.type})</span>
                  <span>${item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PortfolioOverviewScreen;