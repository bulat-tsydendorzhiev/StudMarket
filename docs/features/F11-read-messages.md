# F11 — Read Messages

## Goal

Mark unread messages as read when the user opens a conversation.

## Backend

Implement:

```text
PATCH /chat/conversations/{id}/read
```

For the current user:

* find unread messages sent by the other participant
* set `read_at = now()`

Do not mark the user's own messages as unread/read.

Only conversation participants can perform this operation.

## Frontend

When opening a conversation:

1. Load messages.
2. Mark messages as read.
3. Refresh unread count.

Example:

```text
Seller sends message
        ↓
Buyer sees:
💬 1
        ↓
Buyer opens chat
        ↓
PATCH /read
        ↓
💬
```

## Constraints

* Do not create a notification system.
* Do not create a notifications table.
* Do not implement email.
* Do not change the message schema.

## Done When

* New messages produce an unread count.
* Opening the chat marks incoming messages as read.
* Unread count decreases correctly.
* Header indicator updates correctly.
* Tests pass.
