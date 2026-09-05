# F01 — Project Bootstrap

## Goal

Create the initial project structure and make the entire system start successfully.

## Architecture

```text
React
  |
  v
API Gateway
  |
  +---- Auth Service ---- auth_db
  |
  +---- Listing Service - listing_db
  |
  +---- Chat Service ---- chat_db
```

## Backend

Create:

* API Gateway
* Auth Service
* Listing Service
* Chat Service

Each service must be a separate FastAPI application.

Add a simple health endpoint to every backend service:

```text
GET /health
```

## Frontend

Create React + TypeScript + Vite application.

Add:

* React Router
* API client
* basic application structure
* basic home page

## Database

Create three PostgreSQL databases:

```text
auth_db
listing_db
chat_db
```

Configure:

* SQLAlchemy
* Alembic
* database connections through environment variables

Do not create application tables yet unless required for the service bootstrap.

## Infrastructure

Create:

* `compose.yml`
* Dockerfiles compatible with Podman
* PostgreSQL containers
* backend containers
* frontend container if required
* internal network
* environment variables

The project must work with:

```bash
podman compose up --build
```

## Constraints

* Follow `AGENTS.md`.
* Follow `docs/architecture.md`.
* Do not implement other features.
* Do not add RabbitMQ, Redis, S3 or Kubernetes.
* Keep the implementation minimal.

## Done When

* All containers start successfully.
* All services are reachable.
* `/health` works for every backend service.
* Frontend starts successfully.
* PostgreSQL databases are accessible.
* No unnecessary features are implemented.
