# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN rm -f tsconfig.build.tsbuildinfo && \
    rm -rf dist && \
    npx tsc -p tsconfig.build.json

# ------------------------------

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# --- FIX QUAN TRỌNG NHẤT: ÉP DÙNG IPV4 ---
# Thêm dòng này để chặn đứng lỗi ENETUNREACH IPv6
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
# -----------------------------------------

# Copy built application
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
