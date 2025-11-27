"""
Test script to demonstrate buy/sell trade return calculation logic
"""

class TradeType:
    BUY = "buy"
    SELL = "sell"

def calculate_percentage_change(initial_price, current_price, trade_type):
    """
    Calculate percentage change for a holding.
    
    For BUY trades: Normal calculation (current - initial) / initial * 100
    For SELL trades: Inverted calculation -(current - initial) / initial * 100
    """
    if initial_price == 0:
        return 0.0
    
    # Calculate base percentage change
    percentage_change = ((current_price - initial_price) / initial_price) * 100
    
    # For SELL trades, invert the percentage change
    # If asset price goes up, sell position loses (negative return)
    # If asset price goes down, sell position gains (positive return)
    if trade_type == TradeType.SELL:
        percentage_change = -percentage_change
    
    return percentage_change

# Test scenarios
print("=" * 60)
print("BUY TRADE RETURNS CALCULATION")
print("=" * 60)

# Scenario 1: BUY trade, asset goes up
initial = 100
current = 110
pct_change = calculate_percentage_change(initial, current, TradeType.BUY)
print(f"\nScenario 1: BUY trade")
print(f"  Initial price: ${initial}")
print(f"  Current price: ${current}")
print(f"  Return: {pct_change:.2f}% ✓ (Asset up 10%, profit)")

# Scenario 2: BUY trade, asset goes down
current = 90
pct_change = calculate_percentage_change(initial, current, TradeType.BUY)
print(f"\nScenario 2: BUY trade")
print(f"  Initial price: ${initial}")
print(f"  Current price: ${current}")
print(f"  Return: {pct_change:.2f}% ✓ (Asset down 10%, loss)")

print("\n" + "=" * 60)
print("SELL TRADE RETURNS CALCULATION")
print("=" * 60)

# Scenario 3: SELL trade, asset goes up
current = 110
pct_change = calculate_percentage_change(initial, current, TradeType.SELL)
print(f"\nScenario 3: SELL trade")
print(f"  Initial price: ${initial}")
print(f"  Current price: ${current}")
print(f"  Return: {pct_change:.2f}% ✓ (Asset up 10%, loss/opportunity cost)")

# Scenario 4: SELL trade, asset goes down
current = 90
pct_change = calculate_percentage_change(initial, current, TradeType.SELL)
print(f"\nScenario 4: SELL trade")
print(f"  Initial price: ${initial}")
print(f"  Current price: ${current}")
print(f"  Return: {pct_change:.2f}% ✓ (Asset down 10%, profit)")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("""
BUY trades: Track normally - profit when asset rises, loss when it falls
SELL trades: Track inversely - loss when asset rises, profit when it falls

This reflects the real-world behavior:
- Buying low and selling high = profit
- Selling high and buying back low = profit
""")
