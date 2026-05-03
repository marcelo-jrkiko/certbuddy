FROM debian:bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y curl build-essential libssl-dev zlib1 

# Install pyenv
RUN curl -fsSL https://pyenv.run | bash 

# Add pyenv to the PATH and initialize it
ENV PYENV_ROOT="/root/.pyenv"
ENV PATH="$PYENV_ROOT/bin:$PATH"

RUN eval "$(pyenv init -)" && \
        pyenv install 3.12.0 && \
        pyenv global 3.12.0 && \
        eval "$(pyenv init -)" && \
        python -m pip install --no-cache-dir requests python-dotenv gitpython watchdog dotenv

WORKDIR /app
COPY ./backend/ /app/

# Install Python dependencies
RUN eval "$(pyenv init -)" && \
    pyenv global 3.12.0 && \
    python -m pip install --no-cache-dir -r requirements.txt

EXPOSE 3000
CMD ["python", "app.py"]