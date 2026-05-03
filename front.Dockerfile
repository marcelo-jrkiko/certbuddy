
# Stage 1 - Build the application
FROM node:24 AS builder
WORKDIR /app

COPY --exclude=backend . . 

RUN rm -rf node_modules && \
    rm -rf dist && \
    rm -rf package-lock.json && \
    npm install && \
    npm run build

# Stage 2 - Run API and serve the application with Apache proxy
FROM node:24
RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

# Enable Apache modules for proxy
RUN a2enmod proxy && \
    a2enmod proxy_http && \
    a2enmod rewrite

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist/ /var/www/html/

# Copy server files and package.json for API
COPY server/ /app/server/
COPY package.json package-lock.json ./

# Install dependencies for API
RUN npm ci --production

# Copy startup script and Apache configuration
COPY docker/start.sh /app/start.sh
COPY docker/app.conf /etc/apache2/sites-enabled/000-default.conf
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]


