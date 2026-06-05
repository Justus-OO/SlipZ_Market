# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Set a default value so the build doesn't fail if the arg is missing
ARG VITE_API_URL=https://slipz-market-2.onrender.com/api
ENV VITE_API_URL=$VITE_API_URL

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
COPY --from=backend-build /app/api/src/generated /app/api/dist/generated

# 3. Setup Nginx configuration and ensure it is activated
COPY ./nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

EXPOSE 80

# 4. Clean execution: Explicitly use shell array syntax to prevent Status 128 crashes
CMD ["/bin/sh", "-c", "service nginx start && PORT=5000 node api/dist/index.js"]