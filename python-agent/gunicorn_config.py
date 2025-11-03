import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8080')}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1  # Recommended formula
worker_class = "gthread"  # Use threaded workers for async tasks
threads = 4  # 4 threads per worker
worker_connections = 1000
max_requests = 1000  # Restart workers after this many requests
max_requests_jitter = 50
timeout = 120  # Increased for long-running agent connections
keepalive = 5

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "interview-agent"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (not needed with Fly.io proxy)
keyfile = None
certfile = None
