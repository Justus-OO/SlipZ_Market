# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY slipzmarket-frontend/package*.json ./
RUN npm install
COPY slipzmarket-frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-slim AS backend-build
WORKDIR /app/api
COPY slipzmarket-api/package*.json ./
RUN npm install
COPY slipzmarket-api/ ./
RUN npm run build 

# Stage 3: Final Production Image
FROM node:20-slim
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /var/www/html
# Copy built backend
COPY --from=backend-build /app/api/dist ./api
COPY --from=backend-build /app/api/package*.json ./api/
# IMPORTANT: Copy production dependencies
COPY --from=backend-build /app/api/node_modules ./api/node_modules

# Setup Nginx
COPY ./nginx.conf /etc/nginx/sites-available/default

EXPOSE 80
# Use a simple shell script to start both
CMD service nginx start && node api/index.js