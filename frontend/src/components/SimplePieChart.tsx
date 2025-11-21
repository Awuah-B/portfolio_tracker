import React from 'react';

interface PieChartDataItem {
  name: string;
  value: number;
  type: string;
}

interface SimplePieChartProps {
  data: PieChartDataItem[];
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-center text-slate-500 py-10">No data to chart</div>;

  // Calculate Conic Gradient
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
  
  interface Segment {
    segment: string;
    color: string;
    name: string;
    value: number;
    type: string;
    percentage: number;
  }

  const segments = data.reduce((acc: { segments: Segment[]; currentAngle: number }, item, i) => {
    const percentage = (item.value / total) * 100;
    const degrees = (percentage / 100) * 360;
    const startAngle = acc.currentAngle;
    const endAngle = acc.currentAngle + degrees;
    const segment = `${colors[i % colors.length]} ${startAngle}deg ${endAngle}deg`;
    
    acc.segments.push({ segment, color: colors[i % colors.length], ...item, percentage });
    acc.currentAngle += degrees;
    
    return acc;
  }, { segments: [], currentAngle: 0 }).segments;

  const gradient = `conic-gradient(${segments.map(s => s.segment).join(', ')})`;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="relative w-48 h-48 rounded-full shadow-lg" style={{ background: gradient }}>
        <div className="absolute inset-0 m-auto w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center">
          <span className="text-slate-400 text-xs font-medium">Allocation</span>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2">
        {segments.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
              <span className="text-slate-300">{item.name}</span>
            </div>
            <span className="text-slate-500">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimplePieChart;
