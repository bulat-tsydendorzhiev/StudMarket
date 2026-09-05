# F06 — Tags and Filters

## Goal

Add tags to listings and allow users to filter listings by tags.

## Database

Use:

```text
tags
listing_tags
```

as defined in `docs/database.md`.

Tags are predefined.

Users cannot create tags.

Example tags:

```text
Электроника
Бытовая техника
Мебель
Одежда
Учеба
Спорт
Другое
Общежитие №1
Общежитие №2
```

Dormitories are ordinary tags.

Do not create a separate `dormitories` table.

## Backend

Implement:

```text
GET /tags
```

Allow tags to be assigned to listings.

Extend listing creation/editing to accept tags.

Add listing filtering:

```text
GET /listings?tags=...
```

Support selecting multiple tags.

## Frontend

Add tags to the listing creation/edit form.

Add a left-side filter panel on the home page.

Example:

```text
Фильтры

Электроника
Бытовая техника
Мебель
Одежда
Учеба
Спорт

Общежитие №1
Общежитие №2
```

Selecting filters must update the listing results.

## Constraints

* Do not create a Tag Service.
* Do not create a Dormitory Service.
* Do not allow users to create tags.
* Do not implement images.
* Do not implement chat.

## Done When

* Tags exist in the database.
* Listings can have multiple tags.
* Users can filter listings by multiple tags.
* Tags are displayed where appropriate.
* Tests pass.
