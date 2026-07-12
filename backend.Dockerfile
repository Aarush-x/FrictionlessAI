# =========================================================
# Stage 1: Build & Run Environment
# =========================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

# Install system dependencies needed for Pillow (image analysis) and building
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy backend source code
COPY app.py .

# Create a non-privileged user to run the app (CSO security best practice)
RUN useradd -u 8888 appuser && chown -R appuser:appuser /app
USER appuser

# Expose backend port
EXPOSE 5000

# Run Flask backend with Gunicorn in production, dynamically binding to the environment PORT
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 4 --threads 2 --timeout 120 app:app"]
