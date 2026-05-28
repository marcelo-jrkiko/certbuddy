# Environment Configuration Guide

This document explains all environment variables used by CertBuddy for configuration.

## Directus Backend Configuration

### `DIRECTUS_URL`
- **Type**: String (URL)
- **Default**: `http://localhost:8055`
- **Description**: The URL of your Directus instance that serves as the central data repository for CertBuddy
- **Example**: `http://directus.example.com:8055` or `https://directus.yourdomain.com`

### `ENGINE_MASTER_TOKEN`
- **Type**: String (secret token)
- **Default**: None (required)
- **Description**: Master authentication token for the backend to communicate with Directus API. This token must have sufficient permissions to manage collections, users, and certificate records
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Security**: Keep this token secure and never commit it to version control. Use `.env` file or secrets management

### `ENGINE_DISABLE_SSL_VERIFY`
- **Type**: Boolean (`True` or `False`)
- **Default**: `False`
- **Description**: Disable TLS/SSL certificate verification for backend requests to Directus. Intended for local development and self-signed certificates.
- **Example**: `True` (disable verification), `False` (keep verification enabled)
- **Warning**: Do not enable in production environments

## Engine API Configuration

### `ENGINE_API_PORT`
- **Type**: Integer
- **Default**: `3000`
- **Description**: Port on which the Python Flask backend engine API server listens
- **Example**: `3000`, `8080`, `5000`

### `DEBUG`
- **Type**: Boolean (`True` or `False`)
- **Default**: `False`
- **Description**: Enable debug mode for the Flask application. Provides detailed logging and development features
- **Example**: `True` (for development), `False` (for production)
- **Warning**: Do not enable in production environments

## Certificate Renewal Configuration

### `ENGINE_RENEWAL_CHECK_INTERVAL`
- **Type**: Integer (hours)
- **Default**: `24`
- **Description**: How frequently (in hours) the renewal task checks for certificates that need renewal
- **Example**: `24`, `12`, `6`
- **Note**: Shorter intervals increase system load but catch expiring certificates faster

### `ENGINE_RENEWAL_BEFORE_EXPIRE_HOURS`
- **Type**: Integer (hours)
- **Default**: `24`
- **Description**: Number of hours before certificate expiration to trigger automatic renewal
- **Example**: `24` (renew 24 hours before expiration), `72` (renew 3 days before expiration)
- **Recommendation**: Set to at least 24 hours to ensure sufficient time for renewal process

## Certificate Auto Cleanup Configuration

### `ENGINE_AUTO_CLEANUP_ENABLED`
- **Type**: Boolean (`True` or `False`)
- **Default**: `False`
- **Description**: Enable automatic cleanup of old/expired certificate requests
- **Example**: `True`, `False`

### `ENGINE_AUTO_CLEANUP_INTERVAL`
- **Type**: Integer (hours)
- **Default**: `4`
- **Description**: How frequently (in hours) the cleanup task runs
- **Example**: `4`, `12`, `24`
- **Note**: Only used if `ENGINE_AUTO_CLEANUP_ENABLED` is `True`

### `ENGINE_AUTO_CLEANUP_BEFORE_EXPIRE_DAYS`
- **Type**: Integer (days)
- **Default**: `120`
- **Description**: Delete certificate requests older than this many days after expiration
- **Example**: `120`, `90`, `180`
- **Note**: Certificates are only deleted if they are no longer active

## Configuration File Location

Environment variables are loaded from the `.env` file located in the root of the project:

```
.env
```

### Example `.env` File

```bash
# Directus Configuration
DIRECTUS_URL=http://localhost:8055
ENGINE_MASTER_TOKEN=your-secret-token-here
ENGINE_DISABLE_SSL_VERIFY=False

# Engine API Configuration
ENGINE_API_PORT=3000
DEBUG=False

# Certificate Renewal Configuration
ENGINE_RENEWAL_CHECK_INTERVAL=24
ENGINE_RENEWAL_BEFORE_EXPIRE_HOURS=24

# Certificate Auto Cleanup Configuration
ENGINE_AUTO_CLEANUP_ENABLED=False
ENGINE_AUTO_CLEANUP_INTERVAL=4
ENGINE_AUTO_CLEANUP_BEFORE_EXPIRE_DAYS=120
```

## Loading Environment Variables

CertBuddy uses Python's `python-dotenv` library to load environment variables from the `.env` file. The loading happens automatically during application startup via the `backend/startup.py` module.

### Load Precedence
1. Environment variables set in the system/shell
2. Variables from the `.env` file
3. Default values defined in the code

## Docker Deployment

When running CertBuddy with Docker Compose, environment variables can be passed through:

1. **Environment file**: Create a `.env` file in the project root
2. **Direct environment**: Use `-e` flag with `docker run`
3. **Compose file**: Define environment variables directly in `docker-compose.yml`

### Example Docker Environment

```yaml
environment:
  - DIRECTUS_URL=http://directus:8055
  - ENGINE_MASTER_TOKEN=${ENGINE_MASTER_TOKEN}
  - ENGINE_API_PORT=3000
  - DEBUG=False
```

## Best Practices

1. **Never commit `.env` file to version control** - Add it to `.gitignore`
2. **Use strong, unique tokens** for `ENGINE_MASTER_TOKEN`
3. **Test environment variables** before deployment
4. **Document custom configurations** in your deployment guide
5. **Use appropriate values** for renewal intervals based on your infrastructure
6. **Monitor logs** for configuration issues during startup
