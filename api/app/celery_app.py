from celery import Celery

from app.config import settings

celery_app = Celery(
    "movie_reservation",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Task modules get added here on Day 6 (e.g. app.tasks.notifications, app.tasks.locks)
celery_app.autodiscover_tasks(["app"])
