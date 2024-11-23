#!/bin/bash

# Print debug information
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "Python path: $PYTHONPATH"

# Export the Python path
export PYTHONPATH="${PYTHONPATH}:${PWD}"

# Start Gunicorn with our config
exec gunicorn -c gunicorn_config.py app.main:app