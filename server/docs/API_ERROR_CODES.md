# API Error Code Catalog

## Purpose
Canonical error codes for frontend handling and UX mapping.

## Standard Error Shape
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [],
    "requestId": "optional request id"
  }
}
```

## Error Codes

| Code | HTTP | Source | Meaning | Frontend Handling |
|---|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod/validation middleware | Request body/params/query invalid | Show field errors using `error.details` where present |
| `UNAUTHORIZED` | 401 | Auth middleware/auth handlers | Missing/invalid auth or refresh token | Redirect to login or trigger refresh flow |
| `FORBIDDEN` | 403 | Authorization/service rules | Authenticated but not allowed | Show permission message / disable action |
| `CSRF_INVALID` | 403 | CSRF middleware | Missing/invalid CSRF token or untrusted Origin/Referer on unsafe request | Refetch CSRF token once, retry, then show request failure |
| `NOT_FOUND` | 404 | Service/domain errors | Resource not found or inaccessible by scope | Show not-found state |
| `CONFLICT` | 409 | Domain checks/Prisma unique mapping | Duplicate or conflicting state | Show conflict UX (duplicate, already exists) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limiter middleware | Too many requests in current window | Backoff and retry later |
| `REQUEST_TIMEOUT` | 408 | Request timeout middleware | Request exceeded server timeout | Retry if safe |
| `INTERNAL_ERROR` | 500 | Global error handler | Unexpected server error | Show generic error and retry option |
| `DUPLICATE_EMAIL` | 409 | User/domain or Prisma unique mapping | Email already belongs to another user | Show duplicate email form error |
| `DUPLICATE_DEPARTMENT_CODE` | 409 | Department/domain or Prisma unique mapping | Department code already exists | Ask for another code |
| `DUPLICATE_PROGRAM_CODE` | 409 | Program/domain or Prisma unique mapping | Program code already exists | Ask for another code |
| `DUPLICATE_COURSE_CODE` | 409 | Course/domain or Prisma unique mapping | Course code already exists | Ask for another code |
| `DUPLICATE_SOCIETY_NAME` | 409 | Society/domain or Prisma unique mapping | Society name already exists | Ask for another name |
| `DUPLICATE_ROLL_NUMBER` | 409 | User/domain or Prisma unique mapping | Roll number already exists | Ask for another roll number |
| `RESOURCE_IN_USE` | 409 | Domain/Prisma relation mapping | Resource cannot be changed while referenced | Explain blocking dependency |
| `SCOPE_FORBIDDEN` | 403 | Scoped authorization rules | Caller may have a role but not for this scope | Hide/disable scoped action and show scope message |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Auth middleware | Temporary password must be changed first | Redirect to change-password flow |
| `CLASS_GRADUATED` | 409 | Class service | Graduated class is read-only | Disable class mutations |
| `CLASS_FINAL_SEMESTER_REQUIRED` | 400 | Class service | Graduation attempted before final semester | Show graduation prerequisite |
| `CURRICULUM_TEACHER_ASSIGNMENT_REQUIRED` | 400 | Class progression service | Missing required teacher assignments | Send user to teacher assignment workflow |
| `ALREADY_MEMBER` | 409 | Society service | User is already a society member | Refresh membership state |
| `JOIN_REQUEST_PENDING` | 409 | Society service | Join request already pending | Show pending request state |
| `CHANNEL_LOCKED` | 403/400 | Channel/post services | Channel cannot accept the action while locked | Show locked-channel state |
| `EDIT_WINDOW_EXPIRED` | 403 | Post service | Post edit window expired | Disable edit action |
| `UPLOAD_FILE_TOO_LARGE` | 400 | Upload middleware | Uploaded file exceeds size limit | Ask for smaller file |
| `UPLOAD_UNSUPPORTED_TYPE` | 400 | Upload middleware | Uploaded file type/content is unsupported | Ask for supported file type |
| `UPLOAD_IMAGE_TOO_LARGE` | 400 | Upload middleware | Image pixel count exceeds limit | Ask for smaller image dimensions |

## Validation Details Format
`VALIDATION_ERROR` often includes:
```json
{
  "details": [
    { "field": "email", "message": "Invalid email address", "source": "body" },
    { "field": "id", "message": "User ID must be a positive integer", "source": "params" }
  ]
}
```

## Non-Production Debug Field
In non-production environments, `INTERNAL_ERROR` may include:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "debug": "Original internal message"
  }
}
```
Frontend should ignore `debug` in production logic.

## UX Mapping Recommendations
- 400: keep user on current form, surface actionable field-level feedback.
- 401: clear session state and route to login if refresh fails.
- 403: show role/scope restriction messaging.
- 404: show empty/not-found page state.
- 409: show conflict toast and prompt user to modify input.
- 429: show cooldown timer or retry CTA after delay.
- 500: show generic fallback, log telemetry.

## Request IDs
Every response includes `X-Request-ID`. Error payloads include
`error.requestId` when available. Frontend error UI may display or copy this ID
for support/debugging, but should not require it for normal flows.

## References
- Error classes: `src/shared/errors/index.ts`
- Global mapping: `src/middleware/errorHandler.ts`
- Validation middleware: `src/middleware/validate.ts`
