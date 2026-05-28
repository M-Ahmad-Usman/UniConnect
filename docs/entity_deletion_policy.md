# UniConnect Entity Deletion and Lifecycle Policy

## Purpose

This is the canonical deletion and lifecycle policy for the schema/public-ID
refactor. It incorporates the useful policy work from `pulled-docs/` while
reflecting the decisions locked for this branch.

The core principle remains:

```text
Database constraints are the safety net. Application services are the gatekeeper.
```

Foreign-key `ON DELETE` actions only run on hard deletes. Soft-deleted rows are
not physically removed, so application services must manually perform any
soft-delete side effects that are intended to mirror hard-delete cascades.

## Lifecycle Concepts

### Status vs Deletion

Status and deletion are separate.

- Status controls whether an entity is operational.
- Soft-delete controls lifecycle removal, normal visibility, and restore.

Users:
- `ACTIVE`: may authenticate and use the system.
- `SUSPENDED`: cannot login, refresh, or connect sockets.
- `isDeleted = true`: hidden from normal user queries and cannot authenticate.

Societies:
- `ACTIVE`: normal society behavior.
- `SUSPENDED`: society remains visible to authorized viewers, but joins, request
  review, posting, role changes, and member changes are blocked.
- `isDeleted = true`: hidden from normal society/server/channel flows.

Servers:
- No independent status.
- Server lifecycle is owner-driven.
- Department and class server lifecycle follows their owning entity policy.
- Society server soft-delete/restore happens as part of society lifecycle.

Channels and posts:
- Channels and posts already use soft-delete behavior.
- Channel restore is internal only for lifecycle cascade restore.
- Post restore is deferred.

### Public IDs

Core public entities use `publicId` externally:
- users
- classes
- societies
- servers
- channels
- posts

Internal numeric IDs remain database implementation details and JWT/session
internals. Numeric IDs are not accepted as external identifiers for core entities
after public-ID migration is complete.

### JWT Subject Policy

JWTs may contain the internal numeric user ID as the standard `sub` claim.
JWT payloads are signed but readable, so payload fields are not secrets. Knowing
an internal numeric ID must not grant access to anything. Every action must be
authorized from the authenticated subject and target scope.

## Soft-Deleted Entities

The final target treats these entities as soft-deletable:

| Entity | Public lifecycle API | Restore API | Notes |
|---|---|---|---|
| Users | Yes | Yes | Admin-only |
| Societies | Yes | Yes | Admin and own-department HOD |
| Servers | No standalone API | Internal only | Owner-driven |
| Channels | Existing delete API | Internal only | Standalone restore deferred |
| Posts | Existing delete API | No | Restore deferred |

## User Lifecycle Policy

### User Suspension

Suspension is not deletion.

When a user is suspended:
- login is rejected.
- refresh is rejected.
- Socket.IO connection is rejected.
- historical posts, memberships, and audit references remain intact.
- the user is not hidden from all administrative views.

### User Soft-Delete

Authority:
- Admin only.
- Self-delete through the admin endpoint is not allowed unless a future product
  decision explicitly adds account self-service.

Deletion-impact endpoint:
- Must return all blockers in one response.
- Must require the same authority as deletion.

Blockers:

| Blocker | Required resolution |
|---|---|
| User is HOD of a department | Assign or clear HOD first |
| User is Program Director of a program | Assign or clear Program Director first |
| User is CR of a class | Assign or clear CR first |
| User is president of a society | Change society president first |
| User is convenor of a society | Change society convenor first |
| User has active class-course teaching assignments | Reassign/remove assignments first |

Transaction side effects:
- Set user soft-delete metadata.
- Record optional reason if supplied.
- Delete all notifications for the user.
- Delete pending society membership requests for the user.
- Revoke or delete active refresh tokens.
- Write an audit log entry.

Preserved on soft-delete:
- student/teacher profile rows.
- server memberships.
- platform role assignments.
- notification preferences.
- authored posts.
- audit logs.

Restore:
- Preserves previous `ACTIVE` or `SUSPENDED` status.
- Fails if the deleted user's email has been reused by another non-deleted user.
- Does not recreate deleted notifications or pending society requests.

Email and roll-number uniqueness:
- Deleted user emails may be reused.
- Student roll numbers remain globally unique forever.

Hard delete:
- Deferred.
- Any future hard-delete implementation must run the same blocker analysis first.
- If authored posts exist, the operation must require explicit confirmation and
  delete posts in the same transaction before deleting the user.

## Society Lifecycle Policy

### Society Suspension

Authority:
- Admin.
- Own-department HOD.

Suspended society behavior:
- Existing authorized viewers may read visible society content.
- New join requests are blocked.
- Pending request review is blocked.
- Member add/remove is blocked.
- Leadership changes are blocked.
- Platform moderator changes are blocked.
- Posting in society channels is blocked for everyone.

Pending requests:
- Remain pending while suspended.

Notifications:
- Society suspension creates specific in-app lifecycle notifications for active
  affected society members.

### Society Soft-Delete

Authority:
- Admin.
- Own-department HOD.

Deletion-impact endpoint:
- Must require the same authority as deletion.
- There are no database-derived blockers for normal society soft-delete.

Transaction side effects:
- Set society soft-delete metadata.
- Soft-delete the owned server with the same lifecycle cascade ID.
- Soft-delete channels under that server with the same lifecycle cascade ID.
- Delete pending society membership requests.
- Keep approved/rejected request history.
- Write audit log entry.
- Notify active affected society members with a specific lifecycle notification.

Preserved on soft-delete:
- society leadership fields.
- server memberships.
- platform role assignments.
- notification preferences.
- posts inside soft-deleted channels.
- approved/rejected membership request history.

Restore:
- Preserves previous `ACTIVE` or `SUSPENDED` status.
- Restores only server/channels deleted by the same lifecycle cascade.
- Fails if the society name has been reused by another non-deleted society.

Hard delete:
- Deferred.
- Future hard-delete order must delete channels first, delete the society row,
  then delete the server row in one transaction.

Society name uniqueness:
- Deleted society names may be reused.
- Restore fails if the name has been reused.

## Server Policy

Servers are owned structural entities.

Rules:
- No standalone public server delete/restore API in this refactor.
- Society-owned server soft-delete/restore is driven by society lifecycle.
- Department/class server hard-delete behavior is deferred until rare destructive
  entity workflows are implemented.
- Public server routes use `publicId` after migration.

Preserved during owner soft-delete:
- memberships.
- platform role assignments.
- notification preferences.

## Channel Policy

Channel soft-delete:
- Sets soft-delete metadata.
- Leaves posts intact.
- Hides posts naturally because the channel is unavailable.

Lifecycle cascade:
- Society soft-delete marks owned channels with the same cascade ID.
- Society restore restores only channels deleted by that same cascade.
- Channels deleted before the society lifecycle operation must not be restored by
  society restore.

Standalone channel restore:
- Deferred.

Hard delete:
- Deferred except where future owner hard-delete workflows require it.
- Future hard-delete should rely on DB cascades for posts, notifications, and
  attachments where constraints are configured to do so.

## Post Policy

Post soft-delete:
- Sets soft-delete metadata.
- Deletes linked post notifications.
- Preserves author reference and content history according to existing moderation
  behavior.

Post restore:
- Deferred.

Hard delete:
- Deferred except where future hard-delete workflows require it.

## Platform Role Assignment Policy

Platform roles:
- `server_moderator`
- `channel_moderator`

Rules:
- Stored in `user_role_assignments`.
- Academic roles are not stored in this table.
- Expired assignments are ignored by authorization.
- Expired assignments remain stored for history and are hidden from normal role
  lists.
- Soft-deleted users do not receive active permissions from preserved role rows.
- Soft-deleted servers/channels do not grant platform role authority.

## Rare Entity Impact Policy

Rare destructive deletes are deferred, but blocker reports are part of this
refactor.

### Departments

Blockers:
- programs in the department.
- teachers in the department.
- societies in the department.
- courses with curriculum, teaching assignments, or channels that prevent safe
  cleanup.

Special rule:
- `hodId` is nullable to resolve creation/deletion cycles, but normal business
  rules should treat an active department as requiring a valid HOD where product
  flows need one.

### Programs

Blockers:
- enrolled classes.

Future hard-delete notes:
- program curriculum can cascade.
- program channels require careful channel/post notification handling.

### Classes

Blockers:
- enrolled students.
- active teaching assignments.

Special rule:
- `crId` is nullable to resolve creation/deletion cycles, but CR business rules
  must prevent cross-class CR assignment.

### Courses

Blockers:
- present in program curriculum.
- active class-course assignment.
- referenced by course channels.

## Documentation and Source Material

`pulled-docs/` remains imported source material only. This document is the
canonical policy for this branch. When source material and this document differ,
this document wins.

