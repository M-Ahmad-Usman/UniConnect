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

DEPARTMENT {
  id SERIAL PK
  name VARCHAR(100) // UNIQUE NOT NULL
  code VARCHAR(20) // UNIQUE NOT NULL
  hod_id INT FK // UNIQUE Enforce NOT NULL in application layer
}

DEPARTMENT.hod_id - TEACHER_INFO.teacher_id

DEGREE_LEVEL {
  id SERIAL PK
  level VARCHAR(50) // UNIQUE NOT NULL enum ['Bachelors', 'Masters', 'PHD']
}

DISCIPLINE {
  id SERIAL PK
  name STRING // UNIQUE NOT NULL e.g 'Computer Science', 'Software Engineering'
}

PROGRAM {
  id SERIAL PK
  department_id INTEGER FK // NOT NULL
  discipline_id INTEGER FK // NOT NULL
  degree_level_id INTEGER FK // NOT NULL
  semesters INTEGER // NOT NULL
  code VARCHAR(20) // NOT NULL UNIQUE

  program_director_id INT FK // NOT NULL

  // UNIQUE(department_id, discipline_id, degree_level_id)
}

PROGRAM.program_director_id - TEACHER_INFO.teacher_id

// One department can have many programs
DEPARTMENT.id < PROGRAM.department_id
DISCIPLINE.id < PROGRAM.discipline_id
DEGREE_LEVEL.id < PROGRAM.degree_level_id

USER {
  id SERIAL PK
  full_name VARCHAR(100) // NOT NULL
  email VARCHAR(255) // NOT NULL UNIQUE
  password_hash VARCHAR(255) // NOT NULL
  gender VARCHAR(10) // NOT NULL enum ['male', 'female']
  profile_picture_url TEXT
  bio TEXT
  user_type VARCHAR(100) // NOT NULL enum ['Teacher', 'Student', 'Admin']
  department_id INTEGER FK // Will be NULL only for admin user type
  is_active BOOLEAN // DEFAULT TRUE
  created_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
  updated_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
}

// One department can have many users.
// One user can be in only one department
DEPARTMENT.id < USER.department_id

// For users who have student role
STUDENT_INFO {
  student_id INTEGER PK FK
  class_id INTEGER FK // NOT NULL
  admission_year INTEGER // NOT NULL
  roll_number INTEGER // UNIQUE NOT NULL
}

STUDENT_INFO.student_id - USER.id
STUDENT_INFO.class_id > CLASS.id

TEACHER_INFO {
  teacher_id INTEGER PK FK
  designation VARCHAR(100) // NOT NULL
}

TEACHER_INFO.teacher_id - USER.id

CLASS {
  id SERIAL PK
  program_id INTEGER FK // NOT NULL
  current_semester INTEGER // NOT NULL CHECK (current_semester !> program.semesters AND current_semester !< program.semesters)
  section_id INTEGER FK // NOT NULL
  cr_id INT FK // UNIQUE cannot set NOT NULL constraint due to chicken-egg prob. Enforce NOT NULL in application layer.
  // Constraint CHECK (cr belongs to this class)
  // UNIQUE (program_id, current_semester, section_id)
}

CLASS.cr_id - STUDENT_INFO.student_id

SECTION {
  id SERIAL PK
  name VARCHAR(20) // NOT NULL
}

CLASS.section_id < SECTION.id

SOCIETY {
  id SERIAL PK
  name VARCHAR(100) // UNIQUE NOT NULL
  description TEXT
  department_id INTEGER FK // NOT NULL
  president_id INT FK // NOT NULL
  convenor_id INT FK // NOT NULL
  is_active BOOLEAN // DEFAULT TRUE
  created_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
}

// One department can contain many societies
// One society can be in only one department
SOCIETY.department_id > DEPARTMENT.id
// One Society can have only one president which must be a student
SOCIETY.president_id - STUDENT_INFO.student_id

// One Society can have only one convenor which must be a teacher
SOCIETY.convenor_id - TEACHER_INFO.teacher_id

SERVER {
  id SERIAL PK
  name VARCHAR(100) // NOT NULL
  description TEXT
  type VARCHAR(50) // NOT NULL enum ['Department', 'Class', 'Society']

  // Scope reference (only one should be set based on server_type)
  department_id INTEGER FK
  class_id INTEGER FK
  society_id INTEGER FK

  // CONSTRAINT: CHECK ( 
    // (type='Department' AND department_id IS NOT NULL AND class_id IS NULL AND society_id IS NULL) OR 
    // (type='Class' AND class_id IS NOT NULL AND department_id IS NULL AND society_id IS NULL) OR
    // (type='Society' AND society_id IS NOT NULL AND department_id IS NULL AND class_id IS NULL)
  // )

  icon_url TEXT,
  is_active BOOLEAN // DEFAULT TRUE
  created_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP

  // UNIQUE (department_id, class_id, society_id)
}

SERVER.department_id - DEPARTMENT.id
SERVER.class_id -  CLASS.id
SERVER.society_id - SOCIETY.id

CHANNEL {
  id SERIAL PK
  server_id INTEGER FK // NOT NULL
  name VARCHAR(100) // NOT NULL
  description TEXT
  type VARCHAR(50) // NOT NULL enum ['announcement', 'course', 'general', 'program']

  // For course channels (in class server) 
  course_id INT FK

  // For program channels (in department server)
  program_id FK

  // For Society channels (in society type servers)
  // society_id FK // I think we don't need this as we can fetch all info of society using society_id fetched from this channel's parent society type server.

  is_locked BOOLEAN // DEfAULT FALSE
  is_deleted BOOLEAN // DEFAULT FALSE
  deleted_at TIMESTAMP
  created_at TIMESTAMP // DEfAULT CURRENT_TIMESTAMP

  // UNIQUE(server_id, name)
}

// One server can contain many channels
// One channel can be in only one server
CHANNEL.server_id > SERVER.id

// Associative entity for server members as this is a many to many relationship 
MEMBERSHIP {
  user_id PK FK
  server_id PK FK
  joined_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
  is_auto_joined BOOLEAN // DEFAULT FALSE
}

USER.id < MEMBERSHIP.user_id
SERVER.id < MEMBERSHIP.server_id

COURSE {
  id SERIAL PK
  title VARCHAR(50) // NOT NULL
  code VARCHAR(50) // NOT NULL
  credit_hours INTEGER // NOT NULL
  department_id INTEGER FK // NOT NULL

  // UNIQUE(title, code, department_id)
}

// One department offers many courses in its programs
COURSE.department_id > DEPARTMENT.id

// Associative Entity
TEACHES {
  teacher_id INTEGER PK FK
  course_id INTEGER PK FK
  class_id INTEGER PK FK
}

// One teacher can teach many courses to many classes
TEACHES.teacher_id > TEACHER_INFO.teacher_id
TEACHES.course_id > COURSE.id
TEACHES.class_id > CLASS.id

POST {
  id SERIAL PK
  author_id INTEGER FK // NOT NULL

  title VARCHAR(100) // NOT NULL
  content TEXT // NOT NULL

  type VARCHAR(50) // DEFAULT general enum ['announcement', 'update', 'event', 'general']
  priority VARCHAR(50) // DEFAULT normal enum ['normal', 'important', 'urgent']

  created_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP

  edited_at TIMESTAMP
  deleted_at TIMESTAMP
}

POST.author_id > USER.id

// Associative entity as one post can be posted in many channels (multi-server posting by teachers)
POST_CHANNEL {
  post_id PK FK
  channel_id PK FK
  pinned_in_channel BOOLEAN // Pin status can differ per channel
}

POST_CHANNEL.post_id > POST.id
POST_CHANNEL.channel_id > CHANNEL.id

POST_ATTACHMENT {
  id SERIAL PK
  post_id INTEGER FK // NOT NULL
  file_url TEXT // NOT NULL
  file_type VARCHAR(50)
  file_size INTEGER // in bytes
  uploaded_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
}

// One post can have many attachments
POST_ATTACHMENT.post_id > POST.id

ROLE {
  id SERIAL PK
  name VARCHAR(100) // NOT NULL enum ['hod', 'program_director' 'society_president', 'society_convenor', 'cr', 'moderator']
}

PERMISSIONS {
  id SERIAL PK
  name VARCHAR(100) // NOT NULL enum['post:channel', 'create:channel', 'delete:channel', 'create:society', create:department', 'create:class' 'assign:hod', 'assign:...other roles'] 
}

// This table will only capture what permissions each role has. The scope of permissions can be derived from the tables where those roles are used.
// For example: HOD can create/post/delete channels only in his department. Can create society and class servers only within his department. Can assign society president and convenor only for societies associated with his department
ROLE_PERMISSIONS {
  role_id INTEGER PK FK // NOT NULL
  permission_id INTEGER PK FK // NOT NULL
}

ROLE_PERMISSIONS.role_id > ROLE.id
ROLE_PERMISSIONS.permission_id > PERMISSIONS.id

MODERATOR_ASSIGNMENT {
  id SERIAL PK
  user_id INTEGER FK
  scope_type VARCHAR(20) // NOT NULL enum ['server' or 'channel']
  server_id INTEGER FK // NOT NULL Always required
  channel_id INTEGER FK

  // CONSTRAINT: CHECK (
    // (scope_type='server' AND channel_id IS NULL)
  // )

  // UNIQUE(user_id, server_id, channel_id)

  assigned_by INTEGER FK // NOT NULL
  assigned_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
}

MODERATOR_ASSIGNMENT.user_id > USER.id
MODERATOR_ASSIGNMENT.server_id > SERVER.id
MODERATOR_ASSIGNMENT.channel_id > CHANNEL.id
MODERATOR_ASSIGNMENT.assigned_by > USER.id

NOTIFICATION {
  id SERIAL PK
  user_id INTEGER FK // NOT NULL
  post_id INTEGER FK 
  type VARCHAR(50) // enum ['new_post', 'mention', 'role_assigned']
  title VARCHAR(200) // NOT NULL
  message TEXT
  read_at TIMESTAMP
  created_at TIMESTAMP // DEFAULT CURRENT_TIMESTAMP
}

NOTIFICATION.user_id > USER.id
NOTIFICATION.post_id > POST.id

NOTIFICATION_UNSUBSCRIBE {
  user_id INTEGER FK
  scope_type VARCHAR(20) // 'server' or 'channel'  
  server_id INTEGER FK
  channel_id INTEGER FK
  unsubscribed_at TIMESTAMP // NOT NULL
  // UNIQUE(user_id, server_id, channel_id)
}

NOTIFICATION_UNSUBSCRIBE.user_id > USER.id
NOTIFICATION_UNSUBSCRIBE.server_id > SERVER.id
NOTIFICATION_UNSUBSCRIBE.channel_id > CHANNEL.id
```