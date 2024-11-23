#!/bin/bash
set -e  # Exit on any error
set -x  # Print commands being executed

# Debug information
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"
echo "PYTHONPATH: $PYTHONPATH"

# Set up Python path
export PYTHONPATH="${PYTHONPATH}:${PWD}"

# Try to import the app module to debug any import issues
python -c "
import sys
print('Python path:', sys.path)
try:
    from app.main import app
    print('Successfully imported app')
except Exception as e:
    print('Error importing app:', str(e), file=sys.stderr)
    raise
"

# Start the server
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level debug