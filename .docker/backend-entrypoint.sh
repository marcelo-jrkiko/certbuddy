#!/bin/bash
set -e 
eval "$(pyenv init -)"

python app.py &
nginx -g "daemon off;"
