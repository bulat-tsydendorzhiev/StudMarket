# F13 — User Profile

## Goal

Allow an authenticated user to view and edit their profile data.

## Frontend

After authentication, display the user's avatar in the application header.

The avatar must be clickable.

When the user clicks the avatar, open the profile page:

/profile

The profile page must display:

- avatar
- username
- email

The user must be able to edit their profile data.

## Editable Data

The user can change:

- username
- email
- password
- avatar

Password change must require the current password.

## Backend

Implement:

GET /auth/me

Use the existing endpoint to retrieve the current user.

Implement:

PATCH /auth/profile

The current user must be determined from the JWT.

Never accept a user ID from the frontend to determine whose profile is being edited.

The endpoint must validate:

- username uniqueness
- email uniqueness
- valid email
- current password when changing password

Password must always be stored as a hash.

## Avatar

Avatars are fixed: users pick from a predefined set of preset avatars, there is no arbitrary file upload.

Preset avatar images are shipped as static frontend assets under:

frontend/public/avatars/

Example paths:

/avatars/fox.png

The user cannot upload custom images. Changing the avatar only sets `avatar_path` to one of the allowed preset paths.

The backend validates that the provided `avatar_path` belongs to the allowed preset whitelist before saving.

Since avatars are static assets served by the frontend, no upload endpoint, no upload directory, and no storage volume are needed in the Auth Service.

## Database

Add the database field:

avatar_path

Store only the preset path (e.g. `/avatars/fox.png`). It is NULL when the user has not chosen an avatar.

## Default Avatar

If `avatar_path` is NULL, display `/fox.png`.

## Migrations

Create an Alembic migration adding `avatar_path` to the existing `users` table.

Do not create a separate profile table.

## Added Later

If user-uploaded avatars are ever needed, add local storage and an upload endpoint at that point (like `listing_service/app/storage.py`).

## Security

Only the authenticated user can modify their own profile.

Never trust user ID from request body or URL.

Never return password hash to the frontend.

## Constraints

- Do not create a separate User Service.
- Do not create a Profile Service.
- Do not create a separate profile database.
- Reuse Auth Service.
- Reuse the existing authentication system.
- Do not implement other features.

## Done When

- Authenticated user sees their avatar in the header.
- Clicking the avatar opens `/profile`.
- Profile data is displayed.
- User can change username.
- User can change email.
- User can change password.
- User can change their avatar to any preset avatar.
- Profile changes persist after page refresh.
- Unauthorized users cannot modify another user's profile.
- Tests pass.

