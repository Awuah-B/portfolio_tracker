import requests
import os

BASE_URL = "http://localhost:8000/api"
ADMIN_PASSWORD = "admin" # Default from .env setup

def test_auth():
    print("Testing Authentication...")
    
    # 1. Login
    print("1. Logging in...")
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    print("Login successful. Token received.")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Portfolio (Protected)
    print("2. Creating Portfolio (Protected)...")
    response = requests.post(f"{BASE_URL}/portfolios", json={"name": "Test Portfolio"}, headers=headers)
    if response.status_code != 201:
        print(f"Create Portfolio failed: {response.text}")
        return
    
    portfolio = response.json()
    portfolio_id = portfolio["id"]
    print(f"Portfolio created: {portfolio_id}")

    # 3. Add Holding (Protected)
    print("3. Adding Holding (Protected)...")
    holding_data = {
        "ticker": "AAPL",
        "starting_price": 150.0,
        "purchase_date": "2023-01-01T00:00:00",
        "asset_type": "stock"
    }
    response = requests.post(f"{BASE_URL}/portfolios/{portfolio_id}/holdings", json=holding_data, headers=headers)
    if response.status_code != 201:
        print(f"Add Holding failed: {response.text}")
    else:
        print("Holding added successfully.")

    # 4. Delete Portfolio (Protected)
    print("4. Deleting Portfolio (Protected)...")
    response = requests.delete(f"{BASE_URL}/portfolios/{portfolio_id}", headers=headers)
    if response.status_code != 204:
        print(f"Delete Portfolio failed: {response.text}")
    else:
        print("Portfolio deleted successfully.")

    # 5. Test Unauthorized Access
    print("5. Testing Unauthorized Access...")
    response = requests.post(f"{BASE_URL}/portfolios", json={"name": "Unauthorized Portfolio"})
    if response.status_code == 401:
        print("Unauthorized access correctly blocked.")
    else:
        print(f"Unauthorized access NOT blocked. Status: {response.status_code}")

if __name__ == "__main__":
    test_auth()
