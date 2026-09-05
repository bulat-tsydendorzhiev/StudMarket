# F06 — Tags and Filters

## Goal

Add tags and location to listings and allow users to filter listings by tags.

## Database

Use:

```text
tags
listing_tags
locations
```

as defined in `docs/database.md`.

Tags are predefined.
Users cannot create tags.
There should be only these tags:

```text
Электроника
Бытовая техника
Мебель
Одежда
Учеба
Спорт
Посуда
Текстиль
Химия
Развлечения
Другое
```

Locations are predefined too.
Users cannot create them.

```text
Общежитие №2
Общежитие №3
Общежитие №4
Общежитие №5
Общежитие №6
Общежитие №7
Общежитие №8
Общежитие №9
Общежитие №10
Общежитие №11
Общежитие №12
Общежитие №13
Общежитие №14
Общежитие №15
Общежитие №16
Город
```

## Backend

Allow tags and location to be assigned to listings.

Extend listing creation/editing to accept tags and locations.

Add listing filtering:

```text
GET /listings?tags=...
```

```text
GET /listings?location=...
```

Support selecting multiple tags and locations.
Support ignoring multiple tags and locations.

## Frontend

Add tags to the listing creation/edit form.

Add a left-side filter panel on the home page.

You should separate locations from other tags.

Example:

```text
Фильтры

Электроника
Бытовая техника
Мебель
Одежда
Учеба
Спорт
Посуда
Текстиль
Химия
Развлечения
Другое

Общежитие №2
Общежитие №3
Общежитие №4
Общежитие №5
Общежитие №6
Общежитие №7
Общежитие №8
Общежитие №9
Общежитие №10
Общежитие №11
Общежитие №12
Общежитие №13
Общежитие №14
Общежитие №15
Общежитие №16
Город
```

Selecting filters must update the listing results.

## Constraints

* Do not create a Tag Service.
* Do not create a Dormitory Service.
* Do not allow users to create tags.
* Do not implement images.
* Do not implement chat.

## Done When

* Tags and locations exist in their database.
* Listings can have multiple tags.
* Listing can have only one location.
* Users can filter listings by multiple tags and locations.
* Tags are displayed where appropriate.
* Tests pass.
