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
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  name VARCHAR(100) // UNIQUE NOT NULL
  code VARCHAR(20) // UNIQUE NOT NULL

  hod_id INTEGER FK // UNIQUE Enforce NOT NULL in application layer. Can't enforce in DB due to chicken egg problem.

  server_id INTEGER FK // UNIQUE NOT NULL
}

departments.hod_id - teachers.teacher_id // ON DELETE RESTRICT
departments.server_id - servers.id // ON DELETE RESTRICT

programs {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  department_id INTEGER FK // NOT NULL
  discipline TEXT // NOT NULL enum ['computer_science', 'software_engineering', ...]
  degree_level TEXT // NOT NULL enum ['bachelors', 'masters', 'phd']

  program_director_id INTEGER FK // NOT NULL

  semesters INTEGER // NOT NULL
  code VARCHAR(20) // NOT NULL UNIQUE

  // UNIQUE(department_id, discipline, degree_level)
}

programs.program_director_id - teachers.teacher_id // ON DELETE RESTRICT

// One department can have many programs
departments.id < programs.department_id // ON DELETE RESTRICT

program_curricula {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  program_id INTEGER FK  // NOT NULL
  course_id INTEGER FK  // NOT NULL
  semester_number INTEGER  // NOT NULL CHECK (1 <= semester_number <= programs.semesters) - enforce at application layer
  batch_year INTEGER  // NOT NULL (admission year this applies to)
  // UNIQUE(program_id, course_id, semester_number, batch_year)
}

program_curricula.program_id > programs.id // ON DELETE CASCADE
program_curricula.course_id > courses.id // ON DELETE RESTRICT

users {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  full_name VARCHAR(100) // NOT NULL
  email VARCHAR(255) // NOT NULL UNIQUE
  phone VARCHAR(20) // NOT NULL
  password_hash VARCHAR(255) // NOT NULL

  gender VARCHAR(10) // NOT NULL enum ['male', 'female']
  profile_picture_url TEXT
  bio varchar(1000)

  type VARCHAR(20) // NOT NULL enum ['student', 'teacher', 'admin']
  department_id INTEGER FK // CHECK (type = 'admin' AND department_id IS NULL)

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK
  deleted_at TIMESTAMPTZ // Populate when is_deleted becomes true

  created_at TIMESTAMPTZ // DEFAULT NOW()
  updated_at TIMESTAMPTZ // Populate when something is updated
}

// One department can have many users.
// One user can be in only one department
departments.id < users.department_id // ON DELETE RESTRICT

users.deleted_by > users.id // ON DELETE SET NULL

// For users who have student role
students {
  student_id INTEGER PK FK
  class_id INTEGER FK // NOT NULL
  roll_number INTEGER // UNIQUE NOT NULL
}

students.student_id - users.id // ON DELETE CASCADE
students.class_id > classes.id // ON DELETE RESTRICT

teachers {
  teacher_id INTEGER PK FK
  designation VARCHAR(100) // NOT NULL
  // Add more fields as required
}

teachers.teacher_id - users.id // ON DELETE CASCADE

classes {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  program_id INTEGER FK // NOT NULL
  current_semester INTEGER // NOT NULL. CHECK (current_semester >= 1 AND current_semester <= program.semesters) must be enforced at application layer as PG CHECK cannot reference other tables.
  section VARCHAR(1) // NOT NULL enum['a', 'b']

  cr_id INTEGER FK // UNIQUE cannot set NOT NULL constraint due to chicken-egg prob. Enforce NOT NULL in application layer.

  academic_year INTEGER // NOT NULL. Represents current year
  admission_year INTEGER // NOT NULL. Represents the year this batch was admitted

  server_id INTEGER FK // UNIQUE NOT NULL

  // Constraint CHECK (cr belongs to this class)
  // UNIQUE (program_id, current_semester, section, admission_year)
}

classes.cr_id - students.student_id // ON DELETE RESTRICT
classes.program_id > programs.id // ON DELETE RESTRICT

// Class must have only one server
classes.server_id - servers.id // ON DELETE RESTRICT

societies {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // UNIQUE NOT NULL
  description varchar(1000)

  department_id INT FK // NOT NULL
  president_id INT FK // NOT NULL
  convenor_id INT FK // NOT NULL
  server_id INT FK // UNIQUE NOT NULL

  is_active BOOLEAN // DEFAULT TRUE
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

servers {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // NOT NULL
  description TEXT
  icon_url TEXT

  type VARCHAR(50) // NOT NULL enum ['department', 'class', 'society']

  is_active BOOLEAN // DEFAULT TRUE
  created_by INTEGER FK
  created_at TIMESTAMPTZ // DEFAULT NOW()
}

servers.created_by > users.id // ON DELETE SET NULL

channels {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  name VARCHAR(100) // NOT NULL
  description varchar(200)
  type VARCHAR(50) // NOT NULL enum ['announcements', 'course', 'general', 'program']

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
  locked_by INTEGER FK
  locked_at TIMESTAMPTZ // Populate when is_locked becomes true

  is_archived BOOLEAN // DEFAULT FALSE
  archived_by INTEGER FK
  archived_at TIMESTAMPTZ // Populate when is_archived becomes true

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK
  deleted_at TIMESTAMPTZ // Populate when is_deleted becomes true

  is_auto_created BOOLEAN // DEFAULT FALSE
  created_by INTEGER FK
  created_at TIMESTAMPTZ // DEFAULT NOW()
  
  // UNIQUE(server_id, name)
}

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
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  society_id INTEGER FK  // NOT NULL
  user_id INTEGER FK  // NOT NULL

  status VARCHAR(20)  // enum ['pending', 'approved', 'rejected']

  requested_at TIMESTAMPTZ  // DEFAULT NOW()
  reviewed_by INTEGER FK
  reviewed_at TIMESTAMPTZ // Populate when status changes

  // UNIQUE(society_id, user_id)
}

society_membership_requests.society_id > societies.id // ON DELETE CASCADE
society_membership_requests.user_id > users.id // ON DELETE CASCADE
society_membership_requests.reviewed_by > users.id // ON DELETE SET NULL

courses {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

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
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  title VARCHAR(100) // NOT NULL
  content TEXT // NOT NULL

  channel_id INTEGER FK // NOT NULL

  priority VARCHAR(50) // DEFAULT normal enum ['normal', 'important', 'urgent']

  is_pinned BOOLEAN // DEFAULT FALSE
  pinned_by INTEGER FK
  pinned_at TIMESTAMPTZ // Populate when is_pinned becomes true

  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_by INTEGER FK
  deleted_at TIMESTAMPTZ // Populate when is_deleted becomes true
  
  created_by INTEGER FK // NOT NULL
  created_at TIMESTAMPTZ // DEFAULT NOW()
  
  updated_by INTEGER FK
  updated_at TIMESTAMPTZ // Populate when updated_by changes
}

posts.created_by > users.id // ON DELETE RESTRICT
posts.channel_id > channels.id // ON DELETE CASCADE

posts.deleted_by > users.id // ON DELETE SET NULL
posts.updated_by > users.id // ON DELETE SET NULL

posts.pinned_by > users.id // ON DELETE SET NULL

post_attachments {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  post_id INTEGER FK // NOT NULL

  file_url TEXT // NOT NULL
  file_type VARCHAR(50) // NOT NULL enum ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', ...]
  file_size INTEGER // NOT NULL, CHECK(file_size <= 5242880)  -- 5MB

  // Also enforce max attachment count (e.g., 5) at application layer

  uploaded_at TIMESTAMPTZ // DEFAULT NOW()
}

// One post can have many attachments
post_attachments.post_id > posts.id // ON DELETE CASCADE

roles {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  name VARCHAR(100) // NOT NULL UNIQUE enum ['hod', 'program_director' 'society_president', 'society_convenor', 'cr', 'moderator']
}

permissions {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  action TEXT // NOT NULL enum['create', 'update', 'delete', 'post', 'assign']
  resource TEXT // NOT NULL enum['channel', 'society', 'class', 'role']

  // UNIQUE(action, resource)
}

// This table will only capture what permissions each role has. The scope of permissions can be derived from the tables where those roles are used.
// For example: HOD can create/post/delete channels only in his department. Can create society and class servers only within his department. Can assign society president and convenor only for societies associated with his department
role_permissions {
  role_id INTEGER PK FK // NOT NULL
  permission_id INTEGER PK FK // NOT NULL
}

role_permissions.role_id > roles.id // ON DELETE CASCADE
role_permissions.permission_id > permissions.id // ON DELETE CASCADE

moderator_assignments {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  user_id INTEGER FK // NOT NULL
  scope_type VARCHAR(20) // NOT NULL enum ['server', 'channel']

  server_id INTEGER FK // NOT NULL Always required
  channel_id INTEGER FK

  // CONSTRAINT: CHECK (
    // (scope_type='server' AND channel_id IS NULL) OR
    // (scope_type='channel' AND server_id IS NOT NULL AND channel_id IS NOT NULL)
  // )

  // UNIQUE(user_id, server_id, channel_id NULLS NOT DISTINCT)

  assigned_by INTEGER FK
  assigned_at TIMESTAMPTZ // DEFAULT NOW()
}

moderator_assignments.user_id > users.id // ON DELETE CASCADE
moderator_assignments.server_id > servers.id // ON DELETE CASCADE
moderator_assignments.channel_id > channels.id // ON DELETE CASCADE
moderator_assignments.assigned_by > users.id // ON DELETE SET NULL

notifications {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK
  public_id UUID // NOT NULL DEFAULT uuidv7()

  title VARCHAR(200) // NOT NULL
  message TEXT

  type VARCHAR(50) // enum ['new_post', 'role_assigned']

  user_id INTEGER FK // NOT NULL

  post_id INTEGER FK 
  
  read_at TIMESTAMPTZ
  created_at TIMESTAMPTZ // DEFAULT NOW()
}

notifications.user_id > users.id // ON DELETE CASCADE
notifications.post_id > posts.id // ON DELETE CASCADE

notification_preferences {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  user_id INTEGER FK // NOT NULL

  scope_type VARCHAR(20) // enum['server', 'channel']

  server_id INTEGER FK
  channel_id INTEGER FK

  // CONSTRAINT: CHECK (
    // (scope_type='server' AND channel_id IS NULL) OR
    // (scope_type='channel' AND server_id IS NOT NULL AND channel_id IS NOT NULL)
  // )

  is_subscribed BOOLEAN // DEFAULT TRUE

  updated_at TIMESTAMPTZ // Populate on update

  // UNIQUE(user_id, scope_type, server_id, channel_id NULLS NOT DISTINCT)
}

notification_preferences.user_id > users.id // ON DELETE CASCADE
notification_preferences.server_id > servers.id // ON DELETE CASCADE
notification_preferences.channel_id > channels.id // ON DELETE CASCADE

refresh_tokens {
  id INTEGER GENERATED ALWAYS AS IDENTITY PK

  user_id INTEGER FK  // NOT NULL

  token_hash VARCHAR(255)  // NOT NULL UNIQUE
  
  expires_at TIMESTAMPTZ  // NOT NULL
  created_at TIMESTAMPTZ  // DEFAULT NOW()
  revoked_at TIMESTAMPTZ
}

refresh_tokens.user_id > users.id // ON DELETE CASCADE
```