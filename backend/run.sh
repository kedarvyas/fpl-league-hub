#!/bin/bash
export PYTHONPATH="${PYTHONPATH}:./app"
cd backend
uvicorn app.main:app --host 0.0.0.0 --port $PORT