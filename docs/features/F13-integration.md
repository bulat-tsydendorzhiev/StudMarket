# F13 — Final Integration

## Goal

Verify that the complete MVP works as one system.

## Main User Flow

Test the following scenario:

```text
1. Register user A
2. Login as user A
3. Create listing
4. Add tags
5. Add multiple images
6. Logout
7. Register/login user B
8. Open user A's listing
9. Click "Написать продавцу"
10. Send a message
11. Verify user A sees an unread message
12. Open chat as user A
13. Verify message becomes read
14. Reply to user B
15. Verify user B receives the message
16. Verify listing filters work
17. Verify listing expiration works
```

## Backend Checks

Verify:

* authentication
* JWT validation
* authorization
* listing ownership
* tag filtering
* image upload
* conversation permissions
* message permissions
* unread/read state
* listing expiration

## Frontend Checks

Verify:

* registration
* login
* logout
* authenticated state after refresh
* home page
* filters
* listing creation
* listing detail
* image gallery
* chat creation
* chat list
* unread indicator
* messaging
* read state

## Infrastructure Checks

Run:

```bash
podman compose up --build
```

Verify:

* Gateway starts
* Auth Service starts
* Listing Service starts
* Chat Service starts
* PostgreSQL databases start
* migrations work
* frontend starts

Check logs for errors.

## Tests

Run all backend and frontend tests.

Fix errors before considering the project complete.

## Constraints

Do not add new functionality during this feature.

The purpose of F13 is integration, testing and fixing existing functionality.

## Done When

The complete user flow works from registration through marketplace, chat and expiration without manual database changes.
