React
  |
  v
API Gateway
  |
  +---- Auth Service ---- auth_db
  |
  +---- Listing Service - listing_db
  |
  +---- Chat Service ---- chat_db

Auth Service
Responsible for:
- registration
- login
- logout
- current user

Listing Service
Responsible for:
- listings
- tags
- listing images
- expiration

Chat Service
Responsible for:
- conversations
- messages
- unread messages

Communication:
- Frontend communicates only with Gateway.
- Services communicate through REST.
- Services never access each other's databases.