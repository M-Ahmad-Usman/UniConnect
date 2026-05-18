# UniConnect

**Project Title:** UniConnect

**University:** National Textile University

**Department:** Computer Science

**Session:** 2025-2026

**Supervisor:** Mr. Nasir Mahmood

**Co**-**Supervisor**: Dr. Hamid Ali

---

## 1. Project Understanding

### 1.1 Problem Statement

Currently, National Textile University lacks a unified digital platform for publishing official announcements, event notifications, and facilitating communication among students, faculty, and administration. Important information is scattered across multiple channels (WhatsApp groups, Facebook pages, notice boards), leading to:

- **Information Overload:** Students receive irrelevant notifications from departments they don’t belong to
- **Missed Announcements:** Critical updates about exam schedules, class cancellations, or events are often missed
- **Lack of Organization:** No centralized repository to search or filter past announcements
- **Limited Reach:** Physical notice boards and social media posts don’t guarantee visibility
- **No Event Management:** Difficult to track RSVPs and event attendance

### 1.2 Main Objectives

**Objective 1:** Develop a Discord-like communication platform with servers (departments, classes, societies) and channels for organized announcements and discussions.

**Objective 2:** Implement a fine grained role-based access control that enables authorized users (HOD, teachers, CRs etc.) to post announcements to their respective channels.

**Objective 3:** Build a responsive web application using React.js that provides real-time updates and notifications.

### 1.3 Target Users

| User Type | Role | Access Level | Primary Use Cases |
| --- | --- | --- | --- |
| **Admin** | - | University-wide | Create servers, Post official announcements, manage all users, assign roles |
| **Teacher** | Regular Teacher | Course-specific | Post class updates to enrolled students |
| | HOD (Head of Dept) | Department-wide | Post to entire department, manage teachers and classes |
| | Program Director | Program-specific | Post to specific program (CS/SE/AI) |
| | Society Convenor | Society-specific | Oversee society activities |
| | Server Moderator | Server-specific | Moderate and post across all channels in an assigned server |
| | Channel Moderator | Channel-specific | Moderate and post only in an assigned channel |
| **Student** | Regular Student | View & Interact | View announcements |
| | Class CR | Class-specific | Post announcements to their class (e.g., CS-6th Semester) |
| | Society President | Society-specific | Create society events and announcements |
| | Server Moderator | Server-specific | Moderate and post across all channels in an assigned server |
| | Channel Moderator | Channel-specific | Moderate and post only in an assigned channel |

### 1.4 Key Differentiators

**Compared to existing solutions:**

| Feature | WhatsApp Groups | Facebook Pages | Our System |
| --- | --- | --- | --- |
| Official Verification | ❌ Anyone can post | ❌ Unverified content | ✅ Role-based posting rights |
| Filtered Notifications | ❌ All messages | ❌ Algorithm-based | ✅ Department & preference-based |
| Search & Archive | ❌ Limited | ❌ Poor search | ✅ Full-text search with filters |
| University Integration | ❌ No official tie | ❌ Unofficial pages | ✅ Official university system |
| Multi-Platform | ✅ Mobile only | ✅ Mobile primary | ✅ Web + Native Mobile |

**Our system uniquely offers:**

- **Discord-like server/channel architecture** - Organized structure where each department, class, and society is a "server" with multiple channels
- **Hierarchical role-based access control** - 3 main user types (Admin, Teacher, Student) with explicit server-level and channel-level moderation roles
- **Channel-based organization** - Users browse specific channels for announcements (no information overload)
- **Role-based posting permissions** - Only authorized users can post in specific channels
- **Society participation workflow** - Students can browse societies, request membership, and receive approval/rejection notifications
- **Official badge verification** - Role-based badges for authentic announcements

---

## 2. Role Hierarchy

```
System Admin (IT Department)
│
Teacher (Faculty) - Can have multiple roles simultaneously
│   ├── Regular Teacher (course-specific)
│   ├── HOD (department-wide + user management)
│   ├── Program Director (program-specific: CS/SE/AI)
│   ├── Society Convenor
│   ├── Server Moderator (assigned server scope)
│   └── Channel Moderator (assigned channel scope)
│
Student - Can have multiple roles simultaneously
    ├── Regular Student (view & interact)
    ├── Class CR (class-specific posting)
    ├── Society President (society events)
    ├── Server Moderator (assigned server scope)
    └── Channel Moderator (assigned channel scope)
```

**Note:** A teacher can simultaneously be HOD + Program Director + Society Convenor + scoped moderator assignments. A student can be CR + Society President + scoped moderator assignments.

---

## 3. Conclusion

The University Social Community Platform addresses a critical need at National Textile University by providing a centralized, intelligent, and cross-platform communication solution. By implementing a flexible hierarchical role-based access control system with explicit server-level and channel-level moderator roles, plus smart notification filtering, the system ensures that students and faculty receive relevant information without information overload.

The unique role structure empowers department management by allowing HODs to independently manage their departments, assign sub-roles, and maintain content quality without constant Central Admin intervention. This distributed responsibility model ensures scalability and efficient administration.

The project leverages modern, industry-standard technologies and demonstrates practical application of software engineering principles including:

- Full-stack development
- Hierarchical role-based access control with flexible permissions
- Real-time systems
- Cross-platform mobile development
- Cloud deployment
- Advanced security and authentication

With a well-defined 6-month timeline, clear team responsibilities, and measurable success criteria, this project is both ambitious and achievable. The system will serve as a reusable framework that can be adapted by other universities, contributing to the broader field of institutional communication systems.

We are confident that with proper execution and guidance from Mr. Nasir Mahmood, this project will successfully enhance communication efficiency at National Textile University and serve as a strong portfolio project for all team members.

---

**Submitted By:**

Muhammad Ahmad

Wasif Ali

Awais Hanif

**Supervisor:**

Mr. Nasir Mahmood

**Co-Supervisor**:

Dr. Hamid ali

Department of Computer Science

National Textile University

---
