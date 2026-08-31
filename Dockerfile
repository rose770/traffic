# ==============================================================================
# Stage 1: Build Vite / React Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install frontend dependencies
RUN npm ci || npm install

# Copy source code and build assets
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Compile production bundle to /app/dist
RUN npm run build


# ==============================================================================
# Stage 2: Production Python Backend & Spatial Alignment Engine
# ==============================================================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Set production environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0

# Install system libraries for headless OpenCV and geospatial projections
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy compiled frontend from Stage 1 into dist/
COPY --from=frontend-builder /app/dist ./dist

# Copy backend application code
COPY app/ ./app/
COPY main.py .
COPY cad_examples/ ./cad_examples/

# Create non-root user for security compliance
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

# Start FastAPI application via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
