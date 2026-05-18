# UniConnect API Contract Reference

**Version:** 1.2
**Backend API Version:** 1.0.0
**Last Updated:** 2026-05-18

This document provides a complete reference for all API endpoints available to the UniConnect frontend. It includes request/response examples, error handling patterns, and integration notes.

---

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication Model](#authentication-model)
3. [Response Patterns](#response-patterns)
4. [Error Handling](#error-handling)
5. [Pagination](#pagination)
6. [File Uploads](#file-uploads)
7. [Rate Limiting](#rate-limiting)
8. [Socket.IO Real-time](#socketio-real-time)
9. [API Endpoints](#api-endpoints)
   - [System](#system-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Departments](#departments-endpoints)
   - [Programs](#programs-endpoints)
   - [Disciplines](#disciplines-endpoints)
   - [Classes](#classes-endpoints)
   - [Courses](#courses-endpoints)
   - [Societies](#societies-endpoints)
   - [Roles](#roles-endpoints)
   - [Servers](#servers-endpoints)
   - [Channels](#channels-endpoints)
   - [Posts](#posts-endpoints)
   - [Notifications](#notifications-endpoints)
   - [Admin](#admin-endpoints)

---

## Base Configuration

### Backend URLs
- **Development:** `http://localhost:4000`
- **Production:** same-origin deployment is recommended

### API Base Path
All API endpoints are prefixed with `/api`

Example: `http://localhost:4000/api/users/me`

### Axios Configuration
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',  // Relative path for Vite proxy in dev and same-origin in production
  withCredentials: true,  // REQUIRED: sends httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Deployment Recommendation
- Prefer same-origin production deployment for frontend and backend.
- The backend currently issues auth cookies with `SameSite=Strict`, which fits same-origin deployment best.
- If you later choose a separate frontend and backend origin, review cookie policy, CORS, and Socket.IO configuration before implementation.

### Vite Proxy Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/api/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
```

---

## Authentication Model

### Cookie-Based Authentication
The backend uses **httpOnly cookies** for authentication. Frontend **never handles tokens directly**.

#### Cookies Set by Backend
| Cookie Name | Path | Purpose | Lifespan |
|-------------|------|---------|----------|
| `access_token` | `/api` | API authentication | 15 minutes (default) |
| `refresh_token` | `/api/auth/refresh` | Token refresh | 7 days (default) |

#### Frontend Requirements
- **Every request must include credentials:**
  ```typescript
  // axios
  axios.get('/users/me', { withCredentials: true });

  // fetch
  fetch('/api/users/me', { credentials: 'include' });
  ```

- **Backend CORS must whitelist frontend origin in development or any intentional cross-origin deployment:**
  - Dev: `http://localhost:5173` (Vite default)
  - Prod: not needed for same-origin deployment; otherwise configure via `CORS_ORIGIN` and review cookie policy

#### Public Endpoints (No Auth Required)
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/refresh` (requires `refresh_token` cookie)

#### Protected Endpoints
ALL other endpoints require a valid `access_token` cookie.

#### Token Refresh Flow
1. API request returns `401 Unauthorized`
2. Frontend axios interceptor catches 401
3. Interceptor calls `POST /api/auth/refresh`
4. Backend validates `refresh_token` cookie
5. Backend issues new `access_token` and `refresh_token` cookies
6. Interceptor retries original request with new token
7. If refresh fails (401): redirect to `/login`

**Axios Interceptor Example:**
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        authStore.clearUser();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

#### mustChangePassword Flow
After login, if `mustChangePassword === true`:
1. Backend **blocks** all routes except `/api/auth/change-password` with `403 Forbidden`
2. Frontend must redirect to `/change-password` page
3. Frontend should **not** establish a Socket.IO session until the password is changed and the user logs in again
4. After password change, backend **clears all cookies**
5. User must log in again with new password

#### Password Reset URL Exception
- The reset-password flow is the controlled exception to the “avoid sensitive data in URLs” rule.
- The reset token arrives from the email link, is read once by the reset page, and is then submitted in the request body to `POST /api/auth/reset-password`.

---

## Response Patterns

### Standard Success Response
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "Ahmad Ali",
    "email": "ahmad@ntu.edu.pk"
  },
  "message": "Login successful"
}
```

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "Post 1" },
    { "id": 2, "title": "Post 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Error Handling

### Error Response Shape
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      source: 'body' | 'params' | 'query';
    }>;
  };
}
```

### Error Codes
| Code | HTTP Status | Description | Frontend Action |
|------|-------------|-------------|-----------------|
| `VALIDATION_ERROR` | 400 | Request validation failed | Show field-level errors |
| `UNAUTHORIZED` | 401 | Missing or invalid token | Attempt refresh, redirect to login |
| `FORBIDDEN` | 403 | Insufficient permissions | Show "Access denied" message |
| `NOT_FOUND` | 404 | Resource not found | Show empty state or 404 page |
| `CONFLICT` | 409 | Resource already exists | Show conflict message (e.g., "Email already registered") |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Show cooldown message, retry after delay |
| `INTERNAL_ERROR` | 500 | Server error | Show generic error, log to error tracking |

### Validation Error Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address",
        "source": "body"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "source": "body"
      }
    ]
  }
}
```

### Frontend Error Handling Pattern
```typescript
try {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error) && error.response) {
    const apiError = error.response.data as ApiErrorResponse;

    switch (apiError.error.code) {
      case 'VALIDATION_ERROR':
        // Map validation errors to form fields
        apiError.error.details?.forEach(detail => {
          setError(detail.field, { message: detail.message });
        });
        break;

      case 'UNAUTHORIZED':
        toast.error('Invalid credentials');
        break;

      case 'RATE_LIMIT_EXCEEDED':
        toast.error('Too many attempts. Please try again later.');
        break;

      default:
        toast.error(apiError.error.message || 'An error occurred');
    }
  } else {
    toast.error('Network error. Please check your connection.');
  }
}
```

---

## Pagination

### Query Parameters
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number (1-indexed) |
| `limit` | number | 20 | 50 | Items per page |

### Example Request
```typescript
const response = await apiClient.get('/servers/1/members', {
  params: { page: 2, limit: 30 }
});

// response.data.pagination:
// { page: 2, limit: 30, total: 75, totalPages: 3 }
```

### TanStack Query Pattern
```typescript
function useServerMembers(serverId: number, page: number = 1) {
  return useQuery({
    queryKey: ['servers', serverId, 'members', { page }],
    queryFn: () => apiClient.get(`/servers/${serverId}/members`, {
      params: { page, limit: 20 }
    }),
  });
}
```

---

## File Uploads

### Constraints
- **Max file size:** 5MB per file
- **Max attachments per post:** 3 files
- **Accepted image types:** JPEG, PNG, WEBP
- **Magic byte validation:** Backend validates actual file type (cannot be spoofed)

### Multipart Form Data Example
```typescript
// Post creation with attachments
const formData = new FormData();
formData.append('title', 'Announcement Title');
formData.append('content', '<p>Content HTML</p>');
formData.append('priority', 'URGENT');

files.forEach(file => {
  formData.append('attachments', file);
});

const response = await apiClient.post(`/channels/${channelId}/posts`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

### Profile Picture Upload
```typescript
const formData = new FormData();
formData.append('profilePicture', file);

const response = await apiClient.patch('/users/me/profile-picture', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / (progressEvent.total || 1)
    );
    setUploadProgress(percentCompleted);
  },
});
```

### CSV Bulk Import
```typescript
const formData = new FormData();
formData.append('file', csvFile);

const response = await apiClient.post('/users/bulk-import', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Response includes success/failure breakdown
// response.data: { successful: 45, failed: 5, errors: [...] }
```

---

## Rate Limiting

### Rate Limit Tiers
| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| General API | 100 requests | 1 minute |
| Auth endpoints (login, forgot password) | 5 requests | 15 minutes |
| File upload endpoints | 10 requests | 1 minute |
| Socket.IO connections | 10 connections | 1 minute |

### Rate Limit Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 14 minutes."
  }
}
```

### Frontend Handling
```typescript
if (error.error.code === 'RATE_LIMIT_EXCEEDED') {
  // Disable submit button, show countdown timer
  toast.error(error.error.message);
}
```

---

## Socket.IO Real-time

### Connection Setup
```typescript
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
  path: '/api/socket.io',
  withCredentials: true,  // Sends access_token cookie
  transports: ['websocket', 'polling'],
});
```

### Authentication
- Socket.IO reads `access_token` httpOnly cookie from handshake headers
- If `mustChangePassword === true`, connection is **rejected**
- On successful connection, the **server** joins the socket to room `user:{userId}`

### Server-to-Client Events

#### `notification:new`
**Payload:**
```typescript
{
  id: number;
  type: 'NEW_POST' | 'ROLE_ASSIGNED' | 'SOCIETY_REQUEST_REVIEWED';
  title: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  postId: number | null;
  post?: {
    channelId: number;
    channel: {
      name: string;
      serverId: number;
    };
  } | null;
}
```

**Frontend Action:**
```typescript
socket.on('notification:new', (notification) => {
  // 1. Prepend to notification cache
  queryClient.setQueryData(['notifications'], (old: any) => ({
    ...old,
    data: [notification, ...old.data],
  }));

  // 2. Increment unread count
  notificationStore.incrementUnread();

  // 3. Show toast for urgent posts
  if (notification.post?.priority === 'URGENT') {
    toast.error(notification.title);
  }
});
```

#### `notification:unread-count`
**Payload:**
```typescript
{
  count: number;
}
```

**Frontend Action:**
```typescript
socket.on('notification:unread-count', ({ count }) => {
  notificationStore.setUnreadCount(count);
});
```

#### `auth:expired`
**Payload:** (none)

**Frontend Action:**
```typescript
socket.on('auth:expired', () => {
  // Access token expired, trigger logout
  authStore.clearUser();
  queryClient.clear();
  socket.disconnect();
  navigate('/login');
});
```

### Auto-Disconnect on Token Expiry
Backend sets a timer based on JWT expiry. When token expires:
1. Server emits `auth:expired` event
2. Server disconnects socket
3. Frontend should handle reconnection after refresh

#### `auth:roles-updated`
**Payload:** (none)

Emitted to the affected user after role assignment, role revocation, or society leadership changes.
The frontend should refetch `/api/users/me` and any role-dependent queries before rendering
permission-gated actions.

---

## API Endpoints

### System Endpoints

#### Health Check
```
GET /api/health
```

**Auth:** None

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

---

### Authentication Endpoints

#### Login
```
POST /api/auth/login
```

**Auth:** None
**Rate Limit:** 5 req / 15 min

**Request Body:**
```typescript
{
  email: string;      // Valid email
  password: string;   // Min 1 char
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    fullName: string;
    email: string;
    userType: 'ADMIN' | 'TEACHER' | 'STUDENT';
    mustChangePassword: boolean;
  };
  message: 'Login successful' | 'Login successful. Password change required.';
}
```

**Cookies Set:**
- `access_token` (15 min)
- `refresh_token` (7 days)

**Frontend Action:**
```typescript
const user = await authApi.login({ email, password });

authStore.setUser(user);

if (user.mustChangePassword) {
  // Do NOT connect Socket.IO — backend blocks all routes except change-password
  navigate('/change-password');
} else {
  connectSocket();
  navigate('/');
}
```

#### Logout
```
POST /api/auth/logout
```

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `access_token`
- `refresh_token`

**Frontend Action:**
```typescript
await apiClient.post('/auth/logout');
authStore.clearUser();
disconnectSocket();
queryClient.clear();
navigate('/login');
```

#### Refresh Token
```
POST /api/auth/refresh
```

**Auth:** `refresh_token` cookie required
**Rate Limit:** None (used by interceptor)

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Token refreshed successfully"
}
```

**Cookies Set:**
- New `access_token`
- New `refresh_token`

#### Forgot Password
```
POST /api/auth/forgot-password
```

**Auth:** None
**Rate Limit:** 5 req / 15 min

**Request Body:**
```typescript
{
  email: string;  // Valid email
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "If an account exists, a reset link has been sent"
}
```

**Note:** Response is always success (no email enumeration). Backend sends email with reset token to valid addresses only.

#### Reset Password
```
POST /api/auth/reset-password
```

**Auth:** None
**Rate Limit:** 5 req / 15 min

**Request Body:**
```typescript
{
  token: string;       // From email link query param
  newPassword: string; // Min 8, lowercase, uppercase, digit, special char
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Password reset successful"
}
```

**Cookies Cleared:** All (user must log in again)

#### Change Password
```
PATCH /api/auth/change-password
```

**Auth:** Required

**Request Body:**
```typescript
{
  currentPassword: string;
  newPassword: string;  // Must differ from current, meet strength requirements
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Password changed successfully"
}
```

**Cookies Cleared:** All (user must log in again with new password)

---

### Users Endpoints

#### Get Own Profile
```
GET /api/users/me
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    gender: 'MALE' | 'FEMALE';
    bio: string | null;
    profilePictureUrl: string | null;
    userType: 'ADMIN' | 'TEACHER' | 'STUDENT';
    departmentId: number | null;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;  // ISO 8601
    roles: Array<{
      role:
        | 'hod'
        | 'program_director'
        | 'cr'
        | 'society_president'
        | 'society_convenor'
        | 'server_moderator'
        | 'channel_moderator';
      serverId: number;
      channelId?: number | null;
      scopeType: 'server' | 'channel';
    }>;
    studentInfo?: {
      rollNumber: string;
      classId: number;
      class: {
        program: { code: string };
      };
    } | null;
    teacherInfo?: {
      designation: string;
    } | null;
  };
}
```

#### Update Own Profile
```
PATCH /api/users/me
```

**Auth:** Required

**Request Body:**
```typescript
{
  bio?: string;  // Max 500 chars
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Profile updated successfully"
}
```

#### Update Profile Picture
```
PATCH /api/users/me/profile-picture
```

**Auth:** Required
**Rate Limit:** 10 req / min (upload tier)

**Request Body:** Multipart form data
- Field name: `profilePicture`
- Max size: 5MB
- Accepted: JPEG, PNG, WEBP

**Response:**
```typescript
{
  success: true;
  data: {
    profilePictureUrl: string;  // New Cloudinary URL
  };
  message: 'Profile picture updated successfully';
}
```

#### Create User (Admin)
```
POST /api/users
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  fullName: string;   // 1-100 chars
  email: string;      // Valid email
  phone: string;      // Format: 03XXXXXXXXX
  gender: 'MALE' | 'FEMALE';
  userType: 'ADMIN' | 'TEACHER' | 'STUDENT';

  // Conditional fields based on userType:
  // TEACHER:
  departmentId?: number;
  designation?: string;

  // STUDENT:
  departmentId?: number;
  classId?: number;
  rollNumber?: string;  // Format: YY-NTU-DEPT-#### (e.g., 22-NTU-CS-1184)
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    email: string;
    fullName: string;
    userType: 'ADMIN' | 'TEACHER' | 'STUDENT';
    mustChangePassword: true;
  };
  message: 'User created successfully';
}
```

**Note:** Backend emails the generated temporary password to the user. The frontend should not display the password to admins. User must change password on first login.

#### Bulk Import Users (CSV)
```
POST /api/users/bulk-import
```

**Auth:** Admin only
**Rate Limit:** 10 req / min (upload tier)

**Request Body:** Multipart form data
- Field name: `file`
- File type: CSV
- Max size: 5MB

**CSV Format:**
```
fullName,email,phone,gender,userType,departmentId,classId,rollNumber,designation
John Doe,john@ntu.edu.pk,03001234567,MALE,STUDENT,1,1,22-NTU-CS-1184,
Jane Smith,jane@ntu.edu.pk,03009876543,FEMALE,TEACHER,1,,,Associate Professor
```

**Response:**
```typescript
{
  success: true;
  data: {
    successful: number;
    failed: number;
    errors: Array<{
      row: number;
      message: string;
    }>;
  };
  message: 'Import completed';
}
```

#### List Users (Admin/Teacher)
```
GET /api/users
```

**Auth:** Admin or Teacher

**Query Parameters:**
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 50
  userType?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  departmentId?: number;
  isActive?: boolean;
}
```

**Response:** Paginated list of users (same shape as GET /me)

#### Get User by ID (Admin/Teacher)
```
GET /api/users/:id
```

**Auth:** Admin or Teacher

**Response:** Same as GET /me

#### Deactivate User (Admin)
```
PATCH /api/users/:id/deactivate
```

**Auth:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "User deactivated successfully"
}
```

#### Reactivate User (Admin)
```
PATCH /api/users/:id/reactivate
```

**Auth:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "User reactivated successfully"
}
```

---

### Departments Endpoints

#### List Departments
```
GET /api/departments
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    code: string;
    hodId: number | null;
    serverId: number;
    createdAt: string;
  }>;
}
```

#### Get Department
```
GET /api/departments/:id
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    code: string;
    hodId: number | null;
    serverId: number;
    createdAt: string;
    hod?: {
      id: number;
      fullName: string;
    } | null;
    server: {
      id: number;
      name: string;
    };
  };
}
```

#### Create Department (Admin)
```
POST /api/departments
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  name: string;  // 1-100 chars
  code: string;  // 2-10 chars, uppercase (e.g., "CS")
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    code: string;
    serverId: number;  // Auto-created server
  };
  message: 'Department created successfully';
}
```

#### Update Department (Admin)
```
PATCH /api/departments/:id
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  name?: string;
  code?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Department updated successfully"
}
```

#### Get Department Stats (Admin/Teacher)
```
GET /api/departments/:id/stats
```

**Auth:** Admin or Teacher

**Response:**
```typescript
{
  success: true;
  data: {
    totalPrograms: number;
    totalClasses: number;
    totalStudents: number;
    totalTeachers: number;
  };
}
```

#### List Programs in Department
```
GET /api/departments/:id/programs
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    departmentId: number;
    disciplineId: number;
    degreeLevelId: number;
    semesters: number;
    code: string;
    programDirectorId: number | null;
    discipline: { name: string };
    degreeLevel: { level: string };  // "Bachelor", "Master", "PhD"
  }>;
}
```

#### Create Program in Department (Admin)
```
POST /api/departments/:id/programs
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  disciplineId: number;
  degreeLevelId: number;
  semesters: number;     // 1-10
  code: string;          // e.g., "BSCS", "MSSE"
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    code: string;
  };
  message: 'Program created successfully';
}
```

---

### Programs Endpoints

#### Update Program (Admin)
```
PATCH /api/programs/:id
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  semesters?: number;  // 1-10
  code?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Program updated successfully"
}
```

#### Get Program Curriculum
```
GET /api/programs/:id/curriculum
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  semesterNumber?: number;  // Filter by semester
  batchYear?: number;       // Filter by batch year
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    programId: number;
    courseId: number;
    semesterNumber: number;
    batchYear: number;
    course: {
      id: number;
      code: string;
      title: string;
      creditHours: number;
    };
  }>;
}
```

#### Add Course to Curriculum (Admin/Teacher)
```
POST /api/programs/:id/curriculum
```

**Auth:** Admin or Teacher

**Request Body:**
```typescript
{
  courseId: number;
  semesterNumber: number;  // 1-10
  batchYear: number;       // e.g., 2024
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Course added to curriculum successfully"
}
```

#### Remove Course from Curriculum (Admin/Teacher)
```
DELETE /api/programs/:id/curriculum/:curriculumId
```

**Auth:** Admin or Teacher

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Course removed from curriculum successfully"
}
```

---

### Disciplines Endpoints

#### List Disciplines
```
GET /api/disciplines
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;  // e.g., "Computer Science", "Software Engineering"
  }>;
}
```

#### Create Discipline (Admin)
```
POST /api/disciplines
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  name: string;  // 1-100 chars
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
  };
  message: 'Discipline created successfully';
}
```

---

### Classes Endpoints

#### List Classes
```
GET /api/classes
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  programId?: number;
  semester?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    programId: number;
    currentSemester: number;
    academicYear: number;
    admissionYear: number;
    section: 'A' | 'B';
    crId: number | null;
    serverId: number;
    program: {
      code: string;
      discipline: { name: string };
    };
    cr?: {
      id: number;
      fullName: string;
    } | null;
  }>;
  pagination: { ... };
}
```

#### Get Class
```
GET /api/classes/:id
```

**Auth:** Required

**Response:** Same shape as list item, plus nested `server` object

#### Create Class (Admin/Teacher)
```
POST /api/classes
```

**Auth:** Admin or Teacher

**Request Body:**
```typescript
{
  programId: number;
  currentSemester: number;    // 1-10
  academicYear: number;       // e.g., 2024
  admissionYear: number;      // e.g., 2021
  section: 'A' | 'B';
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    serverId: number;  // Auto-created server
  };
  message: 'Class created successfully';
}
```

#### Assign Course to Class (Admin/Teacher)
```
POST /api/classes/:id/courses
```

**Auth:** Admin or Teacher

**Request Body:**
```typescript
{
  courseId: number;
  teacherId: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Course assigned successfully"
}
```

**Note:** Also creates auto-channel for this course in class server

#### List Courses for Class
```
GET /api/classes/:id/courses
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: Array<{
    courseId: number;
    teacherId: number;
    classId: number;
    course: {
      code: string;
      title: string;
      creditHours: number;
    };
    teacher: {
      id: number;
      fullName: string;
      email: string;
    };
  }>;
}
```

#### Remove Course Assignment (Admin/Teacher)
```
DELETE /api/classes/:id/courses/:courseId
```

**Auth:** Admin or Teacher

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Course assignment removed successfully"
}
```

**Note:** Also archives the course channel

#### Semester Progression (Admin/Teacher)
```
POST /api/classes/:id/semester-progression
```

**Auth:** Admin or Teacher

**Request Body:**
```typescript
{
  teacherAssignments: Array<{
    courseId: number;
    teacherId: number;
  }>;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Semester progression completed successfully"
}
```

**Side Effects:**
- Increments `currentSemester` by 1
- Archives all course channels
- Clears all TEACHES records (course-teacher assignments)
- Creates new course assignments from `teacherAssignments`

---

### Courses Endpoints

#### List Courses
```
GET /api/courses
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  departmentId?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    title: string;
    code: string;
    creditHours: number;
    departmentId: number;
  }>;
  pagination: { ... };
}
```

#### Get Course
```
GET /api/courses/:id
```

**Auth:** Required

**Response:** Same shape as list item

#### Create Course (Admin)
```
POST /api/courses
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  title: string;         // 1-200 chars
  code: string;          // 2-20 chars (e.g., "CS101")
  creditHours: number;   // 1-6
  departmentId: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    code: string;
  };
  message: 'Course created successfully';
}
```

#### Update Course (Admin)
```
PATCH /api/courses/:id
```

**Auth:** Admin only

**Request Body:**
```typescript
{
  title?: string;
  code?: string;
  creditHours?: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Course updated successfully"
}
```

---

### Societies Endpoints

#### List Societies
```
GET /api/societies
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  departmentId?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    description: string | null;
    departmentId: number;
    isActive: boolean;
    createdAt: string;
    department: {
      id: number;
      name: string;
      serverId: number;
    };
    president: {
      user: {
        id: number;
        fullName: string;
        email: string;
      };
    };
    convenor: {
      user: {
        id: number;
        fullName: string;
        email: string;
      };
    };
    server: {
      _count: {
        memberships: number;
      };
    };
  }>;
  pagination: { ... };
}
```

#### Get Society
```
GET /api/societies/:id
```

**Auth:** Required

**Response:** Same shape as list item, plus `serverId` and `server.id`

#### Get My Membership Status
```
GET /api/societies/:id/my-membership
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: {
    isMember: boolean;
    requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    requestedAt: string | null;
    reviewedAt: string | null;
  };
}
```

#### Create Society
```
POST /api/societies
```

**Auth:** Admin or HOD for the target department

**Request Body:**
```typescript
{
  name: string;            // 1-100 chars
  description?: string;    // Max 500 chars
  departmentId: number;
  presidentId: number;     // Student ID
  convenorId: number;      // Teacher ID
}
```

**Response:** Created `SocietyListItem`; server is auto-created.

#### Update Society
```
PATCH /api/societies/:id
```

**Auth:** Info-only changes require admin, HOD for the department, convenor, or president.
Leadership changes require admin or HOD for the department.

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
  presidentId?: number;    // Only convenor/admin can change
  convenorId?: number;     // Only admin can change
}
```

**Response:**
Updated `SocietyListItem`

#### Submit Join Request (Student)
```
POST /api/societies/:id/join-request
```

**Auth:** Student only

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Join request submitted successfully"
}
```

**Note:** Duplicate requests return 409 CONFLICT

#### List Join Requests
```
GET /api/societies/:id/join-requests
```

**Auth:** Admin, convenor, or president

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';  // Default: PENDING
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    societyId: number;
    userId: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    reviewedBy: number | null;
    reviewedAt: string | null;
    user: {
      id: number;
      fullName: string;
      email: string;
      profilePictureUrl: string | null;
    };
  }>;
  pagination: { ... };
}
```

#### Review Join Request
```
PATCH /api/societies/:id/join-requests/:requestId
```

**Auth:** Admin, convenor, or president

**Request Body:**
```typescript
{
  status: 'APPROVED' | 'REJECTED';
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Join request approved" | "Join request rejected"
}
```

**Note:** Approval adds the user to the society server membership and both approval and
rejection create a `SOCIETY_REQUEST_REVIEWED` notification for the requester.

#### Add Member Directly
```
POST /api/societies/:id/members
```

**Auth:** Admin, convenor, or president

**Request Body:**
```typescript
{
  userId: number;  // Student ID
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Member added successfully"
}
```

#### Remove Member
```
DELETE /api/societies/:id/members/:userId
```

**Auth:** Admin, convenor, or president

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Member removed successfully"
}
```

#### List Members
```
GET /api/societies/:id/members
```

**Auth:** Admin, convenor, or president

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
}
```

#### List Member Candidates
```
GET /api/societies/:id/member-candidates
```

**Auth:** Admin, convenor, or president

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  search?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    fullName: string;
    email: string;
    userType: 'STUDENT';
    profilePictureUrl: string | null;
  }>;
  pagination: { ... };
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    userId: number;
    joinedAt: string;
    isAutoJoined: boolean;
    user: {
      id: number;
      fullName: string;
      email: string;
      userType: string;
      profilePictureUrl: string | null;
    };
    badges: string[];  // e.g., ['president', 'server_moderator']
  }>;
  pagination: { ... };
}
```

---

### Roles Endpoints

#### Assign Role
```
POST /api/roles/assign
```

**Auth:** Required (permission logic varies by role)

**Request Body (for non-moderator roles):**
```typescript
{
  userId: number;
  role: 'hod' | 'program_director' | 'cr' | 'society_president' | 'society_convenor';
  scopeId: number;  // departmentId, programId, classId, or societyId
}
```

**Request Body (for server-level moderator):**
```typescript
{
  userId: number;
  role: 'server_moderator';
  serverId: number;
}
```

**Request Body (for channel-level moderator):**
```typescript
{
  userId: number;
  role: 'channel_moderator';
  serverId: number;
  channelId: number;
}
```

**Response:**
```typescript
{
  success: true;
  data:
    | {
        role: 'hod';
        userId: number;
        departmentId: number;
        departmentName: string;
      }
    | {
        role: 'program_director';
        userId: number;
        programId: number;
        programCode: string;
      }
    | {
        role: 'cr';
        userId: number;
        classId: number;
      }
    | {
        role: 'society_president' | 'society_convenor';
        userId: number;
        societyId: number;
        societyName: string;
      }
    | {
        role: 'server_moderator' | 'channel_moderator';
        userId: number;
        serverId: number;
        channelId: number | null;
        scopeType: 'server' | 'channel';
        assignmentId?: number;
      };
  message: 'Role assigned successfully';
}
```

#### Revoke Role
```
POST /api/roles/revoke
```

**Auth:** Required (permission logic varies by role)

**Request Body:** Same shape as assign, except only these roles are revokable here:
- `hod`
- `program_director`
- `cr`
- `server_moderator`
- `channel_moderator`

**Response:**
```typescript
{
  success: true;
  data:
    | { role: 'hod'; userId: number; departmentId: number }
    | { role: 'program_director'; userId: number; programId: number }
    | { role: 'cr'; userId: number; classId: number }
    | {
        role: 'server_moderator' | 'channel_moderator';
        userId: number;
        serverId: number;
        channelId: number | null;
        scopeType: 'server' | 'channel';
      };
  message: 'Role revoked successfully';
}
```

**Note:** Society president and convenor cannot be revoked via this endpoint (must update society)

**Realtime:** Successful assignment/revocation emits `auth:roles-updated` to the affected user.

#### Get User Roles
```
GET /api/roles/users/:id
```

**Auth:** Admin or Teacher

**Response:**
```typescript
{
  success: true;
  data: Array<{
    role:
      | 'hod'
      | 'program_director'
      | 'cr'
      | 'society_president'
      | 'society_convenor'
      | 'server_moderator'
      | 'channel_moderator';
    departmentId?: number;
    departmentName?: string;
    programId?: number;
    programCode?: string;
    classId?: number;
    societyId?: number;
    societyName?: string;
    scopeId?: number;
    serverId?: number;
    serverName?: string;
    channelId?: number;
    channelName?: string | null;
    scopeType?: 'server' | 'channel';
    scopeContext?: string;  // e.g., "HOD of Computer Science Department"
  }>;
}
```

---

### Servers Endpoints

#### List Servers
```
GET /api/servers
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  type?: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    description: string | null;
    type: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
    iconUrl: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  pagination: { ... };
}
```

**Note:** Users only see servers they're members of (admins see all)

#### Get Server
```
GET /api/servers/:id
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    description: string | null;
    type: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
    iconUrl: string | null;
    isActive: boolean;
    createdAt: string;
    department?: {
      id: number;
      name: string;
      code: string;
    } | null;
    class?: {
      id: number;
      currentSemester: number;
      section: 'A' | 'B';
      program: {
        id: number;
        code: string;
        discipline: { name: string };
        degreeLevel: { level: string };
      };
    } | null;
    society?: {
      id: number;
      name: string;
    } | null;
    _count: {
      memberships: number;
      channels: number;
    };
  };
}
```

#### List Server Channels
```
GET /api/servers/:id/channels
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  includeArchived?: boolean;  // Default: false
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    description: string | null;
    type: 'ANNOUNCEMENT' | 'COURSE' | 'GENERAL' | 'PROGRAM';
    isLocked: boolean;
    isArchived: boolean;
    isAutoCreated: boolean;
    courseId: number | null;
    programId: number | null;
    createdAt: string;
  }>;
}
```

#### List Server Members
```
GET /api/servers/:id/members
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    userId: number;
    joinedAt: string;
    isAutoJoined: boolean;
    user: {
      id: number;
      fullName: string;
      email: string;
      userType: 'ADMIN' | 'TEACHER' | 'STUDENT';
      profilePictureUrl: string | null;
    };
    badges: string[];  // e.g., ['hod'], ['cr', 'server_moderator']
  }>;
  pagination: { ... };
}
```

#### Create Channel
```
POST /api/servers/:id/channels
```

**Auth:** Requires `create:channel` permission on this server

**Request Body:**
```typescript
{
  name: string;           // 1-100 chars
  description?: string;   // Max 500 chars
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
  };
  message: 'Channel created successfully';
}
```

---

### Channels Endpoints

#### Update Channel
```
PATCH /api/channels/:id
```

**Auth:** Requires `create:channel` permission on this channel's server

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Channel updated successfully"
}
```

#### Lock Channel
```
PATCH /api/channels/:id/lock
```

**Auth:** Requires `lock:channel` permission

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Channel locked successfully"
}
```

**Note:** Locked channels: no new posts allowed (edit/delete existing posts still works)

#### Unlock Channel
```
PATCH /api/channels/:id/unlock
```

**Auth:** Requires `lock:channel` permission

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Channel unlocked successfully"
}
```

#### Delete Channel
```
DELETE /api/channels/:id
```

**Auth:** Requires `delete:channel` permission

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Channel deleted successfully"
}
```

**Note:** Soft delete (sets `isDeleted = true`, channel hidden from API responses)

---

### Posts Endpoints

#### Create Post
```
POST /api/channels/:id/posts
```

**Auth:** Required
**Rate Limit:** 10 req / min (upload tier)

**Request Body:** Multipart form data
- `title` (string, required, 1-100 chars)
- `content` (string, required, 1-5000 chars, HTML)
- `priority` (string, optional, default: NORMAL) - "NORMAL" | "IMPORTANT" | "URGENT"
- `attachments` (file[], optional, max 3 files, 5MB each, JPEG/PNG/WEBP)

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    title: string;
  };
  message: 'Post created successfully';
}
```

**Side Effect:** Creates notifications for all subscribed server members

#### List Posts in Channel
```
GET /api/channels/:id/posts
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  search?: string;           // Search by title
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  startDate?: string;        // ISO 8601 (e.g., 2026-03-01)
  endDate?: string;          // ISO 8601
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    title: string;
    content: string;  // HTML
    priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
    isPinned: boolean;
    pinnedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
    author: {
      id: number;
      fullName: string;
      email: string;
      userType: string;
      profilePictureUrl: string | null;
      badges: string[];  // e.g., ['hod'], ['cr', 'server_moderator']
    };
    _count: {
      attachments: number;
    };
  }>;
  pagination: { ... };
}
```

**Note:** Pinned posts appear first, then sorted by creation date desc

#### Get Single Post
```
GET /api/posts/:id
```

**Auth:** Required

**Response:**
```typescript
{
  success: true;
  data: {
    id: number;
    title: string;
    content: string;
    priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
    isPinned: boolean;
    pinnedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
    author: {
      id: number;
      fullName: string;
      email: string;
      userType: string;
      profilePictureUrl: string | null;
      badges: string[];
    };
    attachments: Array<{
      id: number;
      fileUrl: string;      // Cloudinary URL
      fileType: string;     // MIME type
      fileSize: number;     // Bytes
      uploadedAt: string;
    }>;
    pinner?: {
      id: number;
      fullName: string;
    } | null;
  };
}
```

#### Update Post
```
PATCH /api/posts/:id
```

**Auth:** Author only
**Constraint:** Within 24 hours of creation

**Request Body:**
```typescript
{
  title?: string;     // 1-100 chars
  content?: string;   // 1-5000 chars
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
}
```

**Response:** Same `PostDetail` data shape as `GET /api/posts/:id`
```typescript
{
  success: true;
  data: PostDetail;
  message: 'Post updated successfully';
}
```

**Note:** Cannot edit attachments (must delete and re-upload)

#### Delete Post
```
DELETE /api/posts/:id
```

**Auth:** Author or Admin

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Post deleted successfully"
}
```

**Note:** Soft delete (sets `isDeleted = true`)

#### Pin/Unpin Post
```
PATCH /api/posts/:id/pin
```

**Auth:** Requires `lock:channel` permission

**Request Body:**
```typescript
{
  isPinned: boolean;
}
```

**Response:** Same `PostDetail` data shape as `GET /api/posts/:id`
```typescript
{
  success: true;
  data: PostDetail;
  message: 'Post pinned successfully' | 'Post unpinned successfully';
}
```

#### Add Attachments to Existing Post
```
POST /api/posts/:id/attachments
```

**Auth:** Author only
**Rate Limit:** 10 req / min (upload tier)

**Request Body:** Multipart form data
- `attachments` (file[], max 3 additional files)

**Response:** Same `PostDetail` data shape as `GET /api/posts/:id`
```typescript
{
  success: true;
  data: PostDetail;
  message: 'Attachments uploaded successfully';
}
```

**Note:** Total attachments (existing + new) cannot exceed 3

---

### Notifications Endpoints

#### List Notifications
```
GET /api/notifications
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  type?: 'NEW_POST' | 'ROLE_ASSIGNED' | 'SOCIETY_REQUEST_REVIEWED';
  unreadOnly?: boolean;  // Default: false
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    type: 'NEW_POST' | 'ROLE_ASSIGNED' | 'SOCIETY_REQUEST_REVIEWED';
    title: string;
    message: string | null;
    readAt: string | null;
    createdAt: string;
    postId: number | null;
    post?: {
      channelId: number;
      priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
      channel: {
        name: string;
        serverId: number;
      };
    } | null;
  }>;
  pagination: { ... };
}
```

#### Get Unread Count
```
GET /api/notifications/unread-count
```

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

#### Mark All as Read
```
PATCH /api/notifications/read-all
```

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "All notifications marked as read"
}
```

#### Mark Single as Read
```
PATCH /api/notifications/:id/read
```

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Notification marked as read"
}
```

---

### Notification Preferences Endpoints

#### List Preferences
```
GET /api/notification-preferences
```

**Auth:** Required

**Query Parameters:**
```typescript
{
  serverId?: number;
  notificationType?: 'NEW_POST' | 'ROLE_ASSIGNED';
}
```

**Response:**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    notificationType: 'NEW_POST' | 'ROLE_ASSIGNED';
    scopeType: 'SERVER' | 'CHANNEL';
    serverId: number;
    channelId: number | null;
    isSubscribed: boolean;
    updatedAt: string;
    server: {
      name: string;
      type: 'DEPARTMENT' | 'CLASS' | 'SOCIETY';
    };
    channel?: {
      name: string;
    } | null;
  }>;
}
```

**Note:** Default behavior: users are subscribed unless explicitly unsubscribed. `NEW_POST`
preferences support `SERVER` and `CHANNEL` scope. `ROLE_ASSIGNED` preferences support
`SERVER` scope only. `SOCIETY_REQUEST_REVIEWED` is a transactional user notification and
does not use notification preferences.

#### Update Preference
```
PATCH /api/notification-preferences
```

**Auth:** Required

**Request Body:**
```typescript
{
  notificationType: 'NEW_POST' | 'ROLE_ASSIGNED'; // Defaults to NEW_POST for backward compatibility
  scopeType: 'SERVER' | 'CHANNEL';
  serverId: number;
  channelId?: number;      // Required for NEW_POST + CHANNEL
  isSubscribed: boolean;
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Notification preference updated successfully"
}
```

**Note:** Server-level `NEW_POST` unsubscribe suppresses all post notifications for that
server, including urgent posts. Channel toggles are preserved but inactive while the server
scope is muted. Server-level `ROLE_ASSIGNED` unsubscribe suppresses role-assignment
notifications for that server.

---

### Admin Endpoints

#### Get System Stats
```
GET /api/admin/stats
```

**Auth:** Admin only

**Response:**
```typescript
{
  success: true;
  data: {
    totalUsers: number;
    totalAdmins: number;
    totalTeachers: number;
    totalStudents: number;
    activeUsers: number;
    totalServers: number;
    totalDepartmentServers: number;
    totalClassServers: number;
    totalSocietyServers: number;
    totalPosts: number;
  };
}
```

**Note:** Cached for 60 seconds (backend caches this query)

#### List All Users (Admin)
```
GET /api/admin/users
```

**Auth:** Admin only

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  userType?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  departmentId?: number;
  isActive?: boolean;
  search?: string;  // Search by fullName or email
}
```

**Response:** Same as `GET /api/users` but without restrictions

---

## Best Practices

### 1. Always Use TanStack Query for Server State
```typescript
// BAD: Using useState for server data
const [users, setUsers] = useState([]);

useEffect(() => {
  apiClient.get('/users').then(res => setUsers(res.data));
}, []);

// GOOD: Using TanStack Query
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => apiClient.get('/users'),
});
```

### 2. Invalidate Queries After Mutations
```typescript
const createPostMutation = useMutation({
  mutationFn: (data) => apiClient.post(`/channels/${channelId}/posts`, data),
  onSuccess: () => {
    // Invalidate posts query to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['posts', channelId] });
    toast.success('Post created successfully');
  },
});
```

### 3. Optimize Query Keys
```typescript
// BAD: Non-specific query key
useQuery({ queryKey: ['posts'], ... });

// GOOD: Specific query key with filters
useQuery({
  queryKey: ['posts', channelId, { search, priority, page }],
  ...
});
```

### 4. Use Optimistic Updates for Better UX
```typescript
const markAsReadMutation = useMutation({
  mutationFn: (notificationId) =>
    apiClient.patch(`/notifications/${notificationId}/read`),
  onMutate: async (notificationId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['notifications'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['notifications']);

    // Optimistically update
    queryClient.setQueryData(['notifications'], (old: any) => ({
      ...old,
      data: old.data.map((n: Notification) =>
        n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
      ),
    }));

    notificationStore.decrementUnread();

    return { previous };
  },
  onError: (err, notificationId, context) => {
    // Rollback on error
    queryClient.setQueryData(['notifications'], context.previous);
    notificationStore.incrementUnread();
  },
});
```

### 5. Handle Loading and Error States
```typescript
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return <EmptyState />;

return <DataDisplay data={data} />;
```

---

## Appendix

### Complete Type Definitions Template
See [`client/src/types/`](./src/types/) for full TypeScript definitions mirroring backend response shapes.

### Backend Reference Documents
- [Backend API Development Plan](../server/API_DEVELOPMENT_PLAN.md)
- [Backend Error Codes](../server/docs/API_ERROR_CODES.md)
- [Backend Frontend Contract](../server/docs/FRONTEND_BACKEND_CONTRACT.md)

---

**Last Updated:** 2026-03-07
**Maintained By:** Frontend Team
