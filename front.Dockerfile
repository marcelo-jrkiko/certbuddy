
# Stage 1 - Build
FROM node:24 AS builder
WORKDIR /app

COPY --exclude=backend/ . .

RUN npm install && \
    npm run build

# Stage 2 - Runtime
FROM node:24
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 80

ENV PORT=80
CMD ["node", "dist/server/index.js"]

