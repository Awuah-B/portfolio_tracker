#!/bin/bash
# Run database migration first
echo "Running database migration..."
python3 -m backend.app.models.database

# Start the uvicorn server
echo "Starting uvicorn server..."
exec python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
