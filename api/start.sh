#!/bin/bash
# Start Celery worker in the background
celery -A app.celery_app worker --loglevel=info &
# Start Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
