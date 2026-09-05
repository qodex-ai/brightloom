# Brightloom API

The API is served at `http://localhost:4100/api/v1`. Sign in first, then send the `bl_session` cookie with protected requests.

## Sign in

```sh
curl -i -X POST http://localhost:4100/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"priya@brightloom.test","password":"<password>"}'
```

## Tasks

List tasks, optionally using `status`, `project_id`, `assignee_id`, or `due` (`today`, `upcoming`, or `overdue`).

```sh
curl http://localhost:4100/api/v1/tasks?status=open \
  -H 'Cookie: bl_session=<session>'
```

Create a task with a title and optional project, priority, due date, assignee, description, labels, and weekly repeat setting.

```sh
curl -X POST http://localhost:4100/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -H 'Cookie: bl_session=<session>' \
  -d '{"title":"Review the launch checklist","priority":2,"labels":"launch, website"}'
```

Use `PATCH /api/v1/tasks/:id` to edit those fields or change `status` to `done` or `open`. Use `DELETE /api/v1/tasks/:id` to remove a task, and `POST /api/v1/tasks/:id/comments` with a `body` field to add a comment.

## Projects

`GET /projects` lists the organisation projects. `POST /projects` creates one with a `name` and optional `color`, and `PATCH` or `DELETE /projects/:id` updates or removes it.

## Billing

`GET /billing/subscription` returns the plan, seat count, and next invoice. `GET /billing/invoices` lists invoices, and `GET /billing/invoices/:id/pdf` downloads an invoice PDF.

## Account and organisation

`GET /me` returns the signed-in user and organisation. `PATCH /me` updates the user name or timezone. `GET /org` lists organisation details and members, while owners can rename it with `PATCH /org`.

The generated OpenAPI document is available from `GET /openapi.json`.
