# Security, Errors, Audit, and Telemetry

## Authentication
- Auth is cookie-based. The frontend never reads or stores JWTs.
- `access_token` is httpOnly and scoped to `/api`.
- `refresh_token` is httpOnly and scoped to `/api/auth/refresh`.
- Password changes and password resets clear auth cookies and require re-login.
- Users with `mustChangePassword=true` are blocked from protected routes except
  `/api/auth/change-password`.
- Refresh tokens are hash-before-store, rotated on refresh, and revoked on
  logout/password reset/password change.

## CSRF and Cookie Policy
- Unsafe methods require a trusted `Origin` or `Referer`.
- Unsafe methods also require a signed double-submit token:
  `XSRF-TOKEN` cookie echoed as `X-XSRF-TOKEN`.
- The frontend fetches `/api/auth/csrf` before unsafe requests and retries once
  after `CSRF_INVALID`.
- Same-origin deployment is the runtime default and pairs with
  `AUTH_COOKIE_SAME_SITE=strict`.
- Cross-origin deployment is documented-only for Module 7. It requires HTTPS,
  explicit `CORS_ORIGIN`, explicit `CSRF_TRUSTED_ORIGINS`,
  `AUTH_COOKIE_SAME_SITE=none`, and `AUTH_COOKIE_SECURE=true`.

## Authorization
- Backend permissions are authoritative.
- Frontend capability gating improves UX but never replaces backend checks.
- Capability data drives high-risk UI for classes, societies, and role
  management.
- Scoped managers receive backend-scoped options instead of broad global lists.
- Persisted user types are `STAFF`, `TEACHER`, and `STUDENT`. Admin is a direct
  active global staff role, not a base user type and not a generic
  `ROLE_PERMISSION` grant.
- Exactly one active Admin is enforced by staff-role transfer flows; Admin
  transfer revokes the previous assignment and creates the new assignment in one
  transaction.
- Database exclusion constraints backstop staff-role period overlap and global
  Admin overlap, so concurrency cannot create duplicate active staff authority.
- Non-admin staff roles do not inherit Admin bypass or posting privileges unless
  explicitly added by future phases.
- Enrollment Officer is a department-scoped staff role. It can use only
  enrollment APIs for assigned departments and does not receive role-management,
  channel-management, posting, curriculum, teacher-assignment, semester
  progression, graduation, or society-management authority.
- Society leadership candidates are university-wide, but creation, leadership
  change, lifecycle, and conflict-preflight authority remains Admin or HOD for
  the society's owning department. Active non-deleted leadership uniqueness is
  enforced by service checks and SQL-only partial unique indexes.
- Course teaching assignments grant direct access only to their linked course
  channel through `Teaches.channelId`; they do not grant class-server membership
  or server/channel moderator eligibility. Locked and archived course-channel
  lifecycle state is still enforced before writes.

## API Errors
- Standard shape:

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

- Backend emits stable codes documented in `server/docs/API_ERROR_CODES.md`.
- Safe domain cases use specific codes such as duplicate entity codes,
  `SCOPE_FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `CLASS_GRADUATED`,
  `CHANNEL_LOCKED`, `CHANNEL_ARCHIVED`, and upload-specific codes.
- Auth enumeration and unexpected server failures remain generic.
- Every response receives `X-Request-ID`; error payloads include `requestId`
  when available.

## Audit Logging
- Successful privileged writes create redacted `AuditLog` records.
- Covered areas include users, roles, academic/catalog/class changes, societies,
  channels, and auth-sensitive events.
- Module 7 adds auth-sensitive audit coverage for password reset completion,
  password change, logout refresh-token revocation, and refresh-token revocation
  caused by password reset/change.
- Audit summaries must never include passwords, reset tokens, token hashes,
  cookies, authorization headers, raw uploaded files, or full post content.

## Upload and Content Safety
- Uploads use file-size limits, accepted MIME checks, magic-byte validation, and
  image pixel-count limits.
- Cloudinary uploads are restricted to known image folders/resource types.
- Rich post HTML is sanitized with DOMPurify.
- Rich-content links restrict allowed protocols, and external links use safe
  `rel` values.

## Telemetry
- Backend logs use Pino with structured JSON in production, pretty output in
  development, and silent defaults in tests. Logs go to stdout for the deployment
  platform or external log pipeline; the app does not manage local log files.
- Pino redaction covers cookies, authorization/CSRF headers, passwords, tokens,
  hashes, secrets, and common credential field names. HTTP logs intentionally do
  not include request bodies, cookie values, auth headers, or query values.
- Sentry is optional and disabled by default.
- Backend telemetry uses `@sentry/node` when `SENTRY_DSN` is configured.
- Frontend telemetry uses `@sentry/react` when `VITE_SENTRY_DSN` is configured.
- Source map upload is enabled only when Sentry release env vars are configured.
- Events are scrubbed with `beforeSend`; request bodies, cookies, auth headers,
  tokens, secrets, hashes, and passwords are removed.
- User context may include numeric user ID only, not email or name.

## Deferred Security Follow-up
- Add MFA for the active Admin staff account before any real deployment with live institutional
  data.
- Revisit cross-origin runtime support only if deployment actually separates the
  frontend and API origins.
- Audit broader scoped-role writes for authority changes between middleware
  authorization and transaction commit. Communication lifecycle and
  membership-sensitive writes already revalidate their critical state inside
  Module 6 transactions.
