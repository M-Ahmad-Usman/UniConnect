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
    "details": []
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
| `INTERNAL_ERROR` | 500 | Global error handler | Unexpected server error | Show generic error and retry option |

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

## References
- Error classes: `src/shared/errors/index.ts`
- Global mapping: `src/middleware/errorHandler.ts`
- Validation middleware: `src/middleware/validate.ts`
