FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE 8080

# Use Gunicorn instead of Flask dev server
CMD ["gunicorn", "--config", "gunicorn_config.py", "webhook_server:app"]
