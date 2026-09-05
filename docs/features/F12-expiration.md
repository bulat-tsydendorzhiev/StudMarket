# F12 — Listing Expiration

## Goal

Automatically hide listings after they expire.

## Database

The `listings` table contains:

```text
status
expires_at
```

Allowed statuses:

```text
ACTIVE
SOLD
EXPIRED
```

## Backend

When returning active listings, always apply:

```text
status = ACTIVE
AND expires_at > now()
```

This prevents expired listings from appearing even if the background task has not executed yet.

## Background Job

Implement a periodic background task that finds:

```text
status = ACTIVE
AND expires_at <= now()
```

and changes them to:

```text
EXPIRED
```

The exact scheduling mechanism should remain simple and compatible with the current architecture.

Do not add Redis or RabbitMQ.

## Frontend

Expired listings must not appear on the normal marketplace listing page.

If an owner opens an expired listing, display an appropriate expired state.

## Optional Cleanup

Do not physically delete the listing immediately.

For MVP, use:

```text
status = EXPIRED
```

and hide it from normal listings.

Physical deletion and image cleanup can be implemented later if required.

## Constraints

* Do not add a separate service only for expiration.
* Do not add Redis.
* Do not add RabbitMQ.
* Do not change the existing listing architecture.

## Done When

* Expired listings are hidden.
* Background task changes them to `EXPIRED`.
* Active listings continue to work.
* Expiration works after restart.
* Tests pass.
