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
- CSRF token cookie:
  - `XSRF-TOKEN` (path `/`, readable by frontend, not an auth token)
- Public endpoints: `/api/health`, `/api/auth/csrf`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`.
- Refresh endpoint (`/api/auth/refresh`) is cookie-authenticated via `refresh_token`.
- All other endpoints require a valid `access_token` cookie.
- Frontend must send credentials on every request:
  - `fetch(..., { credentials: "include" })`
  - axios: `withCredentials: true`
- Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  - trusted `Origin` or `Referer`
  - `X-XSRF-TOKEN` header equal to the `XSRF-TOKEN` cookie
- Frontend should call `GET /api/auth/csrf` before the first unsafe request and retry once after `CSRF_INVALID`.
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
- Accepted images must pass magic-byte validation and max `12MP` dimensions
- CSV upload route validates non-binary content

## Audit Logging
- Privileged successful writes create persistent `AuditLog` records.
- Covered areas include user activation, role changes, academic/class/catalog changes, society management, and channel management.
- Audit summaries are field-level and redacted; passwords, tokens, cookies, secrets, and raw uploaded/post content are not logged.

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
  - Student `rollNumber` uses NTU format such as `22-NTU-CS-1184`.
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
  - Query: `page, limit, programId?, departmentId?, semester?, section?, status?`
  - `status` accepts `ACTIVE`, `GRADUATED`, or `ALL`; default is `ACTIVE`.
  - Results are scoped to admins, own-department HODs, and own-program Program Directors.
- `GET /:id`
  - Returns class detail plus `status`, graduation metadata, and caller-specific `permissions`:
    - `canViewStudents`, `canManageStudents`, `canAssignCourses`, `canRemoveCourses`
    - `canReplaceCourseTeacher`, `canAdvanceSemester`, `canGraduate`
    - `canManageChannels`, `canAssignModerators`
- `POST /:id/courses`
  - Body: `{ courseId, teacherId }`
  - Course must be in the class current-semester curriculum; teacher must be active.
- `GET /:id/courses`
- `GET /:id/students`
- `GET /:id/student-candidates`
  - Query: `page, limit, search?`
- `POST /:id/students`
  - Body: `{ studentId }`
  - Transfers an existing same-department active student into the target class.
- `GET /:id/teacher-candidates`
  - Query: `page, limit, search?`
- `PATCH /:id/courses/:courseId/teacher`
  - Body: `{ teacherId }`
- `DELETE /:id/courses/:courseId`
- `POST /:id/semester-progression`
  - Body: `{ teacherAssignments: [{ courseId, teacherId }] }`
- `POST /:id/graduation`
  - Final-semester active classes only; locks class channels and keeps history visible.

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
  - Auth: admin or HOD for the target department
- `GET /`
  - Query: `page, limit, departmentId?`
- `GET /:id`
  - Returns society detail plus `viewer: { isMember, requestStatus }` and caller-specific `permissions`.
  - Member visibility remains restricted to members, society leadership, and admins.
  - Frontend should gate society tabs and protected queries from this response instead of local role inference.
- `GET /:id/my-membership`
  - Returns `{ isMember, requestStatus, requestedAt, reviewedAt }` for the authenticated user
- `PATCH /:id`
  - Body: `{ name?, description?, presidentId?, convenorId? }`
  - Auth: info changes by admin, department HOD, convenor, or president; leadership changes by admin or department HOD
- `POST /:id/join-request`
- `GET /:id/join-requests`
  - Query: `page, limit, status?`
  - Auth: admin, convenor, or president
- `PATCH /:id/join-requests/:requestId`
  - Body: `{ status: "APPROVED" | "REJECTED" }`
  - Approval adds server membership; approval and rejection notify the requester with `SOCIETY_REQUEST_REVIEWED`
- `POST /:id/members`
  - Body: `{ userId }`
- `DELETE /:id/members/:userId`
- `GET /:id/members`
  - Query: `page, limit`
  - Auth: admin, society president/convenor, or an existing society member. HOD does not get member visibility by department alone.
- `GET /:id/member-candidates`
  - Query: `page, limit, search?`
  - Returns active university-wide students who are not already society server members
- `GET /leadership-candidates`
  - Query: `departmentId, role=president|convenor, page, limit, search?`
  - Auth: admin or HOD for the requested department
  - Returns same-department students with `StudentInfo` for president or same-department teachers with `TeacherInfo` for convenor

### Roles (`/api/roles`)
- `GET /assignable`
  - Returns only caller-assignable role options.
  - Role values are `hod | program_director | cr | server_moderator | channel_moderator`.
  - Society president/convenor are intentionally excluded; use society update endpoints for leadership changes.
- `GET /assignable-scopes`
  - Query: `role, page, limit, search?`
  - Returns paginated caller-authorized department/program/class/server options.
  - Filled unique scopes are returned disabled with `currentAssignee`.
- `GET /assignable-channels`
  - Query: `serverId, page, limit, search?`
  - Returns non-deleted and non-archived channels for a caller-assignable server. Locked channels are still selectable.
- `GET /assignable-users`
  - Query: `role, scopeId?, serverId?, channelId?, page, limit, search?`
  - Returns paginated active users valid for the selected role/scope.
  - Moderator candidates are active server members and exclude users already assigned for the same moderator scope.
- `GET /revokable`
  - Query: `role, scopeId?, serverId?, channelId?, page, limit, search?`
  - Returns only caller-revokable assignments with a server-provided `revokePayload`.
- `POST /assign`
  - Body for scoped organizational roles: `{ userId, role, scopeId }`
    - `role` in `hod | program_director | cr`
  - Body for moderation roles:
    - `{ userId, role: "server_moderator", serverId }`
    - `{ userId, role: "channel_moderator", serverId, channelId }`
  - Success data echoes the assigned role context (`role`, `userId`, and relevant scope ids)
  - `society_president` and `society_convenor` are rejected here; use `PATCH /api/societies/:id`
- `POST /revoke`
  - Body for revokable scoped roles: `{ userId, role, scopeId }`
    - `role` in `hod | program_director | cr`
  - Body for moderation roles:
    - `{ userId, role: "server_moderator", serverId }`
    - `{ userId, role: "channel_moderator", serverId, channelId }`
  - Society leadership roles are changed via society update endpoints, not revoke
- `GET /users/:id`
  - Returns contextual role assignments for the target user, including department/program/class/society metadata and explicit moderation roles
  - Role changes emit `auth:roles-updated` to affected users so clients can refetch `/api/users/me`

### Permissions (`/api/permissions`)
- `GET /me`
  - Returns grouped boolean capabilities for current-user navigation and UI gating.
  - Shape: `{ global, roleWorkspace, scopes }`.
  - Does not return assignable users or broad target lists.
  - Frontend must still rely on backend mutation authorization; capability booleans are not write authorization.
  - Role changes emit `auth:roles-updated`; clients should refresh `/api/users/me`, `/api/permissions/me`, and active permission-sensitive queries.

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
  - `SOCIETY_REQUEST_REVIEWED` items are emitted when a society join request is approved or rejected.
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
  - `SOCIETY_REQUEST_REVIEWED` does not use notification preferences.
  - Missing preference means subscribed.

### Admin (`/api/admin`)
- `GET /stats`
- `GET /users`
  - Query: `page, limit, userType?, departmentId?, isActive?, search?`

## References
- Error code catalog: `docs/API_ERROR_CODES.md`
- Architecture conventions: `API_DEVELOPMENT_PLAN.md`
- Progress and status: `PROGRESS.md`
