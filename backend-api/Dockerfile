# Build context is the repository root so the shared/ types package
# (referenced via the @shared/* path alias) is reachable.
FROM node:20-alpine AS builder
WORKDIR /app/backend-api
COPY backend-api/package*.json ./
RUN npm install
COPY shared /app/shared
COPY backend-api /app/backend-api
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/backend-api
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY backend-api/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/backend-api/dist ./dist
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "dist/main"]
