"""Gunicorn configuration for production deployment."""
import multiprocessing
import os

# Server socket
bind = os.getenv("GUNICORN_BIND", "127.0.0.1:8002")
backlog = 2048

# Worker processes
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count()))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50

# Preload app for copy-on-write memory optimization
preload_app = True

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "app_asturiasMobile"

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Graceful restart
graceful_timeout = 30
