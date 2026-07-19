# CertBuddy

A comprehensive certificate management platform that automates the process of requesting, issuing, and renewing SSL/TLS certificates from multiple Certificate Authorities.

![Certbuddy](./SCREENSHOT.png)

## Project Overview

CertBuddy is a full-stack application designed to simplify SSL/TLS certificate management for multiple domains. It provides an intuitive interface to request certificates from different Certificate Authorities, manage configurations, and automatically handle certificate renewals through scheduled tasks.

The system is built with:
- **Frontend**: React + TypeScript with Vite
- **Backend**: Python Flask API
- **Data Backend**: Directus (headless CMS)
- **Database**: Full high-end database with PostgresSQL 
- **Integration**: Allow Third-party integration with the Engine API
---

## Architecture

### Dashboard

- **Per user management**: Support the certificates storage and configuration management per user.
- **Certificate Management**: Request new certificates, manually upload certificates, activate or deactivated a certificate and manage the certificates.
- **Configuration Management**: Manage Certificate Authority accounts and challenge configurations, support shared configurations that can be merged into a specific configuration. 
- **Dashboard**: Overview of certificate status and system health

**Key Features**:
- Real-time certificate request tracking
- Configuration editor with validation
- Simple frontend to manage certificates with user own scope.

### Engine Backend
A Backend Engine construct in Python that can issue certificates and automatic renew certificates, supporting multi certificate authorities with multi challenge type, user can combine the certificate authority with a specific challenge to issue a certificate.

- **RESTful API**: Endpoints for certificates, configurations, and tasks management.
- **Certificate Issuance**: Orchestrates certificate requests through different CAs with diferrent validation challenges.
- **Task Scheduling**: Automated renewal checks and certificate lifecycle management
- **CORS Enabled**: Supports frontend communication from any origin
- **Swagger Documentation**: Built-in API documentation via Flasgger


### Data Backend (Directus)

Directus serves as the central data repository for CertBuddy, stores the certificates, manages CAs accounts and users.

- **Collections**: Stores certificates, certificate requests, configurations, accounts, and users
- **Authentication**: Master token authentication for backend operations
- **Extensibility**: Flexible schema for custom fields and relationships

---

## Tasks

CertBuddy includes an intelligent task scheduling system for automated certificate management:

### Renewal Task

Automatically renews certificates before they expire.

**Logic**:
- Runs on a configurable schedule
- Searches for active certificates expiring within 24 hours
- Retrieves the original certificate request configuration
- Initiates renewal through the appropriate Certificate Authority
- Updates certificate records with new expiration dates
- Maintains audit trail of all renewal operations
- Handles renewal failures with logging and alerts

**Benefits**:
- Prevents certificate expiration incidents
- Reduces manual monitoring overhead
- Ensures continuous service availability

### Task Scheduler

Manages all scheduled tasks in the system.

**Responsibilities**:
- Initializes configured tasks on startup
- Maintains task execution history
- Handles periodic task execution
- Provides task status monitoring
- Manages task lifecycle (start, stop, reschedule)

---

## Key Features

### Certificate Request Management
- Create new certificate requests with custom domain configurations
- Support for wildcard certificates
- Multi-domain SAN (Subject Alternative Name) support
- Track request status in real-time

### Configuration Management
- Store and manage CA credentials securely
- Configure challenge providers (DNS automation)
- Support for multiple CA accounts
- Flexible key-value configuration storage

### Automated Renewal
- Scheduled certificate renewal checks
- Automatic renewal 24 hours before expiration
- Configurable renewal task intervals
- Detailed renewal operation logs

### Certificate Lifecycle Tracking
- Issue date and expiration tracking
- Active/inactive status management
- Certificate history and audit trail
- Renewal status monitoring

---

## System Requirements

- Python 3.8+ (Backend)
- Node.js/Bun (Frontend)
- Directus instance (Data backend)
- Docker & Docker Compose (for containerized deployment)

## Getting Started

[Documentation](https://certbuddy.kikoretrospace.com.br/)

---

## API Documentation

The backend provides Swagger documentation accessible at `/apidocs` endpoint.

---

## License
Apache 2.0 License

Copyright [2026] [Marcelo F. Andrade Junior (KIKO)]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License