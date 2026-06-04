# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Leverage Docker cache layers for dependencies
COPY slipzmarket-frontend/package*.json ./
RUN npm ci

COPY slipzmarket-frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend
# ==========================================
FROM node:20-slim AS backend-build
WORKDIR /app/api

COPY slipzmarket-api/package*.json ./
RUN npm ci

COPY slipzmarket-api/ ./

RUN rm -rf src/generated/client && \
    DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

# Compile TypeScript into the /dist directory
RUN npm run build 

# Prune development dependencies to keep the production image light
RUN npm prune --production

# ==========================================
# Stage 3: Final Production Image
# ==========================================
FROM node:20-slim
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy built frontend assets to Nginx html directory
COPY --from=frontend-build /app/frontend/dist /var/www/html

# 2. Copy compiled backend code and production dependencies
COPY --from=backend-build /app/api/dist ./api/dist
COPY --from=backend-build /app/api/package*.json ./api/
COPY --from=backend-build /app/api/node_modules ./api/node_modules

# 3. CRITICAL: Copy the custom generated database client folder 
# because your code explicitly looks for it in relative paths
COPY --from=backend-build /app/api/generated ./api/generated

# Setup Nginx configuration
COPY ./nginx.conf /etc/nginx/sites-available/default

EXPOSE 80

# Clean execution: Start Nginx as a background daemon, then pass process control to Node
CMD service nginx start && node api/dist/index.js