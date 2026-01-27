FROM node:20-slim

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (rebuilds better-sqlite3)
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3001

# Run the API (indexer runs separately or together)
CMD ["npm", "start"]
