#!/bin/bash
set -e

# Start Apache in foreground
apache2ctl -D FOREGROUND
