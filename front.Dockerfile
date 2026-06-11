# ---------- Build stage ----------
FROM node:24 AS builder
WORKDIR /app

COPY package.json  ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:24 AS runtime
WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --production 

# Copy built app and all necessary files for TanStack React Start
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/wrangler.jsonc ./

RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

# Suppress Apache FQDN warning inside container
RUN echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf && a2enconf servername

# Enable Apache modules for proxy
RUN a2enmod proxy && \
    a2enmod proxy_http && \
    a2enmod rewrite && \
    a2enmod headers

COPY .docker/app.conf /etc/apache2/sites-enabled/000-default.conf

COPY .docker/front-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENV PORT=80

ENTRYPOINT [ "/entrypoint.sh" ]

