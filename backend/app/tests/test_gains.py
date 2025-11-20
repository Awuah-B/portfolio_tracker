import pytest

from app.services.portfolio import compute_unrealised_gain, compute_portfolio_summary


def test_compute_unrealised_gain_positive():
    res = compute_unrealised_gain(10, 100.0, 150.0)
    assert res["position_value"] == pytest.approx(1500.0)
    assert res["cost_basis"] == pytest.approx(1000.0)
    assert res["unrealised_gain"] == pytest.approx(500.0)


def test_compute_unrealised_gain_negative():
    res = compute_unrealised_gain(5, 50.0, 40.0)
    assert res["position_value"] == pytest.approx(200.0)
    assert res["cost_basis"] == pytest.approx(250.0)
    assert res["unrealised_gain"] == pytest.approx(-50.0)


def test_compute_portfolio_summary_multiple_holdings():
    holdings = [
        {"ticker": "A", "quantity": 2, "avg_cost": 10.0, "current_price": 15.0},
        {"ticker": "B", "quantity": 3, "avg_cost": 20.0, "current_price": 18.0},
    ]

    summary = compute_portfolio_summary(holdings)

    # A: value=30 cost=20 unrealised=10
    # B: value=54 cost=60 unrealised=-6
    assert summary["total_value"] == pytest.approx(84.0)
    assert summary["total_cost_basis"] == pytest.approx(80.0)
    assert summary["total_unrealised_gain"] == pytest.approx(4.0)
