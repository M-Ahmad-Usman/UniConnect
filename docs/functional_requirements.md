# Functional Requirements - UniConnect

**Version:** 2.1
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
| **Teacher** | HOD, Program Director, Society Convenor, Server Moderator, Channel Moderator |
| **Student** | CR, Society President, Server Moderator, Channel Moderator |

**Note:** 
- Users can have **multiple roles** simultaneously.
- Roles are **scoped** (e.g., CR of CS-7th-A, President of IEEE, Server Moderator of CS Department Server, Channel Moderator of #general).

### 2.2 Role Scope Rules

| Role | Scope Constraint | Example |
|----------|------------------|---------|
| HOD | One per department | Dr. Ali is HOD of Computer Science |
| Program Director | One per program | Dr. Sara is PD of CS program |
| Society Convenor | One per society | Mr. Ali is Convenor of IEEE |
| Society President | One per society | Hamza is President of IEEE |
| CR | One per class | Ali is CR of CS-7th-A |
| Server Moderator | Multiple allowed | User can moderate multiple servers |
| Channel Moderator | Multiple allowed | User can moderate multiple channels |

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
| Course | Course updates | #cs-301 | Assigned teacher, CR, server moderators, and assigned channel moderators |
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



#### 4.1 Authentication

| ID | Requirement |
|-------|-------------|
| FR-1 | User must be registered with necessary information by management. There will be no sign up flow for new user. |
| FR-2 | User can login with email and password (JWT tokens) |
| FR-3 | User can reset password via email link |
| FR-4 | Admin can create individual user accounts via a form |
| FR-5 | Admin can bulk-import users via CSV/Excel upload |
| FR-6 | System sends email with temporary password to newly created users |
| FR-7 | User must change temporary password on first login |
| FR-8 | Logged-in user can change their password (requires current password) |


#### 4.2 Server Management

| ID | Requirement |
|-------|-------------|
| FR-9 | Admin can create department, class, and society servers |
| FR-10 | HOD can create classes for programs offered by his department. Class server should be automatically created |
| FR-11 | HOD can create societies in his department |
| FR-12 | Society Convenor and Society president must be specified when creating a new society |
| FR-13 | Students are auto-added to their class and department servers based on their academic info |
| FR-14 | Teachers are auto-added to their department server based on academic info |
| FR-15 | Users can view list of servers they are member of |
| FR-16 | Users can browse channels within a server |
| FR-17 | Users can view the member list of servers they belong to |
| FR-18 | Member list displays user name, role badges, and profile picture |



#### 4.3 Channel Management

| ID | Requirement |
|----|-------------|
| FR-19 | Each server has a default `#announcements` channel (auto-created) |
| FR-20 | Department servers have their programs channels (auto-created) |
| FR-21 | Program channels cannot be deleted. They can be removed only by removing the program. |
| FR-22 | HOD has posting rights in all channels of his department server |
| FR-23 | Program directors have posting rights in their respective program channel in their department server. |
| FR-24 | HOD can create channels in their department server |
| FR-25 | Admin can lock/delete any channel |
| FR-26 | HOD can lock/delete channels in department server |
| FR-27 | Society Convenor/Society President can create/lock/delete channels in their managed society server |
| FR-28 | Moderators can be scoped to entire server (server-level) or specific channels (channel-level). |
| FR-29 | Server-level moderators can post in all channels of that server. |
| FR-30 | Channel-level moderators can post only in assigned channels. |
| FR-31 | HOD/Program Director can assign courses to a class for the current semester |
| FR-32 | A teacher must be assigned to each course when assigning to a class |
| FR-33 | Course channels are auto-created in the class server upon course assignment |
| FR-34 | Assigned teacher automatically gets posting rights to the course channel in class server |


#### 4.4 Posting & Announcements

| ID | Requirement |
|----|-------------|
| FR-35 | Authorized users can create posts in channels in which they are authorized |
| FR-36 | Teacher can post in only the course channels assigned to them |
| FR-37 | Posts display author info with role badge |
| FR-38 | Users can view posts in channels (sorted by date, pinned first) |
| FR-39 | Author can edit post within 24 hours (shows "Edited" badge) |
| FR-40 | Author/Admin can delete posts (soft delete) |
| FR-41 | All list views (posts, members, notifications) must support pagination |
| FR-42 | Default page size is 20 items, configurable up to 50 |


#### 4.5 Notifications

| ID | Requirement |
|----|-------------|
| FR-43 | User sees notification bell with unread count |
| FR-44 | New posts in subscribed channels trigger notifications |
| FR-45 | User can mark notifications as read |
| FR-46 | Urgent posts show prominent visual indicator |
| FR-47 | User are automatically subscribed for notifications in the servers in which they are member of. |
| FR-48 | Users can unsubscribe from notifications for whole server or individual channels. |


#### 4.6 Search & Filter

| ID | Requirement |
|----|-------------|
| FR-49 | User can search posts by title within a channel |
| FR-50 | User can filter posts by priority (Normal, Important, Urgent) |
| FR-51 | User can filter posts by date range |


#### 4.7 User Profile

| ID | Requirement |
|----|-------------|
| FR-52 | User can view their profile (name, program, semester, roles) |
| FR-53 | User can update profile picture and bio |
| FR-54 | User can view their role badges |
| FR-55 | Admin can deactivate a user account (soft deactivation) |
| FR-56 | Deactivated users cannot login but their posts and data are preserved |
| FR-57 | Admin can reactivate a previously deactivated user |


#### 4.8 Role Management

| ID | Requirement |
|----|-------------|
| FR-58 | Admin can assign any role/sub-role to users |
| FR-59 | HOD can assign CR and Program Director within their department |
| FR-60 | HOD can assign Society Convenor, Society President, Server Moderator, and Channel Moderator within their department |
| FR-61 | CR can assign Server Moderator and Channel Moderator in their class server |
| FR-62 | Society Convenor/President can assign Server Moderator and Channel Moderator in their society server |
| FR-63 | Role changes take effect immediately |

#### 4.9 Society Membership

| ID | Requirement |
|----|-------------|
| FR-64 | Students can browse societies across the university |
| FR-65 | Students can send a join request to a society |
| FR-66 | Society Convenor/President can approve or reject join requests, and the requester is notified of the decision |
| FR-67 | Society Convenor/President can manually add students to the society |
| FR-68 | Society Convenor/President can remove members from the society |
| FR-69 | When a join request is approved, the student is auto-added to the society server |

---

#### 4.10 Semester Transition

| ID | Requirement |
|----|-------------|
| FR-70 | Admin/HOD can trigger semester progression for a class |
| FR-71 | On semester progression, existing course channels are archived (read-only) |
| FR-72 | New course channels are auto-created based on curriculum or manual assignment |
| FR-73 | TEACHES assignments from previous semester are cleared; new teachers must be assigned |

#### 4.11 Admin Dashboard

| ID | Requirement |
|----|-------------|
| FR-74 | Admin can view a list of all users with filtering by type, department, and status |
| FR-75 | Admin can view system statistics (total users, servers, posts) |
| FR-76 | HOD can view all students and teachers in their department |

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
| HOD | ✅ Dept server | ✅ Dept server | ✅ Dept, class, and society servers within department | ✅ CR, PD, Convenor and President within department |
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

### 5.4 Backend Capability Contract

The backend exposes grouped boolean capabilities for permission-aware UI. Capability payloads are false by default and are used for navigation and query/action gating only; all write endpoints must still recompute authorization server-side.

| Area | Capability Highlights |
|------|----------------------|
| Global | Admin dashboard access, academic workspace access, role workspace access, user management, catalog management, class creation, society creation |
| Class Detail | Student viewing/management, course assignment/removal/replacement, semester progression, graduation, channel management, moderator assignment |
| Society Detail | Member visibility, member management, join request review, info editing, leadership changes, channel management, moderator assignment, join request submission |
| Role Workspace | Open role management, assign/revoke scoped roles, assign/revoke server and channel moderators |

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
16. **HOD** - Can assign server-level and channel-level moderators in department, class, and society servers within their department
17. **CR** - Can assign server-level and channel-level moderators in their class server
18. **Convenor/President** - Can assign server-level and channel-level moderators in their society server

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page Load Time | < 3 seconds |
| API Response | < 500ms |
| Concurrent Users | 100+ |
| Uptime | 99% |
| Browser Support | Chrome, Firefox, Edge |

---
