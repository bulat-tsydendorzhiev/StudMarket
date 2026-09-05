# Project Rules

## Project

Student marketplace, similar to a small Avito.

## Architecture

React frontend -> API Gateway -> 3 microservices:

- Auth Service
- Listing Service
- Chat Service

Each service owns its own PostgreSQL database.

Services communicate only through REST APIs.

## Stack

Frontend:
- React
- TypeScript
- Vite
- React Router
- TanStack Query

Backend:
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- JWT

Infrastructure:
- Podman
- Podman Compose
- PostgreSQL

## Rules

- Use UUID for entity IDs.
- Do not access another service's database directly.
- Do not store passwords as plaintext.
- Get authenticated user ID from JWT, never from request body.
- Do not add RabbitMQ, Redis, S3 or Kubernetes.
- Images are stored locally for now.
- Users cannot create tags.
- Do not create an interests table.
- Chat notifications are based on unread messages.

## Development

Implement the project feature-by-feature.

Before implementing a feature:
1. Read relevant files in `docs/`.
2. Inspect existing code.
3. Reuse existing architecture.
4. Do not rewrite working code unnecessarily.

After implementing a feature:
1. Run tests.
2. Check that the service starts.
3. Fix errors before moving to the next feature.