FROM debian:bookworm-slim

# Install dependencies
RUN apt-get update && \
    apt-get install build-essential gdb lcov pkg-config \
      libbz2-dev libffi-dev libgdbm-dev libgdbm-compat-dev liblzma-dev \
      libncurses5-dev libreadline6-dev libsqlite3-dev libssl-dev \
      lzma lzma-dev tk-dev uuid-dev zlib1g-dev libzstd-dev \
      inetutils-inetd curl git nginx -y 

# Install pyenv and Python 3.12.0
ENV PYENV_ROOT="/root/.pyenv"
ENV PATH="$PYENV_ROOT/bin:$PATH"

RUN curl -fsSL https://pyenv.run | bash && \
        eval "$(pyenv init -)" && \
        pyenv install 3.12.0 && \
        pyenv global 3.12.0 && \
        python -m pip install --no-cache-dir requests python-dotenv gitpython watchdog dotenv

WORKDIR /app

COPY ./backend/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN eval "$(pyenv init -)" && \
    pyenv global 3.12.0 && \
    python -m pip install --no-cache-dir -r requirements.txt


COPY ./backend/ /app/

# 
COPY ./challengeserver/server.conf /etc/nginx/nginx.conf
COPY ./challengeserver/default.conf /etc/nginx/conf.d/default.conf
COPY .docker/backend-entrypoint.sh /entrypoint.sh

RUN mkdir -p /etc/nginx/challenges
RUN chmod +x /entrypoint.sh && chmod 777 /var/log/certbuddy && chmod 777 /var/www/http_challenges && chmod 777 /etc/nginx/conf.d
RUN useradd --system --no-create-home --shell /bin/false nginx

EXPOSE 3000 8080
STOPSIGNAL SIGQUIT
ENTRYPOINT [ "/entrypoint.sh" ]