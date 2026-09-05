# F09 — Messaging

## Goal

Allow participants of a conversation to send and receive messages.

## Database

Use:

```text
messages
```

with:

```text
id
conversation_id
sender_id
text
created_at
read_at
```

## Backend

Implement:

```text
GET  /chat/conversations/{id}/messages
POST /chat/conversations/{id}/messages
```

Sending a message requires:

```text
text
```

`sender_id` must come from JWT.

## Permissions

Only buyer or seller of the conversation can:

* view messages
* send messages

Reject unauthorized users.

## Frontend

Create:

```text
/chat/:conversationId
```

Display:

* messages
* sender
* timestamp

Message input:

```text
[Введите сообщение...] [Отправить]
```

Messages from the current user and other participant should be visually distinguishable.

## Communication

Use REST API.

For MVP, use polling to refresh messages.

Do not implement WebSockets unless explicitly required later.

## Constraints

* Do not implement chat list.
* Do not implement read state yet.
* Do not implement email notifications.
* Do not add Redis/RabbitMQ.

## Done When

* Users can send messages.
* Users can retrieve message history.
* Only conversation participants have access.
* Messages are stored in PostgreSQL.
* Frontend displays conversation correctly.
* Tests pass.
