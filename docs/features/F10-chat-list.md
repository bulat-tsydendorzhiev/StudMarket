# F10 — Chat List

## Goal

Allow the user to see all their conversations.

## Backend

Implement:

```text
GET /chat/conversations
```

Return conversations where the current user is:

```text
buyer
OR
seller
```

For each conversation return enough information for the UI:

```text
conversation_id
listing
other_user
last_message
last_message_at
unread_count
```

`unread_count` is based on:

```text
messages.read_at IS NULL
```

for messages sent by the other participant.

## Frontend

Add a messages icon to the top-right header:

```text
💬
```

If unread messages exist:

```text
💬 3
```

Clicking the icon opens:

```text
/chat
```

Display:

* other participant
* related listing
* last message
* last message time
* unread count

Clicking a conversation opens:

```text
/chat/:conversationId
```

## Constraints

* Do not create a notification table.
* Do not create Notification Service.
* Do not implement email notifications.
* Use existing messages/read state.
* Do not add WebSockets.

## Done When

* User sees all conversations.
* Last message is displayed.
* Unread count is displayed.
* Header shows unread count.
* Clicking a conversation opens the chat.
* Tests pass.
