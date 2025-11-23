import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  Plus,
  Wallet,
  Briefcase,
  ArrowUpRight
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { usePolling } from '../hooks/usePolling';
import PerformanceChart from './PerformanceChart';
import MetricCard from './MetricCard';
import DashboardLayout from './DashboardLayout';
import HoldingsTable from './HoldingsTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface Portfolio {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface PortfolioSummary {
  total_current_value: number;
  total_percentage_change: number;
  holdings: any[]; // Using any[] or Holding[] if imported, but to be safe with existing types
}

const PortfolioOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAdmin();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  const [history, setHistory] = useState<{ date: string; value: number; percentage_change: number }[]>([]);
  const [benchmarkHistory, setBenchmarkHistory] = useState<{ date: string; percentage_change: number }[]>([]);

  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<'1d' | 'all'>('all');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (portfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios]);

  useEffect(() => {
    if (selectedPortfolioId) {
      fetchPortfolioSummary(selectedPortfolioId);
      fetchPortfolioHistory(selectedPortfolioId, timeRange);
    }
  }, [selectedPortfolioId, timeRange]);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios`);
      const data = await response.json();
      setPortfolios(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      setLoading(false);
    }
  };

  const fetchPortfolioSummary = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchPortfolioHistory = async (id: string, range: string = 'all') => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${id}/history?period=${range}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setBenchmarkHistory(data.benchmark_history || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
      setBenchmarkHistory([]);
    }
  };

  // Unified refresh function for auto-polling
  const refreshData = useCallback(async () => {
    if (!selectedPortfolioId) return;

    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchPortfolioSummary(selectedPortfolioId),
        fetchPortfolioHistory(selectedPortfolioId, timeRange)
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPortfolioId, timeRange]);

  // Auto-refresh every 5 minutes
  usePolling(refreshData, 5 * 60 * 1000, !!selectedPortfolioId);

  const createPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/portfolios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPortfolioName }),
      });

      if (response.ok) {
        const newPortfolio = await response.json();
        setPortfolios([...portfolios, newPortfolio]);
        setNewPortfolioName('');
        setIsCreateModalOpen(false);
        setSelectedPortfolioId(newPortfolio.id);
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <DashboardLayout
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      onRefresh={refreshData}
      onLogout={isAdmin ? logout : undefined}
      sidebarContent={
        <>
          <div className="flex justify-between items-center mb-6">
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Add Portfolio"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {portfolios.map((portfolio) => {
              const isSelected = selectedPortfolioId === portfolio.id;
              const portfolioPerformance = isSelected && summary ? summary.total_percentage_change : null;
              const hasPerformance = portfolioPerformance !== null;
              const isPositive = hasPerformance && portfolioPerformance >= 0;

              return (
                <button
                  key={portfolio.id}
                  onClick={() => setSelectedPortfolioId(portfolio.id)}
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
                        {portfolio.name}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></div>
                    )}
                  </div>

                  {hasPerformance && (
                    <div className={`
                      inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold relative z-10
                      ${isPositive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }
                    `}>
                      {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{portfolioPerformance.toFixed(2)}%
                    </div>
                  )}
                </button>
              );
            })}

            {portfolios.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 bg-slate-900/50">
                <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No portfolios yet</p>
                {isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    Create your first one
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      }
    >
      {selectedPortfolioId && summary ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{portfolios.find(p => p.id === selectedPortfolioId)?.name}</h1>
            </div>
            <button
              onClick={() => navigate(`/portfolios/${selectedPortfolioId}`)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
            >
              <span className="font-medium">Manage Holdings</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <MetricCard
              title=""
              value={summary ? `${summary.total_percentage_change >= 0 ? '+' : ''}${summary.total_percentage_change.toFixed(2)}%` : '...'}
              // @ts-ignore
              icon={TrendingUp}
              trend={summary ? (summary.total_percentage_change >= 0 ? 'up' : 'down') : 'neutral'}
              isPercentage
              delay={100}
            />
            <MetricCard
              title=""
              value={summary ? summary.holdings.length.toString() : '0'}
              // @ts-ignore
              icon={Briefcase}
              delay={200}
            />
          </div>

          {/* Chart Section */}
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <PerformanceChart
              data={history}
              benchmarkData={benchmarkHistory}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          {/* Holdings Table Section */}
          <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Top Holdings</h3>
            </div>
            <HoldingsTable
              holdings={summary ? summary.holdings : []}
              onRefresh={refreshData}
            />
          </div>
        </>
      ) : (
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500">
          <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-black/20">
            <LayoutDashboard className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">Welcome to Portfolio Tracker</h3>
          <p className="text-slate-500 max-w-md text-center">
            Select a portfolio from the sidebar to view detailed performance metrics.
          </p>
        </div>
      )}

      {/* Create Portfolio Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-black/50 animate-scale-in">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Portfolio</h2>
            <form onSubmit={createPortfolio}>
              <input
                type="text"
                placeholder="Portfolio Name (e.g., Retirement Fund)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all mb-6"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPortfolioName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PortfolioOverviewScreen;