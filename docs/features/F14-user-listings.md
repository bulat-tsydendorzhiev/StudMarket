# F14 — User listings

## Requirements

Add a page with all listings created by the authenticated user and set up navigation to the page via the dropdown list after clicking on the avatar.

Route:

```text
/my-listings
```

The page should be accessible from the user's profile.

Display listings as cards using the existing listing card component.

Each card should show:

* title
* price
* main image
* status
* creation date
* expiration date

## API

Add an endpoint:

```http
GET /listings/my
```

The current user must be determined from the authenticated auth context.

Do not accept `seller_id` or `user_id` from the frontend.

Return only listings belonging to the authenticated user.

## Status

Display:

* `ACTIVE`
* `SOLD`
* `EXPIRED`

Expired listings should not be returned after they have been physically deleted.

## Empty State

If the user has no listings, display a simple empty state with an option to create a listing.

## Authorization

Only authenticated users can access this page.

The backend must determine the owner from the authenticated user ID.

## Done When

* `/my-listings` works.
* User sees only their own listings.
* Listing cards reuse the existing UI.
* Status and expiration are displayed.
* Empty state works.
* `seller_id` is never taken from the request.
* Tests pass.
