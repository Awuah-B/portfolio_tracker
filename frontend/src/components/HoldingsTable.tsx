import type { Holding } from '../types/Portfolio';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  holdings: Holding[];
}

const HoldingsTable = ({ holdings }: Props) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-700/50 text-slate-400 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Asset</th>
              <th className="p-4 font-semibold text-right">Initial Investment</th>
              <th className="p-4 font-semibold text-right">Current Value</th>
              <th className="p-4 font-semibold text-right">Percentage Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No holdings found.
                </td>
              </tr>
            ) : (
              holdings.map((holding) => {
                const currentValue = holding.initial_investment * (1 + holding.percentage_change / 100);
                const isPositiveChange = holding.percentage_change >= 0;
                return (
                  <tr key={holding.ticker} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {/* Placeholder for asset icon/initial */}
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                          {holding.ticker[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white">{holding.ticker}</div>
                          {/* <div className="text-xs text-slate-500">{holding.name}</div> // Assuming name might come from market data */}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      ${holding.initial_investment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`flex items-center justify-end font-medium ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositiveChange ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {holding.percentage_change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;
