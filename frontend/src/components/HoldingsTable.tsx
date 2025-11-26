import type { Holding } from '../types/Portfolio';
import { Trash2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface Props {
  holdings: Holding[];
  onRefresh?: () => void;
}

const HoldingsTable = ({ holdings, onRefresh }: Props) => {
  const { isAdmin } = useAdmin();

  const handleDelete = async (holdingId: string) => {
    if (!window.confirm("Are you sure you want to delete this holding?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/holdings/${holdingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete holding:", err);
      alert("Failed to delete holding");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Asset</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Initial Value</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Current Value</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Return</th>
              {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holdings.map((holding) => {
              const currentValue = holding.starting_price * (1 + holding.percentage_change / 100);
              const totalReturn = currentValue - holding.starting_price;
              const isPositive = holding.percentage_change >= 0;

              return (
                <tr
                  key={holding.id}
                  className="group hover:bg-slate-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center mr-4 border border-slate-200 group-hover:border-slate-300 transition-colors">
                        <span className="text-xs font-bold text-slate-600">{holding.ticker.substring(0, 2)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{holding.ticker}</div>
                        <div className="text-xs text-slate-500 capitalize font-medium">{holding.asset_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-slate-900">
                      ${holding.starting_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-slate-900">
                      ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end space-y-1">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                        {isPositive ? '+' : ''}{holding.percentage_change.toFixed(2)}%
                      </div>
                      <div className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(holding.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {holdings.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <span className="text-2xl">💼</span>
                    </div>
                    <p className="font-medium">No holdings yet</p>
                    <p className="text-sm text-slate-400 mt-1">Add your first asset to start tracking</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;
