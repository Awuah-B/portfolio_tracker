import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PerformanceChartProps {
    data: { date: string; value: number; percentage_change: number }[];
    benchmarkData?: { date: string; percentage_change: number }[];
    timeRange: '1d' | 'all';
    onTimeRangeChange: (range: '1d' | 'all') => void;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
    data,
    benchmarkData = [],
    timeRange,
    onTimeRangeChange
}) => {
    const [showPortfolio, setShowPortfolio] = useState(true);
    const [showBenchmark, setShowBenchmark] = useState(true);

    // Determine if portfolio is overall positive or negative
    const latestChange = data.length > 0 ? data[data.length - 1].percentage_change : 0;
    const isPositive = latestChange >= 0;

    // Merge portfolio and benchmark data for the chart
    const chartData = data.map((point, index) => {
        const benchmarkPoint = benchmarkData[index];

        // Format date based on time range
        let formattedDate = '';
        if (timeRange === '1d') {
            // For intraday, show time (HH:MM)
            const dateObj = new Date(point.date);
            formattedDate = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // For daily, show date (MMM D)
            const dateObj = new Date(point.date);
            formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        return {
            date: formattedDate,
            fullDate: point.date,
            portfolio: point.percentage_change,
            benchmark: benchmarkPoint?.percentage_change || null,
        };
    });

    // Colors
    const portfolioColor = isPositive ? '#16a34a' : '#dc2626'; // green-600 or red-600
    const benchmarkColor = '#0891b2'; // cyan-600

    // Custom tooltip with color-coded values
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 shadow-xl">
                    <p className="text-slate-600 text-sm mb-3 font-semibold">{label}</p>
                    {payload.map((entry: any, index: number) => {
                        const isPositiveValue = entry.value >= 0;
                        return (
                            <div key={index} className="flex items-center justify-between space-x-6 mb-2">
                                <div className="flex items-center space-x-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm text-slate-600 font-medium">{entry.name}</span>
                                </div>
                                <span
                                    className="text-lg font-bold"
                                    style={{ color: entry.color }}
                                >
                                    {isPositiveValue ? '+' : ''}{entry.value?.toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // Custom legend with toggle functionality
    const CustomLegend = () => (
        <div className="flex justify-center space-x-4 mb-6">
            <button
                onClick={() => setShowPortfolio(!showPortfolio)}
                className={`
                    flex items-center space-x-3 px-5 py-2.5 rounded-xl transition-all duration-200 font-semibold
                    ${showPortfolio
                        ? 'bg-opacity-100 shadow-md'
                        : 'bg-slate-100 border border-slate-200 opacity-50 hover:opacity-70'
                    }
                `}
                style={{
                    backgroundColor: showPortfolio ? `${portfolioColor}15` : undefined,
                    borderColor: showPortfolio ? `${portfolioColor}30` : undefined,
                    color: showPortfolio ? portfolioColor : '#64748b'
                }}
            >
                <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: portfolioColor }}
                />
                <span className="text-sm">Portfolio</span>
                <span
                    className="text-sm font-bold px-2 py-0.5 rounded ml-2"
                    style={{
                        backgroundColor: `${portfolioColor}15`,
                        color: portfolioColor
                    }}
                >
                    {isPositive ? '+' : ''}{latestChange.toFixed(2)}%
                </span>
            </button>

            <button
                onClick={() => setShowBenchmark(!showBenchmark)}
                className={`
                    flex items-center space-x-3 px-5 py-2.5 rounded-xl transition-all duration-200 font-semibold
                    ${showBenchmark
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-md shadow-cyan-500/5'
                        : 'bg-slate-100 border border-slate-200 opacity-50 hover:opacity-70 text-slate-500'
                    }
                `}
            >
                <div className="w-4 h-4 rounded-full bg-cyan-500" />
                <span className="text-sm">S&P 500</span>
            </button>
        </div>
    );

    return (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-slate-900 text-2xl font-bold mb-1 flex items-center space-x-2">
                        <span>Performance</span>
                    </h3>
                    <div className="flex space-x-2 mt-2">
                        <button
                            onClick={() => onTimeRangeChange('1d')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === '1d'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            1D
                        </button>
                        <button
                            onClick={() => onTimeRangeChange('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            Max
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div
                        className="px-6 py-3 rounded-xl font-bold text-lg shadow-sm border"
                        style={{
                            backgroundColor: `${portfolioColor}10`,
                            borderColor: `${portfolioColor}20`,
                            color: portfolioColor
                        }}
                    >
                        {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{latestChange.toFixed(2)}%
                    </div>
                </div>
            </div>

            <CustomLegend />

            <div className="h-[400px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                vertical={false}
                                opacity={0.5}
                            />
                            {/* Zero line for reference */}
                            <ReferenceLine
                                y={0}
                                stroke="#94a3b8"
                                strokeDasharray="2 2"
                                strokeWidth={2}
                                opacity={0.5}
                                label={{ value: '0%', fill: '#94a3b8', fontSize: 12 }}
                            />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                minTickGap={30}
                                tick={{ fill: '#64748b' }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                tickFormatter={(value) => `${value}%`}
                                domain={['auto', 'auto']}
                                tick={{ fill: '#64748b' }}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {showPortfolio && (
                                <Line
                                    type="monotone"
                                    dataKey="portfolio"
                                    name="Portfolio"
                                    stroke={portfolioColor}
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{
                                        r: 6,
                                        fill: portfolioColor,
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                    }}
                                    animationDuration={1000}
                                    animationEasing="ease-in-out"
                                />
                            )}

                            {showBenchmark && (
                                <Line
                                    type="monotone"
                                    dataKey="benchmark"
                                    name="S&P 500"
                                    stroke={benchmarkColor}
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: benchmarkColor,
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                    }}
                                    animationDuration={1000}
                                    animationEasing="ease-in-out"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg
                                    className="w-10 h-10 text-slate-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                                    />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base font-medium">No performance data available yet</p>
                            <p className="text-slate-400 text-sm mt-2">Add assets to start tracking</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceChart;
