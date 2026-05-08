# Frontend-Backend Contract

## Purpose
This document is the frontend integration contract for the UniConnect backend. It is derived from the active implementation in `server/src`.

## Base URL and Transport
- Base API prefix: `/api`
- Health check: `GET /api/health`
- Realtime: Socket.IO on the same backend origin

## Authentication Model
- Auth is cookie-based, not bearer-header based.
- Cookies set by backend:
  - `access_token` (path `/api`)
  - `refresh_token` (path `/api/auth/refresh`)
- Public endpoints: `/api/health`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`.
- Refresh endpoint (`/api/auth/refresh`) is cookie-authenticated via `refresh_token`.
- All other endpoints require a valid `access_token` cookie.
- Frontend must send credentials on every request:
  - `fetch(..., { credentials: "include" })`
  - axios: `withCredentials: true`
- On password change or reset, backend clears cookies and client must re-login.

## Response Contract

### Success
```json
{
  "success": true,
  "data": {},
  "message": "Optional"
}
```

### Paginated success
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email", "source": "body" }
    ]
  }
}
```

## Pagination and Limits
- Default page size: `20`
- Max page size: `50`
- Common query params: `page`, `limit`

## File Upload Constraints
- Max file size: `5MB`
- Max post attachments: `3`
- Accepted images: JPEG, PNG, WEBP
- CSV upload route validates non-binary content

## Rate Limits
- General API: `100` requests/minute
- Auth sensitive endpoints: `5` requests/15 minutes
- Upload endpoints: `10` requests/minute
- Rate-limit error code: `RATE_LIMIT_EXCEEDED`

## Frontend Behavior Notes
- If `mustChangePassword` is true on login, user can only access change-password flow.
- `POST /api/auth/forgot-password` is silent for unknown emails by design.
- `POST /api/auth/refresh` requires `refresh_token` cookie and returns new cookies.

## Realtime Contract (Socket.IO)
- Auth source: `access_token` cookie
- User room: `user:{userId}`
- Server events:
  - `notification:new`
  - `notification:unread-count`
  - `auth:expired` (client should logout and redirect to login)

## Endpoint Catalog

### System
- `GET /api/health`

### Auth (`/api/auth`)
- `POST /login`
  - Body: `{ email, password }`
- `POST /logout`
- `POST /refresh`
- `POST /forgot-password`
  - Body: `{ email }`
- `POST /reset-password`
  - Body: `{ token, newPassword }`
- `PATCH /change-password`
  - Body: `{ currentPassword, newPassword }`

### Users (`/api/users`)
- `POST /`
  - Body: `{ fullName, email, phone, gender, userType, departmentId?, classId?, rollNumber?, designation? }`
- `POST /bulk-import`
  - Multipart field: `file` (CSV)
- `GET /me`
  - Returns profile plus scoped current-user roles for UI authorization:
    - `roles: Array<{ role, serverId, channelId?, scopeType }>`
    - Role values currently include `hod`, `program_director`, `cr`, `society_president`, `society_convenor`, `server_moderator`, `channel_moderator`
    - `scopeType` is `"server"` or `"channel"`
- `PATCH /me`
  - Body: `{ bio? }`
- `PATCH /me/profile-picture`
  - Multipart field: `profilePicture`
- `GET /`
  - Query: `page, limit, userType?, departmentId?, isActive?`
- `GET /:id`
- `PATCH /:id/deactivate`
- `PATCH /:id/reactivate`

### Disciplines (`/api/disciplines`)
- `POST /`
  - Body: `{ name }`
- `GET /`

### Departments (`/api/departments`)
- `POST /`
  - Body: `{ name, code }`
- `GET /`
- `GET /:id`
- `PATCH /:id`
  - Body: `{ name?, code? }`
- `GET /:id/stats`
- `POST /:id/programs`
  - Body: `{ disciplineId, degreeLevelId, semesters, code }`
- `GET /:id/programs`

### Programs (`/api/programs`)
- `PATCH /:id`
  - Body: `{ semesters?, code? }`
- `GET /:id/curriculum`
  - Query: `semesterNumber?, batchYear?`
- `POST /:id/curriculum`
  - Body: `{ courseId, semesterNumber, batchYear }`
- `DELETE /:id/curriculum/:curriculumId`

### Classes (`/api/classes`)
- `POST /`
  - Body: `{ programId, currentSemester, academicYear, admissionYear, section }`
- `GET /`
  - Query: `page, limit, programId?, semester?`
- `GET /:id`
- `POST /:id/courses`
  - Body: `{ courseId, teacherId }`
- `GET /:id/courses`
- `DELETE /:id/courses/:courseId`
- `POST /:id/semester-progression`
  - Body: `{ teacherAssignments: [{ courseId, teacherId }] }`

### Courses (`/api/courses`)
- `POST /`
  - Body: `{ title, code, creditHours, departmentId }`
- `GET /`
  - Query: `page, limit, departmentId?`
- `GET /:id`
- `PATCH /:id`
  - Body: `{ title?, code?, creditHours? }`

### Societies (`/api/societies`)
- `POST /`
  - Body: `{ name, description?, departmentId, presidentId, convenorId }`
- `GET /`
  - Query: `page, limit, departmentId?`
- `GET /:id`
- `PATCH /:id`
  - Body: `{ name?, description?, presidentId?, convenorId? }`
- `POST /:id/join-request`
- `GET /:id/join-requests`
  - Query: `page, limit, status?`
- `PATCH /:id/join-requests/:requestId`
  - Body: `{ status: "APPROVED" | "REJECTED" }`
- `POST /:id/members`
  - Body: `{ userId }`
- `DELETE /:id/members/:userId`
- `GET /:id/members`
  - Query: `page, limit`

### Roles (`/api/roles`)
- `POST /assign`
  - Body for scoped organizational roles: `{ userId, role, scopeId }`
    - `role` in `hod | program_director | cr | society_president | society_convenor`
  - Body for moderation roles:
    - `{ userId, role: "server_moderator", serverId }`
    - `{ userId, role: "channel_moderator", serverId, channelId }`
  - Success data echoes the assigned role context (`role`, `userId`, and relevant scope ids)
- `POST /revoke`
  - Body for revokable scoped roles: `{ userId, role, scopeId }`
    - `role` in `hod | program_director | cr`
  - Body for moderation roles:
    - `{ userId, role: "server_moderator", serverId }`
    - `{ userId, role: "channel_moderator", serverId, channelId }`
  - Society leadership roles are changed via society update endpoints, not revoke
- `GET /users/:id`
  - Returns contextual role assignments for the target user, including department/program/class/society metadata and explicit moderation roles

### Servers (`/api/servers`)
- `GET /`
  - Query: `page, limit, type?`
- `GET /:id`
- `GET /:id/channels`
  - Query: `includeArchived` (`true|false`)
- `GET /:id/members`
  - Query: `page, limit`
- `POST /:id/channels`
  - Body: `{ name, description? }`

### Channels (`/api/channels`)
- `PATCH /:id`
  - Body: `{ name?, description? }`
- `PATCH /:id/lock`
- `PATCH /:id/unlock`
- `DELETE /:id`

### Channel Posts (mounted under `/api/channels`)
- `POST /:id/posts`
  - Body: `{ title, content, priority? }`
  - Multipart field for attachments: `attachments`
- `GET /:id/posts`
  - Query: `page, limit, search?, priority?, startDate?, endDate?`

### Posts (`/api/posts`)
- `GET /:id`
- `PATCH /:id`
  - Body: `{ title?, content?, priority? }`
- `DELETE /:id`
- `PATCH /:id/pin`
  - Body: `{ isPinned: boolean }`
- `POST /:id/attachments`
  - Multipart field: `attachments`

### Notifications (`/api/notifications`)
- `GET /`
  - Query: `page, limit, type?, unreadOnly?`
  - `NEW_POST` items include post channel and priority metadata for routing and urgent UI.
- `GET /unread-count`
- `PATCH /read-all`
- `PATCH /:id/read`

### Notification Preferences (`/api/notification-preferences`)
- `GET /`
  - Query: `serverId?, notificationType?`
- `PATCH /`
  - Body: `{ notificationType, scopeType, serverId, channelId?, isSubscribed }`
  - `NEW_POST` supports server and channel scope.
  - `ROLE_ASSIGNED` supports server scope only.
  - Missing preference means subscribed.

### Admin (`/api/admin`)
- `GET /stats`
- `GET /users`
  - Query: `page, limit, userType?, departmentId?, isActive?, search?`

## References
- Error code catalog: `docs/API_ERROR_CODES.md`
- Architecture conventions: `API_DEVELOPMENT_PLAN.md`
- Progress and status: `PROGRESS.md`
