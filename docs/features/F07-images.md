# F07 — Images

## Goal

Allow users to upload multiple images to listings.

## Database

Use:

```text
listing_images
```

from `docs/database.md`.

Fields:

```text
id
listing_id
file_path
position
created_at
```

## Storage

For MVP, store images locally.

Example:

```text
/uploads/<uuid>.jpg
```

Store only the file path in PostgreSQL.

Do not use S3.

Implement a simple storage abstraction if useful so local storage can be replaced later.

## Backend

Support:

* uploading multiple images
* associating images with a listing
* retrieving listing images
* deleting listing images
* maintaining image position/order

Validate:

* file type
* file size

Only the listing owner can modify or delete listing images.

## Frontend

Listing creation/edit page:

```text
Добавить фотографии
```

Allow multiple image selection.

Listing page:

* display all images
* display first image as primary image
* simple gallery/carousel

Listing cards may display the primary image.

## Constraints

* Do not add an Image Service.
* Do not add S3.
* Keep local storage.
* Do not implement other features.

## Done When

* User can upload multiple images.
* Images are stored locally.
* Image paths are stored in DB.
* Images appear on listing page.
* Owner can remove images.
* Tests pass.
