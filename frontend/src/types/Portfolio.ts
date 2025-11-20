export type Holding = {
  ticker: string;
  position_value: number;
  cost_basis: number;
  unrealised_gain: number;
};

type Portfolio = {
  portfolio_id: string;
  total_value: number;
  total_cost_basis: number;
  total_unrealised_gain: number;
  holdings: Holding[];
};

export default Portfolio;