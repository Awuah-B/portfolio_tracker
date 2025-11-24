# Portfolio Tracker

A full-stack portfolio management application with real-time WebSocket updates, performance charts, and admin controls.

## Features

- 📊 **Real-time Portfolio Tracking** - Live price updates via WebSocket
- 📈 **Performance Charts** - Historical and intraday (5-min) performance tracking with S&P 500 benchmark
- 🔒 **Public & Admin Views** - Read-only public dashboard + protected admin area
- 💼 **Multi-Portfolio Support** - Track multiple portfolios simultaneously
- 🎨 **Premium UI** - Glassmorphism design with light/dark theme support
- ⚡ **Auto-refresh** - Data polling with intelligent caching

## Tech Stack

**Frontend:** React + TypeScript + Vite + TailwindCSS + Recharts + WebSocket  
**Backend:** FastAPI + SQLAlchemy + PostgreSQL + yfinance + WebSocket

## Quick Start

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install && npm run dev
```

Access: http://localhost:5173/

## Deployment

See [Railway Deployment Guide](/.gemini/antigravity/brain/824d6c02-dfc8-4364-b807-c8b54a54bf2d/railway_deployment_guide.md) for complete instructions.

**Environment:** See `ENV_TEMPLATE.md` for required variables.

## License
MIT
