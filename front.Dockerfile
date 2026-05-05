
FROM node:24 

RUN apt-get update && apt-get install -y apache2 && rm -rf /var/lib/apt/lists/*

# Enable Apache modules for proxy
RUN a2enmod proxy && \
    a2enmod proxy_http && \
    a2enmod rewrite && \
    a2enmod headers

WORKDIR /app
COPY . /app/

RUN rm -rf node_modules && \
    rm -rf dist && \
    rm -rf package-lock.json && \
    npm install && \
    npm run build

# Copy built frontend
RUN cp -r /app/dist/* /var/www/html/

# Copy startup script and Apache configuration
COPY .docker/front-entrypoint.sh /entrypoint.sh
COPY .docker/app.conf /etc/apache2/sites-enabled/000-default.conf
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD [ "/entrypoint.sh" ]

