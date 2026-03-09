## The Core Problem
UniConnect uses soft-deletion for users, channels and posts. FK constraints (RESTRICT, CASCADE, SET NULL) only trigger on `DELETE FROM users WHERE id = ?`. Soft-delete is `UPDATE users SET is_deleted = true WHERE id = ?` — **none of the set FK rules fire**. UniConnect needs an **application-layer soft-delete policy** that mirrors the FK intent.

---

## Categorizing Every User-Referencing FK for Soft-Delete

### Category 1: BLOCK soft-delete — Reassign role first

These are RESTRICT FKs on role-holder columns. The soft-delete service must check these and reject deactivation if the user holds any of these roles:

| Referencing Column | Via Chain | App Must Do |
|---|---|---|
| `departments.hod_id` | `users → teachers → departments.hod_id` | Assign new HOD first |
| `programs.program_director_id` | `users → teachers → programs.program_director_id` | Assign new PD first |
| `societies.convenor_id` | `users → teachers → societies.convenor_id` | Assign new convenor first |
| `societies.president_id` | `users → students → societies.president_id` | Assign new president first |
| `classes.cr_id` | `users → students → classes.cr_id` | Assign new CR first |
| `course_assignments.teacher_id` | `users → teachers → course_assignments` | Reassign or remove course assignment |

### Category 2: CLEAN UP on soft-delete — Remove transient data

These mirror CASCADE FKs. The soft-delete service should delete or clean up these rows when deactivating a user:

| Table | What to do |
|---|---|
| `server_memberships` | Remove all memberships for the user |
| `moderator_assignments` (via `user_id`) | Remove user's moderator assignments |
| `society_membership_requests` (via `user_id`) | Remove pending requests |
| `notifications` | Delete or mark as irrelevant |
| `notification_preferences` | Delete preferences |
| `refresh_tokens` | Revoke all tokens (critical for security) |

### Category 3: LEAVE INTACT on soft-delete — No action needed

These mirror SET NULL audit columns. Since the user row still exists (just inactive), the FK remains valid. No action needed:

| Column |
|---|
| `channels.locked_by / archived_by / deleted_by / created_by` |
| `posts.created_by / pinned_by / deleted_by / updated_by` |
| `servers.created_by` |
| `society_membership_requests.reviewed_by` |
| `moderator_assignments.assigned_by` |

This is actually **better** than hard-delete — the audit trail is fully preserved because the user row still exists and can be JOINed for display (showing "Deactivated User" in the UI).

---

## Recommended Implementation Approach

The cleanest way to implement this is a **`deactivateUser` service function** that performs all checks and cleanup in a single database transaction:

```typescript
async function deactivateUser(userId: number): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // 1. BLOCK: Check role-holder constraints
    //    Query departments.hod_id, programs.program_director_id,
    //    societies.president_id, societies.convenor_id, classes.cr_id,
    //    course_assignments.teacher_id — if any reference this user, throw error

    // 2. CLEAN UP: Remove transient data
    //    Delete from server_memberships
    //    Delete from moderator_assignments (where user_id = userId)
    //    Delete from notification_preferences
    //    Delete from notifications
    //    Delete from society_membership_requests WHERE user_id = userId AND status = 'pending'
    //    Revoke all refresh_tokens

    // 3. DEACTIVATE
    //    UPDATE users SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
  })
}
```

This keeps FK constraints as the hard-delete safety net and the application logic as the soft-delete enforcement layer. Both follow the **same intent** — they're just enforced at different levels.

---

## Summary

### Key Takeaway: Two-Layer Strategy

| Layer | Mechanism | When |
|---|---|---|
| **Database** | FK ON DELETE constraints | Hard-delete safety net (should never happen in prod) |
| **Application** | `deactivateUser()` transaction | Normal soft-delete operations |

Both layers follow the **same intent**:
- **Role-holder columns** → Block deactivation until reassigned (app checks before `UPDATE`)
- **Transient data** (memberships, tokens, preferences) → Cleaned up in the transaction
- **Audit columns** → Left intact; the user row still exists so JOINs still work
- **Posts & content** → Preserved with the original `created_by` reference intact (FR-56)

The nullable audit columns (`locked_by`, `pinned_by`, `assigned_by`, etc.) will **never actually become NULL through soft-delete** — they only become NULL if someone runs a raw `DELETE FROM users` bypassing the application. SET NULL is the correct safety net for that scenario.