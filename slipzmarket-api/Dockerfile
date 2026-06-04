# /slipzmarket-api/Dockerfile

FROM node:20-slim
WORKDIR /app

# Copy package files from the current folder (slipzmarket-api)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build your TypeScript/Node app
RUN npm run build 

EXPOSE 5000
CMD ["npm", "start"]