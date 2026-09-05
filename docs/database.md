# Database

## Auth DB

### users

- id UUID PK
- username UNIQUE
- email UNIQUE
- password_hash
- created_at
- updated_at
- is_active


## Listing DB

### listings

- id UUID PK
- seller_id UUID
- title
- description
- price
- status
- created_at
- updated_at
- expires_at

### tags

- id PK
- name

### listing_tags

- listing_id FK
- tag_id FK

PK(listing_id, tag_id)

### listing_images

- id PK
- listing_id FK
- file_path
- position
- created_at


## Chat DB

### conversations

- id UUID PK
- listing_id UUID
- buyer_id UUID
- seller_id UUID
- created_at
- updated_at

UNIQUE(listing_id, buyer_id)

### messages

- id UUID PK
- conversation_id FK
- sender_id UUID
- text
- created_at
- read_at