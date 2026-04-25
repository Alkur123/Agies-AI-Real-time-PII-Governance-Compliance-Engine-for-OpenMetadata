FROM python:3.10-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (separate layer for cache reuse)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check — waits 60s for model load, then checks every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Gunicorn with Uvicorn workers for production
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "server:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
