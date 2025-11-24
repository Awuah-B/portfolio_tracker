import React, { useState, useEffect, useCallback } from 'react';
import type { Holding } from '../types/Portfolio';
import {
    LayoutDashboard,
    Wallet,
    Briefcase,
} from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { useWebSocket } from '../hooks/useWebSocket';
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
    holdings: Holding[];
}

const PublicDashboard: React.FC = () => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const [history, setHistory] = useState<{ date: string; value: number; percentage_change: number }[]>([]);
    const [benchmarkHistory, setBenchmarkHistory] = useState<{ date: string; percentage_change: number }[]>([]);

    // Auto-refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [timeRange, setTimeRange] = useState<'1d' | 'all'>('all');

    // WebSocket connection
    const { isConnected, lastMessage } = useWebSocket();

    // Handle real-time updates
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'price_update') {
            setSummary(prev => {
                if (!prev) return null;
                const updatedHoldings = prev.holdings.map(h => {
                    if (h.ticker === lastMessage.ticker) {
                        return { ...h, current_price: lastMessage.price };
                    }
                    return h;
                });

                return {
                    ...prev,
                    holdings: updatedHoldings
                };
            });
        }
    }, [lastMessage]);

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
        setSummaryLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/portfolios/${id}`);
            if (response.ok) {
                const data = await response.json();
                setSummary(data);
            } else {
                setSummary(null);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
            setSummary(null);
        } finally {
            setSummaryLoading(false);
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
            isLive={isConnected}
            sidebarContent={
                <>
                    <div className="flex justify-between items-center mb-6">
                        {/* No Add Portfolio Button for Public View */}
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Portfolios</h3>
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
                                <p className="text-sm">No portfolios available</p>
                            </div>
                        )}
                    </div>
                </>
            }
        >
            {selectedPortfolioId ? (
                summaryLoading ? (
                    <div className="h-[60vh] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                ) : summary ? (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-2">{portfolios.find(p => p.id === selectedPortfolioId)?.name}</h1>
                            </div>
                            {/* No Manage Holdings Button for Public View */}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <MetricCard
                                title="Total Return"
                                value={summary ? `${summary.total_percentage_change >= 0 ? '+' : ''}${summary.total_percentage_change.toFixed(2)}%` : '...'}
                                trend={summary ? (summary.total_percentage_change >= 0 ? 'up' : 'down') : 'neutral'}
                                delay={100}
                            />
                            <MetricCard
                                title="Total Holdings"
                                value={summary ? summary.holdings.length.toString() : '0'}
                                trend="neutral"
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
                                <h3 className="text-lg font-bold text-slate-900">Top Holdings</h3>
                            </div>
                            <HoldingsTable
                                holdings={summary ? summary.holdings : []}
                                onRefresh={refreshData}
                            />
                        </div>
                    </>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500">
                        <p className="mb-4 text-lg">Failed to load portfolio data.</p>
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )
            ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                        <LayoutDashboard className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Welcome to Portfolio Tracker</h3>
                    <p className="text-slate-400 max-w-md text-center">
                        Select a portfolio from the sidebar to view detailed performance metrics.
                    </p>
                </div>
            )}
        </DashboardLayout>
    );
};

export default PublicDashboard;
