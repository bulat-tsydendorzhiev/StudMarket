# F04 — Current User

## Goal

Allow the application to determine the currently authenticated user.

## Backend

Implement:

```text
GET /auth/me
POST /auth/logout
```

`GET /auth/me` must:

* read JWT from the authentication cookie
* validate JWT
* return current user

Response should contain:

```text
id
username
email
```

`POST /auth/logout` must invalidate/remove the authentication cookie.

Unauthenticated requests to `/auth/me` must return `401`.

## Frontend

Create a global authentication state.

When the application starts:

```text
GET /auth/me
```

Behavior:

```text
200 -> authenticated
401 -> guest
```

Authenticated user information must be available to the application.

Add appropriate UI for authenticated and unauthenticated users.

## Security

The backend must independently validate JWT and permissions.

Never trust a user ID supplied by the frontend when the current user can be obtained from JWT.

## Constraints

* Do not implement other features.
* Do not change the authentication architecture.
* Reuse existing login implementation.

## Done When

* `/auth/me` returns the current user.
* `/auth/me` returns `401` for unauthenticated users.
* Logout removes authentication.
* Refreshing the page preserves authentication.
* Navigating to /login and /register should redirect to the home page.
* Frontend knows whether the user is authenticated.
* Tests pass.
