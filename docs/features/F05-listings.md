# F05 — Listings

## Goal

Implement creation, viewing, editing and deletion of marketplace listings.

## Backend

Implement in Listing Service:

```text
POST   /listings
GET    /listings
GET    /listings/{id}
PATCH  /listings/{id}
DELETE /listings/{id}
```

Listing fields:

```text
title
description
price
```

The database model must follow `docs/database.md`.

## Authentication

Authenticated user can:

* create a listing
* edit their own listing
* delete their own listing

`seller_id` must come from authenticated user information.

Never trust `seller_id` from the request body.

A user must not be able to modify or delete another user's listing.

## Frontend

Create:

```text
/
 /listings/new
 /listings/:id
 /listings/:id/edit
```

Home page:

* display listing cards
* title
* price
* basic listing information

Listing page:

* title
* price
* description
* seller information
* edit/delete controls for owner
* placeholder for future images

## Constraints

* Do not implement tags.
* Do not implement image upload.
* Do not implement chat.
* Do not implement expiration.
* Follow the existing database schema.

## Done When

* User can create a listing.
* Listings appear on the home page.
* User can open a listing.
* Owner can edit their listing.
* Owner can delete their listing.
* Other users cannot edit/delete it.
* Tests pass.
