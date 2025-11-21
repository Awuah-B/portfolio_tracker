import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Portfolio } from '../types/Portfolio';
import { 
  X,
  Plus,
  Wallet,
  Activity,
  BarChart3,
  ChevronRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const PortfolioOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch portfolios.";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        console.error("Error fetching portfolios:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolios();
  }, [selectedPortfolioId]);

  // --- Create Portfolio ---
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/portfolios`, { 
        name: newPortfolioName.trim() 
      });
      setPortfolios(prev => [...prev, response.data]);
      setSelectedPortfolioId(response.data.id);
      setNewPortfolioName('');
      setIsCreating(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error creating portfolio:", err);
      let errorMessage = "Failed to create portfolio.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (axios.isAxiosError(err) && err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-orange-500/20 rounded-full" />
            <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500/30">
      
      {/* Top Terminal Bar */}
      <header className="h-8 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="flex">
        
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-2rem)] sticky top-8 border-r border-zinc-800 bg-zinc-950">
          
          {/* Quick Stats */}
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-[10px] font-mono text-zinc-500">POSITIONS</span>
              <span className="text-sm font-mono text-zinc-100">--</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
                  Portfolio Overview
                </h1>
              </div>

              {/* Mobile Controls */}
              <div className="md:hidden mt-4 space-y-3">
                <select
                  value={selectedPortfolioId || ''}
                  onChange={(e) => setSelectedPortfolioId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm font-mono rounded px-3 py-2 focus:border-orange-500 outline-none"
                >
                  {portfolios.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {portfolios.length === 0 && <option value="">NO PORTFOLIOS</option>}
                </select>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-mono text-orange-500 hover:text-orange-400 py-2 border border-zinc-800 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  NEW PORTFOLIO
                </button>
              </div>
            </div>
            
            {/* Action Button */}
            <button 
              onClick={() => navigate(`/portfolios/${selectedPortfolioId}`)}
              disabled={!selectedPortfolioId}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-semibold text-sm px-5 py-2.5 rounded transition-all disabled:cursor-not-allowed"
            >
              <span>View Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-950/50 border border-red-900 rounded p-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xs font-mono uppercase">Error:</span>
                <span className="text-red-400 text-sm">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Create Portfolio Modal */}
          {isCreating && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-md shadow-2xl">
                <div className="mb-4">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., EQUITY_GROWTH_2024"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm font-mono rounded px-4 py-3 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none placeholder-zinc-600 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => { setIsCreating(false); setNewPortfolioName(''); }} 
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createPortfolio} 
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm rounded transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {portfolios.length === 0 && (
            <div className="border border-zinc-800 rounded-lg p-12 text-center bg-zinc-950/50">
              <div className="w-16 h-16 mx-auto mb-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Portfolios</h3>
              <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto font-mono">
                Create your first portfolio to begin tracking positions and performance.
              </p>
              <button 
                onClick={() => setIsCreating(true)} 
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm px-5 py-2.5 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Portfolio
              </button>
            </div>
          )}

          {/* Performance Panel */}
          {portfolios.length > 0 && (
            <div className="border border-zinc-800 rounded-lg bg-zinc-950/50 overflow-hidden">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <button className="text-zinc-500 hover:text-orange-500 transition-colors">1D</button>
                  <button className="text-zinc-500 hover:text-orange-500 transition-colors">1W</button>
                  <button className="text-orange-500">1M</button>
                  <button className="text-zinc-500 hover:text-orange-500 transition-colors">1Y</button>
                  <button className="text-zinc-500 hover:text-orange-500 transition-colors">ALL</button>
                </div>
              </div>
              
              {/* Chart Area */}
              <div className="p-6 min-h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium mb-1">Performance Data</p>
                  <p className="text-zinc-600 text-xs font-mono">Awaiting market data feed</p>
                </div>
              </div>

              {/* Panel Footer Stats */}
              
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PortfolioOverviewScreen;