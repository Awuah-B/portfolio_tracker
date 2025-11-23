export type Portfolio = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Holding = {
  id: string;
  portfolio_id: string;
  ticker: string;
  starting_price: number;
  purchase_date: string;
  asset_type: string;
  last_updated: string;
  current_price: number;
  // These are calculated fields, not directly from DB
  percentage_change: number;
  // Optional: market data for display
  market?: { name: string; price: number; type: string };
};
