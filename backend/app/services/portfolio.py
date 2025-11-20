from typing import List, Dict


def compute_unrealised_gain(quantity: float, avg_cost: float, current_price: float) -> Dict[str, float]:
    """Compute position value, cost basis and unrealised gain for a holding.

    Args:
        quantity: number of shares/units held
        avg_cost: average cost per unit
        current_price: current market price per unit

    Returns:
        Dict with keys: position_value, cost_basis, unrealised_gain
    """
    quantity = float(quantity)
    avg_cost = float(avg_cost)
    current_price = float(current_price)

    position_value = quantity * current_price
    cost_basis = quantity * avg_cost
    unrealised_gain = position_value - cost_basis

    return {
        "position_value": position_value,
        "cost_basis": cost_basis,
        "unrealised_gain": unrealised_gain,
    }


def compute_portfolio_summary(holdings: List[Dict]) -> Dict:
    """Aggregate multiple holdings into a portfolio summary.

    Each holding dict should contain: quantity, avg_cost, current_price, ticker (optional).
    """
    total_value = 0.0
    total_cost = 0.0
    details = []

    for h in holdings:
        q = float(h.get("quantity", 0))
        avg = float(h.get("avg_cost", 0))
        price = float(h.get("current_price", 0))
        res = compute_unrealised_gain(q, avg, price)
        total_value += res["position_value"]
        total_cost += res["cost_basis"]
        details.append({
            "ticker": h.get("ticker"),
            **res,
        })

    return {
        "total_value": total_value,
        "total_cost_basis": total_cost,
        "total_unrealised_gain": total_value - total_cost,
        "holdings": details,
    }
