# --- GIAI ĐOẠN 1: BUILD ---
# Đổi từ alpine sang slim (Debian)
FROM node:20-slim AS builder

WORKDIR /app

# Copy file cài đặt
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ code
COPY . .

# Build code (NestJS)
RUN rm -f tsconfig.build.tsbuildinfo && \
    rm -rf dist && \
    npx tsc -p tsconfig.build.json

# --- GIAI ĐOẠN 2: CHẠY (PRODUCTION) ---
FROM node:20-slim

WORKDIR /app

# Cài đặt dumb-init (Dùng apt-get thay vì apk)
RUN apt-get update && apt-get install -y dumb-init

# GIỮ NGUYÊN LỆNH NÀY: Ép buộc dùng IPv4
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Copy code đã build từ giai đoạn 1
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Cài dependencies (chỉ production)
RUN npm install --omit=dev

# Tạo user để chạy cho an toàn
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

# Mở cổng 3000
EXPOSE 3000

# Chạy lệnh khởi động
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
