import Portfolio from '../types/Portfolio.ts';

interface Props {
  portfolio: Portfolio;
}

const PortfolioSummary = ({ portfolio }: Props) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-gray-500">Total Value</p>
          <p className="text-2xl font-semibold">${portfolio.total_value.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Cost Basis</p>
          <p className="text-2xl font-semibold">${portfolio.total_cost_basis.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Unrealised Gain</p>
          <p className={`text-2xl font-semibold ${portfolio.total_unrealised_gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${portfolio.total_unrealised_gain.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;
