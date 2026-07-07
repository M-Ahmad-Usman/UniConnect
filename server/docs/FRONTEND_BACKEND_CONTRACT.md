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
- JWTs use standard `sub` for the internal authenticated user key. Public API
  responses and routes expose user `publicId`, not numeric user IDs.
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
    ],
    "requestId": "optional request id"
  }
}
```

Every response includes `X-Request-ID`. Error payloads include `requestId` when
available.

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
- Covered areas include user lifecycle status/delete/restore, role changes, academic/class/catalog changes, society management, and channel management.
- Auth-sensitive successful events include password reset completion, password
  change, logout refresh-token revocation, and refresh-token revocation caused
  by password reset/change.
- Audit summaries are field-level and redacted; passwords, tokens, cookies, secrets, and raw uploaded/post content are not logged.

## Optional Telemetry

- Backend Sentry telemetry is disabled unless `SENTRY_DSN` is configured.
- Frontend Sentry telemetry is disabled unless `VITE_SENTRY_DSN` is configured.
- Telemetry events are scrubbed before sending and must not include request
  bodies, cookies, auth headers, tokens, passwords, hashes, secrets, or raw
  uploaded content.

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
- User status suspension and soft deletion emit `auth:expired` to active sockets
  before disconnecting them.
- Server events:
  - `notification:new`
  - `notification:unread-count`
  - `auth:expired` (client should logout and redirect to login)
- Channel subscription envelope:
  - client emits `channel:join` and `channel:leave` with `{ channelPublicId }`
  - archived, deleted, inactive, malformed, and unauthorized targets do not
    join rooms or reveal target existence
  - clients must not subscribe to archived channels
- Channel feed events carry public IDs:
  - `post:created`, `post:updated`, `post:pinned`: `{ channelPublicId, post }`
  - `post:deleted`: `{ channelPublicId, postPublicId }`

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
  - Body: `{ fullName, email, phone, gender, userType, departmentId?, classPublicId?, rollNumber?, designation? }`
  - `userType` accepts `STAFF`, `STUDENT`, or `TEACHER`. Admin authority is assigned through staff-role assignment/transfer endpoints, not persisted as a user type.
  - Student `rollNumber` uses NTU format such as `22-NTU-CS-1184`.
- `POST /bulk-import`
  - Multipart field: `file` (CSV)
  - CSV `userType` accepts only `STUDENT` or `TEACHER`; `STAFF` rows are rejected.
- `GET /me`
  - Returns profile plus scoped current-user roles for UI authorization:
    - `roles: Array<{ role, departmentId?, departmentName?, serverPublicId?, channelPublicId?, scopeType, assignmentPublicId?, expiresAt? }>`
    - Role values currently include `admin`, `enrollment_officer`, `hod`, `program_director`, `cr`, `society_president`, `society_convenor`, `server_moderator`, `channel_moderator`
    - `scopeType` is `"global"`, `"department"`, `"server"`, or `"channel"`
- `PATCH /me`
  - Body: `{ bio? }`
- `PATCH /me/profile-picture`
  - Multipart field: `profilePicture`
- `GET /`
  - Query: `page, limit, userType?, departmentId?, status?, lifecycle?, search?`
  - `status`: `ACTIVE` or `SUSPENDED`
  - `lifecycle`: `live`, `deleted`, or `all`; admin only, teachers always see live users in their HOD department scope
- `GET /:publicId`
  - Admins can read deleted users; teachers can read live users in their HOD department scope.
  - Student details include `studentInfo.class.{ publicId, currentSemester, section, program.code }` for display labels such as `BSCS-7-A` without an extra class lookup.
- `GET /:publicId/deletion-impact`
  - Returns `{ user, canDelete, blockers }` with blocker groups for HOD departments, directed programs, CR classes, live society leadership, and active teaching assignments.
- `PATCH /:publicId/status`
  - Body: `{ status: "ACTIVE" | "SUSPENDED", reason? }`
  - Suspending revokes active refresh tokens, clears reset-token state, and disconnects active sockets.
- `DELETE /:publicId`
  - Body: `{ reason? }`
  - Soft-deletes the user after blocker checks; deletes notifications and pending society requests, revokes refresh tokens, clears reset-token state, and disconnects active sockets.
- `PATCH /:publicId/restore`
  - Body: `{ reason? }`
  - Restores the user with the preserved status. A restored suspended user remains unable to authenticate.

### Enrollment (`/api/enrollment`)

- Auth: active global Admin or active department-scoped `enrollment_officer`
  staff-role assignment.
- `GET /bootstrap`
  - Returns assigned departments, default department, and enrollment capability flags.
- `GET /programs`
  - Query: `page, limit, departmentId?, search?`
  - Results are scoped to authorized departments.
- `GET /programs/:programId/curriculum`
  - Query: `semesterNumber?, batchYear?`
  - Read-only curriculum view for class creation.
- `GET /classes`
  - Query: `page, limit, departmentId?, programId?, semester?, section?, status?`
- `POST /classes`
  - Body: `{ programId, currentSemester, academicYear, admissionYear, section }`
  - Preserves full-curriculum requirement and class-server/channel creation behavior.
- `GET /classes/:publicId`
- `GET /classes/:publicId/students`
- `GET /classes/:publicId/transfer-candidates`
  - Query: `page, limit, search?`
- `POST /classes/:publicId/transfers`
  - Body: `{ studentPublicId }`
  - Transfers an active same-department student; CR transfer remains blocked.
- `POST /students`
  - Body: `{ fullName, email, phone, gender, classPublicId, rollNumber }`
  - Always creates a student; department is derived from the class.
- `POST /students/import`
  - Multipart field: `file` (CSV)
  - Student-only partial-success import with per-row errors.

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
- `GET /:id/deletion-impact`
  - Admin only. Returns bounded blockers for programs, department-linked users,
    societies, and dependent courses plus communication cleanup impact.
- `POST /:id/programs`
  - Body: `{ disciplineId, degreeLevelId, semesters, code }`
- `GET /:id/programs`

### Programs (`/api/programs`)

- `GET /`
  - Query: `page?, limit?, departmentId?, departmentIds?, programIds?, disciplineId?, degreeLevelId?, search?`.
  - `departmentId` is an exact filter. When it is omitted, `departmentIds` and
    `programIds` are combined as a union for scoped Academics lists.
- `GET /:id/deletion-impact`
  - Admin only. Returns bounded enrolled-class blockers plus curriculum cleanup
    and program-channel communication impact.
- `PATCH /:id`
  - Body: `{ semesters?, code?, confirmSemesterReduction? }`
  - Program code and semesters are locked once classes exist.
  - Before class enrollment, semester reduction deletes future-semester
    curriculum entries only when `confirmSemesterReduction: true` is supplied.
- `GET /:id/curriculum`
  - Query: `semesterNumber?, batchYear?`
  - Returns entries with `isLocked` and `lockedThroughSemester`. Locked entries
    are for semesters already reached by an existing class in the same
    program/batch and cannot be edited or removed.
- `POST /:id/curriculum`
  - Admin, own-department HOD, or directed-program Program Director.
  - Body: `{ courseId, semesterNumber, batchYear }`
  - Single-course add returns duplicate conflicts; use bulk add for semester setup.
- `POST /:id/curriculum/bulk`
  - Admin, own-department HOD, or directed-program Program Director.
  - Body: `{ courseIds, semesterNumber, batchYear }`
  - Adds all non-duplicate courses for that semester. Existing program/batch
    courses are skipped because a course can appear only once in a degree batch.
- `POST /:id/curriculum/copy-batch`
  - Admin, own-department HOD, or directed-program Program Director.
  - Body: `{ sourceBatchYear, targetBatchYear }`
  - Source batch must be complete for all program semesters; target duplicates
    are skipped.
- `DELETE /:id/curriculum/:curriculumId`
  - Admin, own-department HOD, or directed-program Program Director.
  - Blocked for locked semesters and for live class batches when removal would
    make the batch curriculum incomplete.

### Classes (`/api/classes`)

- `POST /`
  - Body: `{ programId, currentSemester, academicYear, admissionYear, section }`
  - Auth: Admin only. Enrollment Officer class creation uses
    `/api/enrollment/classes`.
  - Requires a complete curriculum for all semesters of the class admission
    year. Creates the class server, default channels, and current-semester
    course channels from the curriculum.
- `GET /`
  - Query: `page, limit, programId?, departmentId?, semester?, section?, status?`
  - `status` accepts `ACTIVE`, `GRADUATED`, or `ALL`; default is `ACTIVE`.
  - Results are scoped to admins, own-department HODs, and own-program Program Directors.
- `GET /:publicId`
  - Returns class detail plus `status`, graduation metadata, and caller-specific `permissions`:
    - `canViewStudents`, `canManageStudents`, `canAssignCourses`, `canRemoveCourses`
    - `canReplaceCourseTeacher`, `canAdvanceSemester`, `canGraduate`
    - `canManageChannels`, `canAssignModerators`
- `GET /:publicId/deletion-impact`
  - Admin only. Returns bounded enrolled-student and teaching-assignment
    blockers plus class-server communication cleanup impact. `checksComplete`
    is `true`; `pendingChecks` is empty.
- `POST /:publicId/courses`
  - Body: `{ courseId, teacherPublicId }`
  - Course must be in the class current-semester curriculum; teacher must be active.
- `GET /:publicId/courses`
- `GET /:publicId/students`
  - Auth: Admin or own-department HOD for read-only roster visibility. Enrollment
    Officer roster reads use `/api/enrollment/classes/:publicId/students`.
- `GET /:publicId/student-candidates`
  - Query: `page, limit, search?`
  - Auth: Admin only. Enrollment Officer transfer candidates use `/api/enrollment`.
- `POST /:publicId/students`
  - Body: `{ studentPublicId }`
  - Admin-only legacy transfer endpoint. Enrollment Officer transfer uses
    `/api/enrollment/classes/:publicId/transfers`.
- `GET /:publicId/teacher-candidates`
  - Query: `page, limit, search?`
- `PATCH /:publicId/courses/:courseId/teacher`
  - Body: `{ teacherPublicId }`
- `DELETE /:publicId/courses/:courseId`
- `POST /:publicId/semester-progression`
  - Body: `{ teacherAssignments: [{ courseId, teacherPublicId }] }`
  - Requires teacher assignments for every course in the target-semester
    curriculum, rejects duplicate/extra assignments, archives previous active
    course channels, and creates or reactivates target-semester course channels.
- `POST /:publicId/graduation`
  - Final-semester active classes only; locks class channels and keeps history visible.

### Courses (`/api/courses`)

- `POST /`
  - Body: `{ title, code, creditHours, departmentId }`
  - Auth: admin for any department or HOD for their own department.
- `GET /`
  - Query: `page, limit, departmentId?`
- `GET /:id`
- `GET /:id/deletion-impact`
  - Admin only. Returns bounded blockers for curriculum entries, active
    teaching assignments, and course channels.
- `PATCH /:id`
  - Body: `{ title?, code?, creditHours? }`
  - Auth: admin only.
  - Course details are locked after the course is used in curriculum, class
    teaching assignments, or course channels.

### Societies (`/api/societies`)

- `POST /`
  - Body: `{ name, description?, departmentId, presidentPublicId, convenorPublicId }`
  - Auth: admin or HOD for the target department
- `GET /`
  - Query: `page, limit, departmentId?, status?, lifecycle?`
  - `lifecycle` is `live | deleted | all`. Deleted rows are discoverable only by admin or own-department HOD.
- `GET /:publicId`
  - Returns society detail plus `viewer: { isMember, requestStatus }` and caller-specific `permissions`.
  - Member visibility remains restricted to members, society leadership, and admins.
  - Frontend should gate society tabs and protected queries from this response instead of local role inference.
- `GET /:publicId/my-membership`
  - Returns `{ isMember, requestStatus, requestedAt, reviewedAt }` for the authenticated user
- `PATCH /:publicId`
  - Body: `{ name?, description?, presidentPublicId?, convenorPublicId? }`
  - Auth: info changes by admin, department HOD, convenor, or president; leadership changes by admin or department HOD
- `GET /:publicId/deletion-impact`
  - Auth: admin or own-department HOD
  - Returns preserved member/channel/request/post/platform-assignment counts for confirmation UI.
- `PATCH /:publicId/status`
  - Body: `{ status: "ACTIVE" | "SUSPENDED", reason? }`
  - Auth: admin or own-department HOD
- `DELETE /:publicId`
  - Body: `{ reason? }`
  - Auth: admin or own-department HOD
- `PATCH /:publicId/restore`
  - Body: `{ reason? }`
  - Auth: admin or own-department HOD
- `POST /:publicId/join-request`
- `GET /:publicId/join-requests`
  - Query: `page, limit, status?`
  - Auth: admin, convenor, or president
- `PATCH /:publicId/join-requests/:requestId`
  - Body: `{ status: "APPROVED" | "REJECTED" }`
  - Approval adds server membership; approval and rejection notify the requester with `SOCIETY_REQUEST_REVIEWED`
- `POST /:publicId/members`
  - Body: `{ userPublicId }`
- `DELETE /:publicId/members/:userPublicId`
- `GET /:publicId/members`
  - Query: `page, limit`
  - Auth: admin, society president/convenor, or an existing society member. HOD does not get member visibility by department alone.
- `GET /:publicId/member-candidates`
  - Query: `page, limit, search?`
  - Returns active university-wide students who are not already society server members
- `GET /leadership-candidates`
  - Query: `departmentId, role=president|convenor, page, limit, search?`
  - Auth: admin or HOD for the requested department
- `GET /:publicId/leadership-conflicts`
  - Query: `action=activate|restore`
  - Auth: admin or HOD for the society department
  - Returns `{ hasConflicts, conflicts }` for activation/restoration preflight
  - Conflict entries include `role`, `userPublicId`, `fullName`, `conflictingSocietyPublicId`, and `conflictingSocietyName`

Leadership candidate and assignment rules:

- `departmentId` is the managed society department for authorization, not a candidate department filter.
- President candidates are active university-wide students with `StudentInfo` and no active non-deleted president assignment.
- Convenor candidates are active university-wide teachers with `TeacherInfo` and no active non-deleted convenor assignment.
- Society create/update/activate/restore returns 409 `CONFLICT` with details when saved or selected leadership is already active elsewhere.

Suspended societies are readable only by authorized viewers and fully frozen for
writes, including lifecycle-scoped server/channel/post/moderator mutations.

### Roles (`/api/roles`)

- `GET /assignable`
  - Returns only caller-assignable role options.
  - Role values are `enrollment_officer | hod | program_director | cr | server_moderator | channel_moderator`.
  - Society president/convenor are intentionally excluded; use society update endpoints for leadership changes.
- `GET /assignable-scopes`
  - Query: `role, page, limit, search?`
  - Returns paginated caller-authorized department/program/class/server options.
  - Filled unique scopes are returned disabled with `currentAssignee`.
- `GET /assignable-channels`
  - Query: `serverPublicId, page, limit, search?`
  - Returns non-deleted and non-archived channels for a caller-assignable server. Locked channels are still selectable.
- `GET /assignable-users`
  - Query: `role, scopeId?, classPublicId?, serverPublicId?, channelPublicId?, page, limit, search?`
  - Returns paginated active users valid for the selected role/scope.
  - Moderator candidates are active server members and exclude users already assigned for the same moderator scope.
  - Moderator candidates exclude `STAFF` users (only `TEACHER` and `STUDENT` are eligible).
- `GET /revokable`
  - Query: `role, scopeId?, classPublicId?, serverPublicId?, channelPublicId?, page, limit, search?`
  - Returns only caller-revokable assignments with a server-provided `revokePayload`.
  - Staff-role revocation payloads include `{ assignmentPublicId, assignmentType: "staff" }`; platform moderator payloads include `assignmentType: "platform"`.
- `POST /platform-assignments`
  - Body: `{ userPublicId, role, serverPublicId, channelPublicId?, expiresAt? }`
  - `role` is `server_moderator | channel_moderator`; omitted/null expiry means permanent.
- `DELETE /platform-assignments/:assignmentPublicId`
  - Revokes an active assignment while retaining its historical row.
- `PATCH /platform-assignments/:assignmentPublicId/expiry`
  - Body: `{ expiresAt: string | null }`
- `GET /platform-assignments/history`
  - Admin-only paginated history. Query: `state?, role?, userPublicId?, serverPublicId?, channelPublicId?, page, limit, search?`
- `POST /staff-assignments`
  - Body: `{ userPublicId, role: "enrollment_officer", departmentId, expiresAt? }`
  - Admin-only. Assigns department-scoped staff roles to active `STAFF` users.
- `DELETE /staff-assignments/:assignmentPublicId`
  - Admin-only. Revokes revokable staff-role assignments; the active Admin role is changed only through Admin transfer.
- `POST /admin/transfer`
  - Body: `{ userPublicId }`
  - Admin-only. Atomically transfers the single active global Admin role to another active `STAFF` user.
- `GET /users/:userPublicId`
  - Returns contextual role assignments for the target user, including department/program/class/society metadata and explicit moderation roles
  - Role changes emit `auth:roles-updated` to affected users so clients can refetch `/api/users/me`

Academic role writes use their owning modules:
- `PUT|DELETE /api/departments/:id/hod`
- `PUT|DELETE /api/programs/:id/program-director`
- `PUT|DELETE /api/classes/:classPublicId/cr`

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
- `GET /:publicId`
- `GET /:publicId/channels`
  - Query: `includeArchived` (`true|false`)
- `GET /:publicId/members`
  - Query: `page, limit`
- `POST /:publicId/channels`
  - Body: `{ name, description? }`
- `PATCH /:publicId/icon`
  - Multipart field: `serverIcon`
  - Requires `create:channel` permission on the server
  - Response: `{ publicId, iconUrl }`

### Channels (`/api/channels`)

- `PATCH /:publicId`
  - Body: `{ name?, description? }`
- `PATCH /:publicId/lock`
- `PATCH /:publicId/unlock`
- `DELETE /:publicId`
- Archived channels remain readable history but reject all writes with
  `CHANNEL_ARCHIVED`.

### Channel Posts (mounted under `/api/channels`)

- `POST /:publicId/posts`
  - Body: `{ title, content, priority? }`
  - Multipart field for attachments: `attachments`
  - General channels accept posts from any active server member unless locked.
  - New-post notification messages include both server and channel names.
- `GET /:publicId/posts`
  - Query: `page, limit, search?, priority?, startDate?, endDate?`
  - Response items include bounded `attachments[]` preview metadata plus `_count.attachments`

### Posts (`/api/posts`)

- `GET /:publicId`
- `PATCH /:publicId`
  - Body: `{ title?, content?, priority? }`
- `DELETE /:publicId`
  - Soft-deletes the post and removes linked `NEW_POST` notifications.
- `PATCH /:publicId/pin`
  - Body: `{ isPinned: boolean }`
- `POST /:publicId/attachments`
  - Multipart field: `attachments`

### Notifications (`/api/notifications`)

- `GET /`
  - Query: `page, limit, type?, unreadOnly?`
  - `NEW_POST` items include post channel, server, and priority metadata for routing and urgent UI.
  - `SOCIETY_REQUEST_REVIEWED` items are emitted when a society join request is approved or rejected.
  - `SOCIETY_SUSPENDED`, `SOCIETY_ACTIVATED`, `SOCIETY_DELETED`, and `SOCIETY_RESTORED`
    items include society metadata for list/detail routing.
- `GET /unread-count`
- `PATCH /read-all`
- `PATCH /:id/read`

### Notification Preferences (`/api/notification-preferences`)

- `GET /`
  - Query: `serverPublicId?, notificationType?`
- `PATCH /`
  - Body: `{ notificationType, scopeType, serverPublicId, channelPublicId?, isSubscribed }`
  - `NEW_POST` supports server and channel scope.
  - `ROLE_ASSIGNED` supports server scope only.
  - Society-request and lifecycle notifications do not use notification preferences.
  - Missing preference means subscribed.

### Admin (`/api/admin`)

- `GET /stats`
- `GET /users`
  - Query: `page, limit, userType?, departmentId?, status?, lifecycle?, search?`; `userType` is `STAFF | TEACHER | STUDENT`.

## References

- Error code catalog: `docs/API_ERROR_CODES.md`
- Architecture conventions: `BACKEND_ARCHITECTURE.md`
- Release status: `../docs/release_log.md`
