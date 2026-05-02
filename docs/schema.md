# **UniConnect ERD Visualization using eraser.io**

## Erasor.io Syntax Explanation

### 1. Entity Definition

Entities (tables) are declared by stating the entity name followed by a block enclosed in curly braces `{ }`.

* **Attributes:** Inside the block, list the attribute name followed by its data type.
* **Keys:** Append `PK` to denote a Primary Key or `FK` to denote a Foreign Key after the data type.

### 2. Relationship Syntax

Relationships are defined by placing an operator between two entity attributes (usually the Primary Key of one and the Foreign Key of the other). The operator determines the **cardinality**.

**The "Pointy End" Rule:**
The pointed side of the bracket always represents the **"One"** side of the relationship.

* **`One-to-Many (<)`**: The left side is "One", the right side is "Many".
* Syntax: `EntityA.id < EntityB.ref_id`


* **`Many-to-One (>)`**: The left side is "Many", the right side is "One".
* Syntax: `EntityA.ref_id > EntityB.id`


* **`One-to-One (-)`**: A standard hyphen represents a strict one-to-one relationship.
* Syntax: `EntityA.id - EntityB.ref_id`


* **`Many-to-Many (<>)`**: Brackets opening outward on both sides represent a many-to-many relationship.
* Syntax: `EntityA.id <> EntityB.id`

### 3. Global Configuration

Directives at the top of the file (like `colorMode`, `notation`, or `typeface`) apply visual styling globally to the entire diagram and do not affect the data structure.

### 4. Comments

Comments can be written using `//`. Only single line comments are allowed.

---

## **Visualization Code**

```eraser
title UniConnect ERD
colorMode pastel
styleMode shadow
typeface clean
notation chen

departments {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  name VARCHAR(100) // UNIQUE NOT NULL
  code VARCHAR(20) // UNIQUE NOT NULL

  hod_id INTEGER FK // UNIQUE. Enforce NOT NULL in application layer. Can't enforce in DB due to chicken-egg problem.

  server_id INTEGER FK // UNIQUE NOT NULL
}

departments.hod_id - teachers.teacher_id // ON DELETE RESTRICT
departments.server_id - servers.id // ON DELETE RESTRICT

// lookup table
disciplines {
  value VARCHAR(50) PK // CHECK value is in snake_case
  label VARCHAR(100) // NOT NULL
}

programs {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  department_id INTEGER FK // NOT NULL
  discipline VARCHAR(50) FK // NOT NULL 
  degree_level VARCHAR(50) FK // NOT NULL CHECK degree_level IN ('bachelors', 'masters', 'phd')

  program_director_id INTEGER FK // NOT NULL

  total_semesters INTEGER // NOT NULL // CHECK semesters > 0
  code VARCHAR(20) // NOT NULL UNIQUE

  // UNIQUE(department_id, discipline, degree_level)
}

// One department can have many programs
departments.id < programs.department_id // ON DELETE RESTRICT

// One degree level in a program can be offered in many disciplines
programs.discipline < disciplines.value // ON DELETE RESTRICT ON UPDATE CASCADE

// One program can have only one director
programs.program_director_id - teachers.teacher_id // ON DELETE RESTRICT

program_curricula {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  program_id INTEGER FK  // NOT NULL
  course_id INTEGER FK  // NOT NULL
  semester_number INTEGER  // NOT NULL. CHECK (1 <= semester_number <= programs.semesters) enforced by trigger trg_fn_validate_curriculum_semester
  batch_year INTEGER  // NOT NULL (admission year this applies to)
  // UNIQUE(program_id, course_id, batch_year)
}

program_curricula.program_id > programs.id // ON DELETE CASCADE
program_curricula.course_id > courses.id // ON DELETE RESTRICT

// lookup table
user_types {
  value VARCHAR(50) PK // CHECK value IN ('student', 'teacher', 'admin')
  label VARCHAR(100) // NOT NULL
  description VARCHAR(500)
}

users {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  full_name VARCHAR(100) // NOT NULL
  personal_email VARCHAR(255) // NOT NULL UNIQUE
  university_email VARCHAR(255)
  phone VARCHAR(20) // NOT NULL
  password_hash VARCHAR(255) // NOT NULL

  gender VARCHAR(10) // NOT NULL CHECK (gender IN ('male', 'female'))
  profile_picture_url TEXT
  bio varchar(1000)

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK // Required when is_deleted → TRUE. Cleared by trigger trg_fn_sync_delete_state when is_deleted → FALSE.
  deleted_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_delete_state when is_deleted → TRUE. Cleared when is_deleted → FALSE.

  created_at TIMESTAMPTZ // DEFAULT NOW()
  updated_at TIMESTAMPTZ // Stamped by trigger trg_fn_stamp_updated_at on every UPDATE.

  // UNIQUE (university_email) WHERE is_deleted = false
}

users.deleted_by > users.id // ON DELETE SET NULL

user_type_assignments {
  user_id INTEGER PK FK
  type VARCHAR(50) PK FK
}

users.id < user_type_assignments.user_id // ON DELETE CASCADE
user_types.value < user_type_assignments.type // ON DELETE RESTRICT ON UPDATE CASCADE

// Extension table For users who have student type
students {
  student_id INTEGER PK FK
  class_id INTEGER FK // NOT NULL
  roll_number VARCHAR(100) // UNIQUE NOT NULL
}

students.student_id - users.id // ON DELETE CASCADE
students.class_id > classes.id // ON DELETE RESTRICT

// lookup table
designations {
  value VARCHAR(50) PK
  label VARCHAR(100)
  description VARCHAR(500)
}

// Extension table for users who have teacher type
teachers {
  teacher_id INTEGER PK FK
  designation VARCHAR(50) FK // NOT NULL
  department_id INTEGER FK // NOT NULL
  // Add more fields as required
}

teachers.teacher_id - users.id // ON DELETE CASCADE
teachers.department_id > departments.id
teachers.designation > designations.value // ON DELETE RESTRICT ON UPDATE CASCADE

classes {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  program_id INTEGER FK // NOT NULL
  current_semester INTEGER // NOT NULL. CHECK (1 <= current_semester <= programs.semesters)
  section VARCHAR(1) // NOT NULL CHECK section IN ('A', 'B')

  cr_id INTEGER FK // UNIQUE. Cannot set NOT NULL due to chicken-egg problem with students.class_id. Enforce NOT NULL in application layer. Cross-class membership enforced by trigger trg_fn_validate_cr_membership (fires on UPDATE OF cr_id, skipped when cr_id IS NULL).

  academic_year INTEGER // NOT NULL. Represents current year
  admission_year INTEGER // NOT NULL. Represents the year this batch was admitted

  server_id INTEGER FK // UNIQUE NOT NULL

  // UNIQUE (program_id, current_semester, section, admission_year)
}

classes.cr_id - students.student_id // ON DELETE RESTRICT
classes.program_id > programs.id // ON DELETE RESTRICT

// Class must have only one server
classes.server_id - servers.id // ON DELETE RESTRICT

societies {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // NOT NULL
  description varchar(1000)

  department_id INT FK // NOT NULL
  president_id INT FK // NOT NULL
  convenor_id INT FK // NOT NULL
  server_id INT FK // UNIQUE NOT NULL

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK // Required when is_deleted → TRUE. Cleared by trigger trg_fn_sync_delete_state when is_deleted → FALSE.
  deleted_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_delete_state when is_deleted → TRUE. Cleared when is_deleted → FALSE.

  // UNIQUE ('name') WHERE is_deleted = false

  created_at TIMESTAMPTZ // DEFAULT NOW()
}

// One department can contain many societies
// One society can be in only one department
societies.department_id > departments.id // ON DELETE RESTRICT

// One Society can have only one president which must be a student
societies.president_id - students.student_id // ON DELETE RESTRICT

// One Society can have only one convenor which must be a teacher
societies.convenor_id - teachers.teacher_id // ON DELETE RESTRICT

// Society must have only one server
societies.server_id - servers.id // ON DELETE RESTRICT

societies.deleted_by > users.id // ON DELETE SET NULL

// lookup table
server_types {
  value VARCHAR(50) PK
  label VARCHAR(100) // NOT NULL
  description VARCHAR(500)
}

servers {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // NOT NULL
  description TEXT
  icon_url TEXT

  type VARCHAR(50) FK // NOT NULL

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK // Required when is_deleted → TRUE. Cleared by trigger trg_fn_sync_delete_state when is_deleted → FALSE.
  deleted_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_delete_state when is_deleted → TRUE. Cleared when is_deleted → FALSE.

  created_by INTEGER FK
  created_at TIMESTAMPTZ // DEFAULT NOW()
}

servers.type - server_types.value // ON DELETE RESTRICT ON UPDATE CASCADE
servers.created_by > users.id // ON DELETE SET NULL
servers.deleted_by > users.id // ON DELETE SET NULL

// lookup table
channel_types {
  value VARCHAR(50) PK
  label VARCHAR(100) // NOT NULL
  description VARCHAR(500)
}

channels {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // NOT NULL
  description varchar(200)

  type VARCHAR(50) FK // NOT NULL

  server_id INTEGER FK // NOT NULL
 
  // For course channels (in class server) 
  course_id INT FK

  // For program channels (in department server)
  program_id INT FK

  // CHECK (
  // (type = 'course' AND course_id IS NOT NULL AND program_id IS NULL) OR
  // (type = 'program' AND program_id IS NOT NULL AND course_id IS NULL) OR
  // (type IN ('announcement', 'general') AND course_id IS NULL AND program_id IS NULL))

  is_locked BOOLEAN // DEFAULT FALSE
  locked_by INTEGER FK // Required when is_locked → TRUE. Cleared by trigger trg_fn_sync_lock_state when is_locked → FALSE.
  locked_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_lock_state when is_locked → TRUE. Cleared when is_locked → FALSE.

  is_archived BOOLEAN // DEFAULT FALSE
  archived_by INTEGER FK // Required when is_archived → TRUE. Cleared by trigger trg_fn_sync_archive_state when is_archived → FALSE.
  archived_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_archive_state when is_archived → TRUE. Cleared when is_archived → FALSE.

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK // Required when is_deleted → TRUE. Cleared by trigger trg_fn_sync_delete_state when is_deleted → FALSE.
  deleted_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_delete_state when is_deleted → TRUE. Cleared when is_deleted → FALSE.

  is_auto_created BOOLEAN // DEFAULT FALSE
  created_by INTEGER FK
  created_at TIMESTAMPTZ // DEFAULT NOW()
  
  // UNIQUE(server_id, name) WHERE is_deleted = false;
}

channels.type - channel_types.value // ON DELETE RESTRICT ON UPDATE CASCADE

// One server can contain many channels
// One channel can be in only one server
channels.server_id > servers.id // ON DELETE RESTRICT
channels.course_id - courses.id // ON DELETE RESTRICT
channels.program_id - programs.id // ON DELETE CASCADE 

channels.locked_by > users.id // ON DELETE SET NULL
channels.deleted_by > users.id // ON DELETE SET NULL
channels.created_by > users.id // ON DELETE SET NULL

channels.archived_by > users.id // ON DELETE SET NULL

// Associative entity for server members as this is a many to many relationship 
server_memberships {
  user_id PK FK
  server_id PK FK

  joined_at TIMESTAMPTZ // DEFAULT NOW()
  is_auto_joined BOOLEAN // DEFAULT FALSE
}

users.id < server_memberships.user_id // ON DELETE CASCADE
servers.id < server_memberships.server_id // ON DELETE CASCADE

// Track user requests to join societies
society_membership_requests {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  society_id INTEGER FK  // NOT NULL
  user_id INTEGER FK  // NOT NULL

  status VARCHAR(20)  // CHECK status IN ('pending', 'approved', 'rejected')

  requested_at TIMESTAMPTZ  // DEFAULT NOW()

  is_reviewed BOOLEAN // DEFAULT FALSE
  reviewed_by INTEGER FK // Required when status changes to 'approved' or 'rejected'. Validated by trigger trg_fn_stamp_review_state.
  reviewed_at TIMESTAMPTZ // Stamped by trigger trg_fn_stamp_review_state when status → 'approved' or 'rejected'.

  // UNIQUE(society_id, user_id) WHERE status IN ('pending', 'approved')
}

society_membership_requests.society_id > societies.id // ON DELETE CASCADE
society_membership_requests.user_id > users.id // ON DELETE CASCADE
society_membership_requests.reviewed_by > users.id // ON DELETE SET NULL

courses {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  title VARCHAR(100) // NOT NULL
  code VARCHAR(50) // UNIQUE NOT NULL
  credit_hours INTEGER // NOT NULL

  department_id INTEGER FK // NOT NULL
}

// One department offers many courses in its programs
courses.department_id > departments.id // ON DELETE CASCADE

// Associative Entity
course_assignments {
  teacher_id INTEGER PK FK
  course_id INTEGER PK FK
  class_id INTEGER PK FK
}

// One teacher can teach many courses to many classes
course_assignments.teacher_id > teachers.teacher_id // ON DELETE RESTRICT
course_assignments.course_id > courses.id // ON DELETE RESTRICT
course_assignments.class_id > classes.id // ON DELETE RESTRICT

posts {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY
  public_id UUID // NOT NULL DEFAULT uuidv7()

  title VARCHAR(100) // NOT NULL
  content TEXT // NOT NULL

  channel_id INTEGER FK // NOT NULL

  priority VARCHAR(50) // DEFAULT normal CHECK priority IN ('normal', 'important', 'urgent')

  is_pinned BOOLEAN // DEFAULT FALSE
  pinned_by INTEGER FK // Required when is_pinned → TRUE. Cleared by trigger trg_fn_sync_pin_state when is_pinned → FALSE.
  pinned_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_pin_state when is_pinned → TRUE. Cleared when is_pinned → FALSE.

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK // Required when is_deleted → TRUE. Cleared by trigger trg_fn_sync_delete_state when is_deleted → FALSE.
  deleted_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_delete_state when is_deleted → TRUE. Cleared when is_deleted → FALSE.
  
  created_by INTEGER FK // NOT NULL
  created_at TIMESTAMPTZ // DEFAULT NOW()
  
  is_edited BOOLEAN // DEFAULT FALSE
  edited_by INTEGER FK // Required when is_edited → TRUE. Cleared by trigger trg_fn_sync_edit_state when is_edited → FALSE.
  edited_at TIMESTAMPTZ // Stamped by trigger trg_fn_sync_edit_state when is_edited → TRUE. Cleared when is_edited → FALSE.
}

posts.created_by > users.id // ON DELETE RESTRICT
posts.channel_id > channels.id // ON DELETE CASCADE

posts.deleted_by > users.id // ON DELETE SET NULL
posts.edited_by > users.id // ON DELETE SET NULL

posts.pinned_by > users.id // ON DELETE SET NULL

// lookup table
post_attachment_types {
  value VARCHAR(150) PK // NOT NULL. MIME types
  label VARCHAR(100) // NOT NULL
  max_size_bytes INTEGER // NOT NULL
}

post_attachments {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  post_id INTEGER FK // NOT NULL

  attachment_url TEXT // NOT NULL

  type VARCHAR(150) FK // NOT NULL 

  // Enforce max attachment count (e.g., 5) at application layer

  uploaded_at TIMESTAMPTZ // DEFAULT NOW()
}

// One post can have many attachments
post_attachments.post_id > posts.id // ON DELETE CASCADE

post_attachments.type > post_attachment_types.value // ON DELETE RESTRICT ON UPDATE CASCADE

// RBAC Model Design

// The user_roles/permissions/user_role_permissions tables are exclusively for configurable platform roles — things like moderators, where the capability set could reasonably be adjusted without a code deployment, and where the same role applies to many different scopes. These are capabilities within the communication layer. They can be assigned to many users, scoped to servers or channels, and can expire. The scope is always a communication entity.

// Academic role permissions are not stored in the database at all. They are hard-coded business rules in service layer derived from functional requirements. The entity ownership columns (departments.hod_id, programs.program_director_id, etc.) are source of truth for who holds those roles — not the user_roles or user_role_permissions tables.

user_roles {
  value VARCHAR(50) PK
  label VARCHAR(100) // NOT NULL
  description VARCHAR(500)
}

permissions {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  action TEXT // NOT NULL
  resource TEXT // NOT NULL

  // UNIQUE(action, resource)
}

user_role_permissions {
  role varchar(50) PK FK
  permission_id INTEGER PK FK
}

user_role_permissions.role > user_roles.value // ON DELETE CASCADE ON UPDATE CASCADE
user_role_permissions.permission_id > permissions.id // ON DELETE CASCADE

// Capture platform-specific configurable role assignments
user_role_assignments {
  id INTEGER PK // GENERATED ALWAYS AS IDENTITY

  user_id INTEGER FK // NOT NULL
  role VARCHAR(50) FK // NOT NULL

  // Scope
  server_id INTEGER FK
  channel_id INTEGER FK

  // CHECK ((server_id IS NULL AND channel_id IS NOT NULL) OR (channel_id IS NULL AND server_id IS NOT NULL))

  assigned_by INTEGER FK
  assigned_at TIMESTAMPTZ // NOT NULL DEFAULT NOW()
  expires_at TIMESTAMPTZ // NULL = permanent

  // Unique role assignment per user per role per (server, channel) combination
  // UNIQUE NULLS NOT DISTINCT (user_id, role, server_id, channel_id)
}

user_role_assignments.user_id > users.id // ON DELETE CASCADE
user_role_assignments.role > user_roles.value // ON DELETE CASCADE ON UPDATE CASCADE
user_role_assignments.server_id > servers.id // ON DELETE CASCADE
user_role_assignments.channel_id > channels.id // ON DELETE CASCADE
user_role_assignments.assigned_by > users.id // ON DELETE SET NULL

// lookup table
notification_types {
  value VARCHAR(50) PK
  label VARCHAR(100) // NOT NULL
}

notifications {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  title VARCHAR(200) // NOT NULL
  message TEXT

  type VARCHAR(50) FK // NOT NULL

  user_id INTEGER FK // NOT NULL

  post_id INTEGER FK 
  
  read_at TIMESTAMPTZ
  created_at TIMESTAMPTZ // DEFAULT NOW()
}

notifications.type - notification_types.value // ON DELETE CASCADE ON UPDATE CASCADE
notifications.user_id > users.id // ON DELETE CASCADE
notifications.post_id > posts.id // ON DELETE CASCADE

notification_preferences {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  user_id INTEGER FK // NOT NULL

  scope VARCHAR(20) // CHECK scope IN ('server', 'channel')

  server_id INTEGER FK
  channel_id INTEGER FK

  // CONSTRAINT: CHECK (
    // (scope='server' AND server_id IS NOT NULL AND channel_id IS NULL) OR
    // (scope='channel' AND channel_id IS NOT NULL AND server_id IS NULL)
  // )

  is_subscribed BOOLEAN // DEFAULT TRUE

  updated_at TIMESTAMPTZ // DEFAULT NOW(). Stamped by trigger trg_fn_stamp_updated_at when is_subscribed changes.

  // UNIQUE(user_id, scope_type, server_id, channel_id NULLS NOT DISTINCT)
}

notification_preferences.user_id > users.id // ON DELETE CASCADE
notification_preferences.server_id > servers.id // ON DELETE CASCADE
notification_preferences.channel_id > channels.id // ON DELETE CASCADE

refresh_tokens {
  id PK // INTEGER GENERATED ALWAYS AS IDENTITY

  user_id INTEGER FK  // NOT NULL

  token_hash VARCHAR(255)  // NOT NULL UNIQUE
  
  expires_at TIMESTAMPTZ  // NOT NULL
  created_at TIMESTAMPTZ  // DEFAULT NOW()
  revoked_at TIMESTAMPTZ
}

refresh_tokens.user_id > users.id // ON DELETE CASCADE
```

---

## **Indexes**

> Unique, PK, and FK constraints implicitly create indexes in Postgres and are documented in the migration files, not here. This section covers only explicit performance indexes.
>
> Partial indexes use `WHERE is_deleted = false` throughout to exclude soft-deleted rows — this keeps the index small and matches the WHERE clause all live-data queries use.

### `programs`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_programs_department_id` | `department_id` | — | Listing all programs offered by a department |
| `idx_programs_program_director_id` | `program_director_id` | — | Looking up which programs a teacher directs |

### `users`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_users_public_id` | `public_id` | — | External-facing identifier used in API routes and audit references. No partial filter — deleted users may still be referenced by other entities (posts, notifications) and must be resolvable. |

### `user_type_assignments`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_user_type_assignments_type` | `type` | — | Finding all users of a given type (e.g., all students, all teachers) |

### `students`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_students_class_id` | `class_id` | — | Loading all students in a class (roster, CR validation) |

### `teachers`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_teachers_department_id` | `department_id` | — | Listing all teachers in a department |

### `classes`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_classes_public_id` | `public_id` | — | External-facing identifier used in API routes |

### `societies`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_societies_public_id` | `public_id` | `is_deleted = false` | External-facing lookup, active societies only |
| `idx_societies_department_id` | `department_id` | `is_deleted = false` | Listing active societies under a department |
| `idx_societies_president_id` | `president_id` | `is_deleted = false` | Finding which active society a student presides over |
| `idx_societies_convenor_id` | `convenor_id` | `is_deleted = false` | Finding which active society a teacher convenes |

### `servers`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_servers_public_id` | `public_id` | `is_deleted = false` | External-facing lookup, active servers only |
| `idx_servers_type` | `type` | `is_deleted = false` | ⚠️ Low cardinality (~3 values). Planner will likely prefer a seq scan for common types. Monitor with EXPLAIN ANALYZE and drop if unused. |

### `channels`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_channels_public_id` | `public_id` | `is_deleted = false` | External-facing lookup, active channels only |
| `idx_channels_server_id_course_id` | `server_id, course_id` | `is_deleted = false AND type = 'course'` | Loading course channels for a class server |
| `idx_channels_server_id_program_id` | `server_id, program_id` | `is_deleted = false AND type = 'program'` | Loading program channels for a department server |
| `idx_channels_type` | `type` | `is_deleted = false` | Filtering channels by type within a server |

### `server_memberships`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_server_memberships_server_id` | `server_id` | — | Loading all members of a server. PK covers `(user_id, server_id)` so `user_id`-first lookups are already indexed. |

### `society_membership_requests`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_society_membership_requests_society_id_is_reviewed` | `society_id, is_reviewed` | `is_reviewed = false` | Society admin view: pending requests awaiting review |
| `idx_society_membership_requests_user_id` | `user_id` | — | Student view: "show me all my requests". Without this, any `WHERE user_id = $1` is a seq scan. |

### `courses`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_courses_department_id` | `department_id` | — | Listing all courses offered by a department |

### `course_assignments`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_course_assignments_teacher_id` | `teacher_id` | — | Loading a teacher's assigned courses. PK covers `(teacher_id, course_id, class_id)` so this may be redundant — the PK index already supports teacher_id-first lookups. |

### `posts`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_posts_public_id` | `public_id` | `is_deleted = false` | External-facing lookup, active posts only |
| `idx_posts_channel_id_priority` | `channel_id, priority` | `is_deleted = false` | Filtering posts by priority within a channel (important/urgent) |
| `idx_posts_channel_id_created_at` | `channel_id, created_at` | `is_deleted = false` | Paginated post feed ordered by time |
| `idx_posts_channel_id_is_pinned` | `channel_id` | `is_deleted = false AND is_pinned = true` | Pinned posts are loaded on every channel open as they should be shown on top of the channel. |

### `post_attachments`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_post_attachments_post_id` | `post_id` | — | Loading all attachments for a post |

### `user_role_assignments`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_user_role_assignments_server_id` | `server_id` | — | Loading all role assignments scoped to a server |
| `idx_user_role_assignments_channel_id` | `channel_id` | — | Loading all role assignments scoped to a channel |

### `notifications`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_notifications_post_id_user_id` | `post_id, user_id` | — | Checking if a user has a notification for a specific post |
| `idx_notifications_user_id_created_at` | `user_id, created_at` | — | Paginated notification feed (all notifications) for a user |
| `idx_notifications_unread_by_user` | `user_id, created_at` | `read_at IS NULL` | Unread notification feed and unread count queries. Same columns as above — both are kept because the partial index is significantly smaller and faster for pure unread queries. |

### `refresh_tokens`
| Index | Columns | Partial | Rationale |
|---|---|---|---|
| `idx_refresh_tokens_user_id_expires_at_revoked_at` | `user_id, expires_at, revoked_at` | — | Finding valid (non-expired, non-revoked) tokens for a user during refresh |