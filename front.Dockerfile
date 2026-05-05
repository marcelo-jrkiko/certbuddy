
FROM node:24 AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm install && npm run build

FROM node:24
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY .docker/front-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENV PORT=80

ENTRYPOINT [ "/entrypoint.sh" ]

