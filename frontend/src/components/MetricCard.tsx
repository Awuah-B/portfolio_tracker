// src/components/MetricCard.tsx
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend: 'up' | 'down' | 'neutral';
  isCurrency?: boolean;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  trend,
  isCurrency = false,
  delay = 0,
}) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const [isVisible, setIsVisible] = useState(false);

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 bg-white/70 border border-white/30 backdrop-blur-md shadow-sm glass transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } hover:shadow-md hover:border-slate-300`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="relative z-10">
        {/* Header */}
        {title && (
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">
              {title}
            </h3>
            {trend !== 'neutral' ? (
              <div
                className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-300 ${isPositive
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                )}
                {isPositive ? 'Up' : 'Down'}
              </div>
            ) : (
              <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                <Minus className="w-3.5 h-3.5 mr-1" />
                Neutral
              </div>
            )}
          </div>
        )}
        {/* Value */}
        <div className="flex items-baseline space-x-2 mb-2">
          <span
            className={`text-3xl font-bold tracking-tight ${trend === 'neutral'
                ? 'text-slate-900'
                : isPositive
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
          >
            {isCurrency && !value.includes('$') ? '$' : ''}{value}
          </span>
        </div>
        {/* Sub Value */}
        {subValue && (
          <p className="text-slate-500 text-xs font-medium tracking-wide">{subValue}</p>
        )}
        {/* Animated bottom border */}
        <div
          className={`absolute bottom-0 left-0 h-1 rounded-full transition-all duration-700 ease-out ${isVisible ? 'w-full' : 'w-0'
            } ${isPositive
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
              : isNegative
                ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                : 'bg-gradient-to-r from-slate-600 to-slate-500'
            }`}
        />
      </div>
    </div>
  );
};

export default MetricCard;
