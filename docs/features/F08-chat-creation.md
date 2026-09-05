# F08 — Chat Creation

## Goal

Allow a user to start a conversation with a listing seller.

## Frontend

On the listing page add:

```text
Написать продавцу
```

button.

When clicked:

```text
POST /chat/conversations
```

with:

```text
listing_id
```

## Backend

Chat Service:

```text
POST /chat/conversations
```

The current user is the buyer.

`buyer_id` must come from JWT.

The seller must be determined from the listing through Listing Service.

Do not trust `buyer_id` or `seller_id` supplied by the frontend.

## Conversation Rules

Use:

```text
UNIQUE(listing_id, buyer_id)
```

If a conversation already exists for the listing and buyer:

* return the existing conversation

Otherwise:

* create a new conversation

## Permissions

Only users involved in the conversation can access it.

A user must not be able to create a conversation with themselves as seller/buyer.

## Constraints

* Do not implement message sending yet.
* Do not implement chat list yet.
* Do not implement unread/read state yet.
* Do not use WebSockets.
* Do not add Redis or RabbitMQ.

## Done When

* User can click "Написать продавцу".
* Conversation is created.
* Existing conversation is reused.
* Correct buyer and seller are stored.
* Unauthorized access is rejected.
* Tests pass.
