# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Stage 2: Build Python Backend
FROM python:3.12-slim
# Set environment variables
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/src ./backend/src
COPY backend/src/main.py ./backend/src/main.py

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Expose port
EXPOSE 8000

# Start the FastAPI app
CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"] 