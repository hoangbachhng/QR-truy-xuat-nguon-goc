# Chạy website trên server riêng của Vinaseed (hoặc bất kỳ máy chủ nào có Docker)
# Build:  docker build -t vinaseed-mo-hinh .
# Chạy kèm PostgreSQL: docker compose up -d   (xem docker-compose.yml)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/data/uploads \
    PGLITE_DIR=/app/data/pglite
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data
USER app
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
