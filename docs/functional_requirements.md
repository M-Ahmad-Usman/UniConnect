# Functional Requirements - UniConnect

**Version:** 2.1 (MVP Focused)  
**Team:** Muhammad Ahmad, Awais Hanif, Wasif Ali
**Supervisor:** Mr. Nasir Mahmood | **Co-Supervisor:** Dr. Hamid Ali

---

## 1. Overview

**Purpose:** Discord-like platform for official university announcements organized into servers and channels.

**Scope:** Department of Computer Science (~1000 students, ~75 faculty)

**Platform:** Web Application (React.js)

---

## 2. User Roles & Permissions

### 2.1 Role Structure

| Type | Roles
|------|-----------|
| **Admin** | - |
| **Teacher** | HOD, Program Director, Society Convenor, Moderator |
| **Student** | CR, Society President, Moderator |

**Note:** 
- Users can have **multiple roles** simultaneously.
- Roles are **scoped** (e.g., CR of CS-7th-A, President of IEEE, Moderator of #general).

### 2.2 Role Scope Rules

| Role | Scope Constraint | Example |
|----------|------------------|---------|
| HOD | One per department | Dr. Ali is HOD of Computer Science |
| Program Director | One per program | Dr. Sara is PD of CS program |
| Society Convenor | One per society | Mr. Ali is Convenor of IEEE |
| Society President | One per society | Hamza is President of IEEE |
| CR | One per class | Ali is CR of CS-7th-A |
| Moderator | Multiple allowed | User can moderate multiple servers/channels |

---

## 3. Core Entities

### 3.1 Servers

| Type | Example | Auto-Members | Created By |
|------|---------|--------------|------------|
| Department | Computer Science | All dept students & teachers | Admin |
| Class | CS-7th-A, SE-5th-B | Students of that class | Admin, HOD |
| Society | SCS, IEEE, ACM | Manual join | Admin, HOD |

### 3.2 Channels

| Type | Purpose | Example | Who Can Post |
|------|---------|---------|--------------|
| Announcement | Official notices | #announcements | Server managers and moderators |
| Course | Course updates | #cs-301 | Assigned teacher, CR and moderator |
| General | Discussions | #general | Server managers and moderators |

### 3.3 Posts

| Field | Description |
|-------|-------------|
| Title | Max 100 characters |
| Content | Max 5000 characters (rich text) |
| Priority | Normal, Important, Urgent |
| Attachments | Images (max 3, 5MB each) |
| PostType | Announcement, Update, Event, General |

---

## 4. Functional Requirements


### 4.1 Authentication

| ID | Requirement |
|-------|-------------|
| FR-01 | User must be registered with necessary information by management. There will be no sign up flow for new user. |
| FR-02 | User can login with email and password (JWT tokens) |
| FR-03 | User can reset password via email link |

### 4.2 Server Management

| ID | Requirement |
|-------|-------------|
| FR-04 | Admin can create department, class, and society servers |
| FR-05 | HOD can create classes for programs offered by his department. Class server should be automatically created |
| FR-06 | HOD can create societies in his department |
| FR-07 | Society Convenor and Society president must be specified when creating a new society |
| FR-08 | Students are auto-added to their class and department servers based on their academic info |
| FR-09 | Teachers are auto-added to their department server based on academic info |
| FR-10 | Users can view list of servers they are member of |
| FR-11 | Users can browse channels within a server |

### 4.3 Channel Management

| ID | Requirement |
|----|-------------|
| FR-12 | Each server has a default `#announcements` channel (auto-created) |
| FR-13 | Department servers have their programs channels (auto-created) |
| FR-14 | Program channels cannot be deleted. They can be removed only by removing the program. |
| FR-15 | Course channels must be automatically created in Class Servers based on the courses assigned to the class. |
| FR-16 | Teacher must also be assigned when a course is assigned to a class |
| FR-17 | HOD has posting rights in all channels of his department server |
| FR-18 | Program directors have posting rights in their respective program channel in their department server. |
| FR-19 | HOD can create channels in their department server |
| FR-20 | Teacher can view and post in all course channels assigned to them (across servers) |
| FR-21 | Admin can lock/delete any channel |
| FR-22 | HOD can lock/delete channels in department server |
| FR-23 | Society Convenor/Society President can create/lock/delete channels in their managed society server |
| FR-24 | Moderators can be scoped to entire server (server-level) or specific channels (channel-level). |
| FR-25 | Server-level moderators can post in all channels of that server. |
| FR-26 | Channel-level moderators can post only in assigned channels. |

### 4.4 Posting & Announcements

| ID | Requirement |
|----|-------------|
| FR-27 | Authorized users can create posts in channels in which they are authorized |
| FR-28 | Teacher can post to one or multiple class servers simultaneously |
| FR-29 | Posts display author info with role badge |
| FR-30 | Users can view posts in channels (sorted by date, pinned first) |
| FR-31 | Author can edit post within 24 hours (shows "Edited" badge) |
| FR-32 | Author/Admin can delete posts (soft delete) |

### 4.5 Notifications

| ID | Requirement |
|----|-------------|
| FR-33 | User sees notification bell with unread count |
| FR-34 | New posts in subscribed channels trigger notifications |
| FR-35 | User can mark notifications as read |
| FR-36 | Urgent posts show prominent visual indicator |
| FR-37 | User can subscribe/unsubscribe from notifications from whole server or from specific channels |

### 4.6 Search & Filter

| ID | Requirement |
|----|-------------|
| FR-38 | User can search posts by title within a channel |
| FR-39 | User can filter posts by priority (Normal, Important, Urgent) |
| FR-40 | User can filter posts by date range |

### 4.7 User Profile

| ID | Requirement |
|----|-------------|
| FR-41 | User can view their profile (name, program, semester, roles) |
| FR-42 | User can update profile picture and bio |
| FR-43 | User can view their role badges |

### 4.8 Role Management

| ID | Requirement |
|----|-------------|
| FR-44 | Admin can assign any role/sub-role to users |
| FR-45 | HOD can assign sub-roles within their department (CR, Program Director, Moderators (channel and server level)) |
| FR-46 | HOD can assign Society Convenor for societies |
| FR-47 | CR can assign moderators (channel and server level) in their class server |
| FR-48 | Society Convenor/President can assign moderator (channel and server level) in their society server |
| FR-49 | Role changes take effect immediately |

---

## 5. Permissions & Responsibilites

### 5.1 Who Can Post Where

| User | Dept Server | Class Server | Society Server |
|------|-------------|--------------|----------------|
| Admin | ✅ All channels | ✅ All channels | ✅ All channels |
| HOD | ✅ All channels | ❌ | ❌ |
| Program Director | ✅ Their program channel only | ❌ | ❌ |
| Teacher | ❌ | ✅ Assigned course channels only | ❌ |
| CR | ❌ | ✅ All channels (their class) | ❌ |
| Society Convenor | ❌ | ❌ | ✅ All channels (their society) |
| Society President | ❌ | ❌ | ✅ All channels (their society) |
| Server Moderator | All channels in assigned server | All channels in assigned server | All channels in assigned server |
| Channel Moderator | ✅ Assigned channels | ✅ Assigned channels | ✅ Assigned channels |
| Student | ❌ | ❌ | ❌ |

### 5.2 Who Can Manage What

| User | Create Channels | Delete/Lock Channels | Assign Moderators | Assign Roles |
|------|-----------------|---------------------|-------------------|------------------|
| Admin | ✅ Everywhere | ✅ Everywhere | ✅ Everywhere | ✅ All roles |
| HOD | ✅ Dept server | ✅ Dept server | ✅ Dept server | ✅ CR, PD, Convenor and President within department |
| CR | ✅ Class server | ✅ Class server | ✅ Class server | ❌ |
| Society Convenor | ✅ Society server | ✅ Society server | ✅ Society server | ✅ President |
| Society President | ✅ Society server | ✅ Society server | ✅ Society server | ❌ |

### 5.3 Class Management

| User | Create Class | Assign Courses to Class & Teachers |
|------|-----------------|---------------------|
| Admin | Whole University | Whole University |
| HOD | Within Department | All programs within Department |
| Program Director | - | Only for their program |

**Class Server Creation:** Class Server must be automatically created when a class is created.

---

## 6. Business Rules

### 6.1 Account Rules
1. **One email = One account** - No duplicate registrations
2. **Auto-membership** - Students auto-join class + department servers on registration
3. **Teacher auto-membership** - Teachers auto-join department server on registration

### 6.2 Role Uniqueness Rules
4. **HOD** - Each department must have exactly one HOD (must be a teacher of that department)
5. **Program Director** - Each program must have exactly one PD (must be a teacher of that department)
6. **Society President** - Each society must have exactly one President (must be a student)
7. **Society Convenor** - Each society must have exactly one Convenor (must be a teacher)
8. **CR** - Each class (program + semester + section) must have exactly one CR (must be a student of that class)

### 6.3 Role Assignment Rules
14. **Admin** - Can assign any role to any user
15. **HOD** - Can assign CR, Program Director, Society Convenor within their department
16. **HOD** - Can assign moderators in department server
17. **CR** - Can assign moderators in their class server
18. **Convenor/President** - Can assign moderators in their society server

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page Load Time | < 3 seconds |
| API Response | < 500ms |
| Concurrent Users | 100+ |
| Uptime | 99% |
| Browser Support | Chrome, Firefox, Edge |

---