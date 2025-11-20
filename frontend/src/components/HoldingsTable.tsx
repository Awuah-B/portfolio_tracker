import { Holding } from '../types/Portfolio.ts';

interface Props {
  holdings: Holding[];
}

const HoldingsTable = ({ holdings }: Props) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Holdings</h2>
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2">Ticker</th>
            <th className="pb-2">Position Value</th>
            <th className="pb-2">Cost Basis</th>
            <th className="pb-2">Unrealised Gain</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.ticker} className="border-b">
              <td className="py-2">{holding.ticker}</td>
              <td className="py-2">${holding.position_value.toLocaleString()}</td>
              <td className="py-2">${holding.cost_basis.toLocaleString()}</td>
              <td className={`py-2 ${holding.unrealised_gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${holding.unrealised_gain.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HoldingsTable;
