import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  isCurrency?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, trend, isCurrency = true }) => (
  <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <div className="text-2xl font-bold text-white mb-2">
      {isCurrency ? '$' : ''}{value}
    </div>
    {subValue && (
      <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
        {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
        {subValue}
      </div>
    )}
  </div>
);

export default MetricCard;
