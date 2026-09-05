# F03 — Login

## Goal

Allow registered users to authenticate.

## Backend

Implement:

```text
POST /auth/login
```

Accept:

```text
username_or_email
password
```

Validate credentials.

After successful authentication:

* create JWT
* store JWT in an HTTP-only cookie
* return successful response

Invalid credentials must return an appropriate authentication error.

## Frontend

Create:

```text
/login
```

Form:

* username or email
* password
* submit button

After successful login:

```text
/login -> /
```

The frontend must send requests with credentials when required for cookie authentication.

## Constraints

* Use the existing `users` table.
* Do not implement `/auth/me`.
* Do not implement logout.
* Do not add a separate authentication database.
* Do not store JWT in localStorage unless the existing architecture explicitly requires it.

## Done When

* Registered user can log in.
* Invalid credentials are rejected.
* JWT is created.
* JWT is stored securely in an HTTP-only cookie.
* Frontend redirects after successful login.
* Tests pass.
