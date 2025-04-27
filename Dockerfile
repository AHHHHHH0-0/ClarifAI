# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ .
RUN yarn build

# Stage 2: Build Python Backend and bundle frontend
FROM python:3.12-slim
# set workdir
WORKDIR /app

# install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# copy Python code
COPY backend/src ./backend/src
COPY backend/src/main.py ./backend/src/main.py

# copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# expose app port
EXPOSE 8000

# start app
CMD ["uvicorn", "backend.src.main:app", "--host", "0.0.0.0", "--port", "8000"] 