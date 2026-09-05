# F02 — Registration

## Goal

Allow a new user to create an account.

## Backend

Implement in Auth Service:

```text
POST /auth/register
```

Request:

```text
username
email
password
password_confirmation
```

Validate:

* username is required
* email is valid
* password is required
* password confirmation matches password
* username is unique
* email is unique

Hash the password before storing it.

Never store plaintext passwords.

## Database

Use the `users` table defined in `docs/database.md`.

Create the required Alembic migration.

## Frontend

Create:

```text
/register
```

Registration form:

* username
* email
* password
* password confirmation
* submit button

Display validation and API errors.

After successful registration, redirect the user to the login page.

## Constraints

* Do not implement login.
* Do not implement logout.
* Do not implement `/auth/me`.
* Do not implement other features.
* Follow the existing architecture.
* Do not rewrite working bootstrap code.

## Done When

* User can register successfully.
* Duplicate username is rejected.
* Duplicate email is rejected.
* Invalid input is rejected.
* Password is stored hashed.
* Registration migration works.
* Tests pass.
* Project still starts with Podman Compose.
