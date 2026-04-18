# UniConnect — Deletion Responsibility Reference

This document defines, for every entity in the system, what the database handles automatically and what the application layer is responsible for. It is derived directly from the FK constraint definitions in `add_foreign_keys.ts`.

---

## Core Principle

**DB constraints are the safety net. The application layer is the gatekeeper.**

FK constraints only fire on **hard deletes**. Since several entities use soft-deletion (`deleted_at` / `deleted_by`), the row is never actually removed, so `ON DELETE` actions never trigger. For soft-deletable entities, constraint intent must be re-implemented at the application layer.

| Scenario | Responsibility |
|---|---|
| Hard-delete of a non-soft-deletable entity | DB handles automatically via `ON DELETE` actions |
| Soft-delete of any entity | Application enforces all constraint intent manually |
| Constraint marked "CASCADE for both soft and hard delete" | Application must execute the cascade manually on soft-delete |
| Hard-delete of a soft-deletable entity | Application pre-checks, then DB handles cascades |
| Role/authority check before deletion | Application always — DB has no concept of roles |

---

## Entities with Soft-Delete

The following entities use soft-deletion. Their `ON DELETE` constraints **never fire** in normal operation.

- `users`
- `societies`
- `servers`
- `channels`
- `posts`

---

## Entity-by-Entity Breakdown

### 1. `users`

Users are the most interconnected entity in the system. They can be soft-deleted (standard deactivation) or hard-deleted (admin-only).

#### Soft-Delete

The DB does nothing. The application must perform all checks and side effects below.

**Blockers — reject the operation if any of these are true:**

| Check | Constraint |
|---|---|
| User is HOD of any department | `departments.hod_id → teachers RESTRICT` — assign a new HOD first |
| User is Program Director of any program | `programs.program_director_id → teachers RESTRICT` — assign a new director first |
| User is CR of any class | `classes.cr_id → students RESTRICT` — assign a new CR first |
| User is President of any society | `societies.president_id → students RESTRICT` — assign a new president first |
| User is Convenor of any society | `societies.convenor_id → teachers RESTRICT` — assign a new convenor first |
| User (as teacher) has active course assignments | `course_assignments.teacher_id RESTRICT` — reassign the course first |

Note: the HOD, Program Director, and Convenor blockers apply through the user's teacher profile, and the CR and President blockers apply through the user's student profile. For hard-delete, these also cause the DB cascade chain to fail automatically, but checking them upfront produces a meaningful error message.

The error response must list **all** active blockers so the admin can resolve them in a single view before retrying.

**Side effects — execute in the same transaction as the soft-delete:**

These constraints are marked CASCADE for both soft and hard deletes, so the application must apply them manually on soft-delete.

| Action | Reason |
|---|---|
| Delete `notifications` for the user | A deactivated user has no use for pending notifications |
| Delete pending `society_membership_requests` for the user | Pending requests from a deactivated user are meaningless |
| Delete `refresh_tokens` for the user | All active sessions must be invalidated immediately |

**What is intentionally left intact:**

| Table | Reason |
|---|---|
| `students` / `teachers` | Profile rows stay since the user row still physically exists; removed via CASCADE only on hard-delete |
| `user_type_assignments` | Type assignments remain — soft-delete is reversible. Authorization queries must filter by `users.is_deleted = false` when resolving active users by type |
| `server_memberships` | Membership history preserved |
| `user_role_assignments` | Soft-delete is reversible — preserved so roles are restored automatically if the user is reactivated. Authorization queries must filter `users.is_deleted = false` when resolving active role holders |
| `notification_preferences` | Preserved for potential reactivation |

---

#### Hard-Delete (admin-only)

Hard deletion is destructive and irreversible.

**Step 1 — Run all six blockers from the soft-delete section first.**

**Step 2 — Posts confirmation:**

`posts.created_by` is `RESTRICT`, so the DB will block the hard-delete if the user has authored any posts. The application must:

1. Count the user's posts across all channels.
2. Warn the admin: *"This user has authored N posts across X channels. Proceeding will permanently delete all of them."*
3. Require explicit confirmation before proceeding.
4. On confirmation, delete all of the user's posts first, then delete the user — in a single transaction. Post deletion automatically cascades to `notifications` and `post_attachments`.

> `notifications`, `society_membership_requests`, and `refresh_tokens` may already be cleared from a prior soft-delete. The hard-delete DB cascades handle any remaining rows regardless.

**What the DB handles automatically:**

| Table | Behaviour |
|---|---|
| `students` | `CASCADE` |
| `teachers` | `CASCADE` |
| `user_type_assignments` | `CASCADE` |
| `server_memberships` | `CASCADE` |
| `user_role_assignments` | `CASCADE` |
| `notifications` | `CASCADE` |
| `notification_preferences` | `CASCADE` |
| `refresh_tokens` | `CASCADE` |
| `society_membership_requests` | `CASCADE` |
| `users.deleted_by` (self-ref. Although only admin can delete) | `SET NULL` |
| `societies.deleted_by` | `SET NULL` |
| `servers.deleted_by` / `created_by` | `SET NULL` |
| `channels.deleted_by` / `created_by` / `locked_by` / `archived_by` | `SET NULL` |
| `posts.deleted_by` / `pinned_by` / `updated_by` | `SET NULL` |
| `user_role_assignments.assigned_by` | `SET NULL` |
| `society_membership_requests.reviewed_by` | `SET NULL` |

---

### 2. `user_type_assignments`

This is a junction table establishing a many-to-many relationship between `users` and `user_types`. A user can have multiple types (e.g., both Student and Teacher).

#### When a User is Deleted

User deletion (both soft and hard) automatically handles this table:

| Operation | Behaviour |
|---|---|
| Soft-delete user | No DB action — row remains, but authorization queries must filter by `users.is_deleted = false` |
| Hard-delete user | `CASCADE` — all type assignments for the user are removed automatically |

#### When a User Type is Deleted

Deleting a user type from the `user_types` table is blocked (`RESTRICT`) if any user in the system has that type assigned. The application must:

1. Count users with this type: `SELECT COUNT(*) FROM user_type_assignments WHERE type = ?`
2. Return error: *"Cannot delete this user type — N users currently have this type assigned"*
3. Admin must first reassign or delete those users before the user type can be removed

---

### 3. `teachers`

`teachers` is an extension table for users with the 'teacher' type. It is removed automatically via CASCADE when the parent user is hard-deleted. Direct teacher deletion should not be exposed as an API operation.

To delete a user who has a **Teacher** profile, the application must check:

| Check | Constraint |
|---|---|
| Teacher is HOD of any department | `departments.hod_id RESTRICT` |
| Teacher is Program Director of any program | `programs.program_director_id RESTRICT` |
| Teacher is Convenor of any society | `societies.convenor_id RESTRICT` |
| Teacher has active course assignments | `course_assignments.teacher_id RESTRICT` |

Note: `teachers.department_id` references `departments` with `ON DELETE RESTRICT`. This means a department cannot be deleted while it still has teachers — it does not mean a teacher cannot be deleted. Teacher deletion is blocked only by the four constraints above.

---

### 4. `students`

`students` is an extension table for users with the 'student' type. Same as `teachers` — removed via CASCADE on parent user hard-delete. Direct student deletion should not be exposed as an API operation.

To delete a user who has a **Student** profile, the application must check:

| Check | Constraint |
|---|---|
| Student is CR of any class | `classes.cr_id RESTRICT` |
| Student is President of any society | `societies.president_id RESTRICT` |

---

### 5. `departments`

Rare/admin-only hard-delete operation.

**Blockers:**

| Check | Constraint | App action |
|---|---|---|
| Department has programs | `programs.department_id RESTRICT` | Return list of programs; each must be cleaned up first (see chain below) |
| Department has teachers | `teachers.department_id RESTRICT` | Return teacher list; teachers must be reassigned to another department or deleted first |
| Department has societies | `societies.department_id RESTRICT` | Return list of societies; each must be moved to another department first |

> **Note on students:** Students are not directly linked to departments via a FK. They are indirectly protected through the `programs.department_id RESTRICT → classes.program_id RESTRICT → students.class_id RESTRICT` chain. You cannot delete a department that has programs, and you cannot delete a program that has enrolled classes, so students in those classes are implicitly protected. Handle students as part of the program/class cleanup chain below.

**Cleanup chain when programs exist:**

```
DELETE department
  → must first DELETE OR reassign programs to new department
      if (DELETE programs) → must first DELETE OR re-enroll classes to new programs
          if (DELETE classes) → must first DELETE students
              → must first unassign student roles (CR, Society President)
```

Each step is application-driven. The `RESTRICT` constraints enforce ordering but the application executes the sequence.

**Courses (automatic, with caveat):**

Courses owned by the department that have no active `course_assignments`, no record in `program_curricula` and not referenced by `channels` are `CASCADE` deleted automatically. Courses with active assignments, present in `program_curricula` or referenced by channels will block the cascade — the application must pre-check and require manual cleanup (remove course assignments, program_curricula assignments and course channels first).

**Server:**

`departments.server_id` is `NOT NULL` with `RESTRICT`, meaning the server cannot be deleted while the department row still references it. The department row must be deleted first to drop the reference, after which the server can be deleted. Required order (all in one transaction):

```
DELETE channels (each cascades to posts → notifications + post_attachments)
  → DELETE department (cascades to courses with no active assignments; server_id reference dropped)
      → DELETE server (cascades to server_memberships, user_role_assignments, notification_preferences)
```

#### The HOD Circular Dependency

Deleting a department requires reassigning or deleting all its teachers first (`teachers.department_id RESTRICT`). But the HOD is one of those teachers, and `departments.hod_id` is `RESTRICT` — the HOD teacher cannot be deleted while they are still HOD of that department. This creates a circular dependency: the department cannot be deleted without clearing its teachers, but the HOD teacher cannot be deleted while they are still HOD.

**Resolution:** The application must set `hod_id = NULL` before proceeding with teacher cleanup and department deletion. `departments.hod_id` is made nullable only to resolve this chicken-and-egg problem during insertion and deletion.

---

### 6. `programs`

Rare/admin-only operation.

**Blockers:**

| Check | Constraint | App action |
|---|---|---|
| Program has enrolled classes | `classes.program_id RESTRICT` | Return list of classes; each must be deleted or re-enrolled first |

**What the DB handles automatically:**

| Table | Behaviour |
|---|---|
| `program_curricula` | `CASCADE` |
| `channels` (program-type) | `CASCADE` → further cascades to `posts` → `notifications` + `post_attachments` |

---

### 7. `classes`

Rare/admin-only operation.

**Blockers:**

| Check | Constraint | App action |
|---|---|---|
| Class has enrolled students | `students.class_id RESTRICT` | Return student count; students must be deleted or moved first |
| Class has active course assignments | `course_assignments.class_id RESTRICT` | Return assignment list; assignments must be removed first |

**Server:**

Same as departments — `classes.server_id` references `servers` and does not auto-delete the server. `classes.server_id` is `NOT NULL` with `RESTRICT`, so the class row must be deleted before the server. Required order (all in one transaction):

```
DELETE channels (each cascades to posts → notifications + post_attachments)
  → DELETE class (server_id reference dropped)
      → DELETE server (cascades to server_memberships, user_role_assignments, notification_preferences)
```

#### The CR Circular Dependency

Deleting a class requires deleting or moving its students first. But the student with the CR role cannot be deleted (`classes.cr_id RESTRICT`) and cannot be moved to another class while they are CR (a CR must belong to their own class — business rule).

**Resolution:** The application must set `cr_id = NULL` before proceeding with student cleanup and class deletion. `classes.cr_id` is made nullable only to solve this chicken-and-egg problem during insertion and deletion.

---

### 8. `courses`

**Blockers:**

| Check | Constraint |
|---|---|
| Course is in a program curriculum | `program_curricula.course_id RESTRICT` |
| Course has active class assignments | `course_assignments.course_id RESTRICT` |
| Course has a channel in a class server | `channels.course_id RESTRICT` |

All three must be cleared before deletion. The application should return all active blockers in a single error response.

---

### 9. `societies`

Societies support both soft-delete and hard-delete.

#### Soft-Delete

There are no DB-constraint-derived blockers for society soft-deletion — the FK constraints on `societies.president_id` and `societies.convenor_id` protect the student and teacher from being deleted while they hold those roles, not the society from being soft-deleted. The application sets `deleted_at` and `deleted_by` directly.

Note: `president_id` and `convenor_id` are `NOT NULL`, so they cannot be nulled out — the role holders remain associated with the now-deactivated society. As a business rule, the application may choose to notify the president and convenor that the society has been deactivated.

**Side effects — execute in the same transaction:**

Soft-delete cascades through owned structural entities but stops at user-generated content:

```
Soft-delete society
  → soft-delete server
      → soft-delete channels
          → STOP — do not soft-delete posts
      → DELETE society_membership_requests where status = 'pending'
          (approved/rejected records can be kept for audit history, or deleted)
```

Posts become inaccessible naturally because their channel is soft-deleted. Any query fetching posts already filters on `channels.deleted_at IS NULL`, so posts do not need to be explicitly soft-deleted. Soft-deleting posts here would pollute the post audit trail by attributing deletion to the society lifecycle rather than a deliberate moderation action.

`user_role_assignments`, `server_memberships`, and `notification_preferences` are left intact — soft-delete is reversible, and these are restored automatically if the society is reactivated.

#### Hard-Delete

**What the DB handles automatically:**

| Table | Behaviour |
|---|---|
| `society_membership_requests` | `CASCADE` |

**Application-driven order (single transaction):**

`societies.server_id` is `NOT NULL` with `RESTRICT`, so the society row must be deleted before the server. To delete the server all channels must be deleted first so the server becomes deletable.

```
DELETE channels (each cascades to posts → notifications + post_attachments)
  → DELETE society (cascades to society_membership_requests; server_id reference dropped)
      → DELETE server (cascades to server_memberships, user_role_assignments, notification_preferences)
```

---

### 10. `servers`

Servers are owned entities — department servers, class servers, and society servers are created and deleted as part of their owning entity's lifecycle. They should not be independently deletable via the API.

#### Soft-Delete

Only triggered as a side effect of a society soft-delete. See [society](#8-societies) soft-delete.

#### Hard-Delete

Triggered as part of deleting a department, class, or society. Channels must be hard-deleted first (`channels.server_id RESTRICT`). The owning entity row (department/class/society) must be deleted before the server because the owning entity's `server_id` is `NOT NULL` with `RESTRICT`. Each channel deletion cascades to posts, notifications, and post_attachments automatically.

**What the DB handles after all channels and the owning entity are cleared:**

| Table | Behaviour |
|---|---|
| `server_memberships` | `CASCADE` |
| `user_role_assignments` | `CASCADE` |
| `notification_preferences` | `CASCADE` |
| `servers.deleted_by` / `created_by` | `SET NULL` |

---

### 11. `channels`

#### Soft-Delete

Application sets `deleted_at` and `deleted_by`. Posts inside the channel are left intact — they become inaccessible through the soft-deleted channel. No further side effects required.

#### Hard-Delete

No application pre-checks required. The DB cascade chain handles everything:

| Table | Behaviour |
|---|---|
| `posts` | `CASCADE` |
| `posts` → `notifications` | `CASCADE` (chain) |
| `posts` → `post_attachments` | `CASCADE` (chain) |
| `user_role_assignments` | `CASCADE` |
| `notification_preferences` | `CASCADE` |

---

### 12. `posts`

#### Soft-Delete

Application sets `deleted_at` and `deleted_by`. The post row remains; `created_by` is preserved so the UI can display "Deleted post by [user]". No side effects required.

#### Hard-Delete

No application pre-checks required.

| Table | Behaviour |
|---|---|
| `notifications` | `CASCADE` |
| `post_attachments` | `CASCADE` |

---

### 13. `course_assignments`

No downstream FK dependents. The DB handles nothing automatically on deletion.

**Application responsibility:** The corresponding course channel in the class server must be deleted as part of the same operation. This is a business logic concern the DB cannot enforce. Note that deleting that channel cascades automatically to its posts → notifications and post_attachments.

---

### 14. `user_roles` and `permissions`

System/seed-data managed. Deletion is an administrative concern.

| Trigger | Behaviour |
|---|---|
| Role deleted | `user_role_permissions CASCADE`, `user_role_assignments CASCADE` |
| Permission deleted | `user_role_permissions CASCADE` |

---

## Bidirectional Cascade Constraints

These constraints are marked to cascade on **both** soft and hard deletes. The DB handles the hard-delete side automatically. The application must execute these manually when performing a soft-delete.

| Constraint | Triggered by | App action |
|---|---|---|
| `notifications.user_id` | User soft-delete | Delete all notifications for the user |
| `notifications.post_id` | Post soft-delete | Delete all notifications for the post |
| `society_membership_requests.user_id` | User soft-delete | Delete all (pending) membership requests for the user |
| `refresh_tokens.user_id` | User soft-delete | Delete all refresh tokens (invalidates sessions) |

---

## Audit Columns

All `deleted_by`, `created_by`, `pinned_by`, `locked_by`, `archived_by`, `assigned_by`, `reviewed_by`, and `updated_by` columns use `SET NULL` on hard-delete of the referenced user. The record remains intact with only the actor identity nulled out. The UI must handle `null` audit columns gracefully (e.g. "Deactivated account").

No application-side handling required for these columns.

---

## Summary: Pre-Check Checklist by Operation

| Operation | Blockers | Side effects / execution order |
|---|---|---|
| **Soft-delete user** | HOD, Program Director, CR, Society President, Society Convenor, active course assignments | Delete notifications + membership requests + refresh tokens in same transaction |
| **Hard-delete user** | Same six blockers + post count warning with explicit confirmation | Delete posts first, then user — single transaction |
| **Delete department** | Has programs, has teachers, has societies, courses with active assignments | Set `hod_id = NULL` → reassign/delete teachers → clear program/class/student chain → delete channels → delete department → delete server |
| **Delete program** | Has enrolled classes | — |
| **Delete class** | Has students, has course assignments | Set `cr_id = NULL` → clear blockers → delete channels → delete class → delete server |
| **Delete course** | In a program curriculum, has active assignment, has a channel | — |
| **Soft-delete society** | None (DB-constraint-derived) | Soft-delete server → soft-delete channels (stop here, do not touch posts) + delete pending membership requests |
| **Hard-delete society** | None (DB-constraint-derived) | Delete channels → delete society → delete server |
| **Delete server** | Has channels | Delete channels first (each cascades automatically), then delete owning entity, then delete server |