# Internship Tracker API Documentation

## Overview

The Internship Tracker backend is built with Rust using the Actix-web framework. It provides a comprehensive REST API for managing internship programs, student tracking, task management, and time logging.

**Base URL:** `https://intern.intuivo.com `
**API Base Path:** `/api`
**Framework:** Actix-web 4.4
**Database:** Sled (embedded key-value store)

---

## Authentication

All protected endpoints require JWT (JSON Web Token) authentication via the `Authorization` header using the Bearer scheme.

### Authentication Header Format
```
Authorization: Bearer <jwt_token>
```

### Token Claims
The JWT token contains the following claims:
- `sub` (subject): User ID
- `email`: User email
- `role`: User role (Admin, Mentor, or Student)

### Role-Based Access Control (RBAC)

Three roles control access to protected endpoints:

| Role | Permissions |
|------|------------|
| **Admin** | Full access to all resources |
| **Mentor** | Can manage assigned students and their resources |
| **Student** | Can view/edit only their own resources |

---

## Quick Start Guide

### 1. Register a New User

**Endpoint:** `POST /api/auth/register`

Register a new user account with the specified role.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "secure_password_123",
  "role": "Student",
  "full_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "student@example.com",
    "role": "Student",
    "full_name": "John Doe"
  }
}
```

### 2. Login

**Endpoint:** `POST /api/auth/login`

Authenticate and receive a JWT token for subsequent API calls.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "secure_password_123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "student@example.com",
    "role": "Student",
    "full_name": "John Doe"
  }
}
```

---

## API Endpoints

### Root Endpoint

#### GET /

**Description:** Health check / API status

**Authentication:** Not required

**Response (200 OK):**
```text
Internship Tracker API
```

---

## Students Management

### GET /api/students

**Description:** Retrieve list of students (filtered based on user role)

**Authentication:** Required
**Authorization:** Admin (all), Mentor (assigned), Student (self)

**Query Parameters:**
- None

**Response (200 OK):**
```json
[
  {
    "id": "student_1",
    "full_name": "John Doe",
    "student_email": "john@example.com",
    "contract_hours": 40,
    "start_date": "2025-01-15",
    "end_date": "2025-05-15",
    "mentor_email": "mentor@example.com",
    "status": "Active",
    "created_by": "admin@example.com",
    "created_at": "2025-01-01T10:00:00Z"
  }
]
```

---

### POST /api/students

**Description:** Create a new student record

**Authentication:** Required
**Authorization:** Admin, Mentor

**Request:**
```json
{
  "full_name": "Jane Smith",
  "student_email": "jane@example.com",
  "contract_hours": 40,
  "start_date": "2025-02-01",
  "end_date": "2025-06-01",
  "mentor_email": "mentor@example.com",
  "status": "Active"
}
```

**Response (201 Created):**
```json
{
  "id": "student_2",
  "full_name": "Jane Smith",
  "student_email": "jane@example.com",
  "contract_hours": 40,
  "start_date": "2025-02-01",
  "end_date": "2025-06-01",
  "mentor_email": "mentor@example.com",
  "status": "Active",
  "created_by": "admin@example.com",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### PUT /api/students/{id}

**Description:** Update student information

**Authentication:** Required
**Authorization:** Admin (all), Mentor (assigned), Student (self)

**Path Parameters:**
- `id`: Student ID

**Request:**
```json
{
  "full_name": "Jane Smith Updated",
  "contract_hours": 50,
  "status": "Completed"
}
```

**Response (200 OK):**
```json
{
  "id": "student_2",
  "full_name": "Jane Smith Updated",
  "student_email": "jane@example.com",
  "contract_hours": 50,
  "start_date": "2025-02-01",
  "end_date": "2025-06-01",
  "mentor_email": "mentor@example.com",
  "status": "Completed",
  "created_by": "admin@example.com",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### DELETE /api/students/{id}

**Description:** Delete a student record

**Authentication:** Required
**Authorization:** Admin only

**Path Parameters:**
- `id`: Student ID

**Response (204 No Content)** or **200 OK** with confirmation

---

## Tasks Management

### GET /api/tasks

**Description:** Retrieve tasks (optionally filtered by student)

**Authentication:** Required
**Authorization:** Admin (all), Mentor (their students), Student (own tasks)

**Query Parameters:**
- `student_email` (optional): Filter by student email

**Example:**
```
GET /api/tasks?student_email=john@example.com
```

**Response (200 OK):**
```json
[
  {
    "id": "task_1",
    "task_number": 1,
    "title": "Setup Development Environment",
    "description": "Install required tools and configure development environment",
    "due_date": "2025-02-15",
    "status": "InProgress",
    "student_email": "john@example.com",
    "attached_files": [],
    "completion_files": ["setup_screenshot.png"],
    "completion_notes": "Installed Node.js v18 and VSCode",
    "code_snippet": null,
    "created_by": "mentor@example.com",
    "created_at": "2025-01-20T09:00:00Z"
  }
]
```

---

### POST /api/tasks

**Description:** Create a new task

**Authentication:** Required
**Authorization:** Admin, Mentor

**Request:**
```json
{
  "task_number": 1,
  "title": "API Integration",
  "description": "Integrate REST API into frontend",
  "due_date": "2025-03-01",
  "student_email": "john@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": "task_2",
  "task_number": 1,
  "title": "API Integration",
  "description": "Integrate REST API into frontend",
  "due_date": "2025-03-01",
  "status": "Assigned",
  "student_email": "john@example.com",
  "attached_files": [],
  "completion_files": [],
  "completion_notes": null,
  "code_snippet": null,
  "created_by": "mentor@example.com",
  "created_at": "2025-01-25T10:00:00Z"
}
```

---

### PUT /api/tasks/{id}

**Description:** Update task information

**Authentication:** Required
**Authorization:** Admin (all), Mentor (their students), Student (own completion info only)

**Path Parameters:**
- `id`: Task ID

**Request (Student - completion only):**
```json
{
  "status": "Completed",
  "completion_notes": "Task completed successfully",
  "completion_files": ["proof.pdf"],
  "code_snippet": "const result = await api.integrate();"
}
```

**Request (Admin/Mentor - full update):**
```json
{
  "title": "Updated API Integration",
  "description": "Updated description",
  "due_date": "2025-03-15",
  "status": "Reviewed",
  "attached_files": ["requirements.pdf"]
}
```

**Response (200 OK):**
```json
{
  "id": "task_2",
  "task_number": 1,
  "title": "Updated API Integration",
  "description": "Updated description",
  "due_date": "2025-03-15",
  "status": "Reviewed",
  "student_email": "john@example.com",
  "attached_files": ["requirements.pdf"],
  "completion_files": ["proof.pdf"],
  "completion_notes": "Task completed successfully",
  "code_snippet": "const result = await api.integrate();",
  "created_by": "mentor@example.com",
  "created_at": "2025-01-25T10:00:00Z"
}
```

---

### DELETE /api/tasks/{id}

**Description:** Delete a task

**Authentication:** Required
**Authorization:** Admin, Mentor (their students)

**Path Parameters:**
- `id`: Task ID

**Response (204 No Content)**

---

## Time Entries Management

### GET /api/time-entries

**Description:** Retrieve time entries (optionally filtered by user)

**Authentication:** Required
**Authorization:** Admin (all), Mentor (their students), Student (own entries)

**Query Parameters:**
- `user_email` (optional): Filter by user email

**Example:**
```
GET /api/time-entries?user_email=john@example.com
```

**Response (200 OK):**
```json
[
  {
    "id": "entry_1",
    "date": "2025-01-20",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "break_start": "12:00:00",
    "break_end": "13:00:00",
    "manually_inputted_hours": null,
    "proof_hours": 7,
    "approved_hours": 7,
    "proof_type": "Git",
    "proof_files": ["github-commit-screenshot.png"],
    "status": "Approved",
    "mentor_comments": "Good progress on feature implementation",
    "created_by": "john@example.com",
    "created_at": "2025-01-20T18:30:00Z"
  }
]
```

---

### POST /api/time-entries

**Description:** Create/log time entry

**Authentication:** Required
**Authorization:** Student (own), Admin, Mentor (on behalf of)

**Request (Time range):**
```json
{
  "date": "2025-01-21",
  "start_time": "09:00:00",
  "end_time": "17:30:00",
  "break_start": "12:00:00",
  "break_end": "13:00:00",
  "proof_type": "Git",
  "proof_files": ["commit-hash.png"],
  "user_email": "john@example.com"
}
```

**Request (Manual hours):**
```json
{
  "date": "2025-01-22",
  "manually_inputted_hours": 8,
  "proof_type": "Document",
  "proof_files": ["timesheet.pdf"],
  "user_email": "john@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": "entry_2",
  "date": "2025-01-21",
  "start_time": "09:00:00",
  "end_time": "17:30:00",
  "break_start": "12:00:00",
  "break_end": "13:00:00",
  "manually_inputted_hours": null,
  "proof_hours": 8,
  "approved_hours": null,
  "proof_type": "Git",
  "proof_files": ["commit-hash.png"],
  "status": "Submitted",
  "mentor_comments": null,
  "created_by": "john@example.com",
  "created_at": "2025-01-21T18:00:00Z"
}
```

---

### PUT /api/time-entries/{id}

**Description:** Update time entry

**Authentication:** Required
**Authorization:** Student (own, status=Draft only), Mentor (approve/comment), Admin (all)

**Path Parameters:**
- `id`: Entry ID

**Request (Student - update draft):**
```json
{
  "start_time": "08:30:00",
  "end_time": "17:30:00"
}
```

**Request (Mentor - approve and comment):**
```json
{
  "status": "Approved",
  "approved_hours": 8.5,
  "mentor_comments": "Hours approved. Good work!"
}
```

**Response (200 OK):**
```json
{
  "id": "entry_2",
  "date": "2025-01-21",
  "start_time": "08:30:00",
  "end_time": "17:30:00",
  "break_start": "12:00:00",
  "break_end": "13:00:00",
  "manually_inputted_hours": null,
  "proof_hours": 8.5,
  "approved_hours": 8.5,
  "proof_type": "Git",
  "proof_files": ["commit-hash.png"],
  "status": "Approved",
  "mentor_comments": "Hours approved. Good work!",
  "created_by": "john@example.com",
  "created_at": "2025-01-21T18:00:00Z"
}
```

---

### DELETE /api/time-entries/{id}

**Description:** Delete time entry

**Authentication:** Required
**Authorization:** Student (own draft only), Mentor (their students), Admin

**Path Parameters:**
- `id`: Entry ID

**Response (204 No Content)**

---

## Schedules Management

### GET /api/schedules

**Description:** Retrieve schedules (optionally filtered by student)

**Authentication:** Required
**Authorization:** Admin (all), Mentor (their students), Student (own)

**Query Parameters:**
- `student_email` (optional): Filter by student email

**Example:**
```
GET /api/schedules?student_email=john@example.com
```

**Response (200 OK):**
```json
[
  {
    "id": "schedule_1",
    "student_email": "john@example.com",
    "day_of_week": "Monday",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "created_by": "mentor@example.com",
    "created_by_mentor": true,
    "created_at": "2025-01-10T08:00:00Z"
  }
]
```

---

### POST /api/schedules

**Description:** Create schedule entry

**Authentication:** Required
**Authorization:** Admin, Mentor, Student

**Request:**
```json
{
  "student_email": "john@example.com",
  "day_of_week": "Tuesday",
  "start_time": "08:00:00",
  "end_time": "16:00:00"
}
```

**Response (201 Created):**
```json
{
  "id": "schedule_2",
  "student_email": "john@example.com",
  "day_of_week": "Tuesday",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "created_by": "mentor@example.com",
  "created_by_mentor": true,
  "created_at": "2025-01-15T08:00:00Z"
}
```

---

### PUT /api/schedules/{id}

**Description:** Update schedule

**Authentication:** Required
**Authorization:** Admin, Mentor (their students), Student (own)

**Path Parameters:**
- `id`: Schedule ID

**Request:**
```json
{
  "start_time": "09:00:00",
  "end_time": "17:30:00"
}
```

**Response (200 OK):**
```json
{
  "id": "schedule_2",
  "student_email": "john@example.com",
  "day_of_week": "Tuesday",
  "start_time": "09:00:00",
  "end_time": "17:30:00",
  "created_by": "mentor@example.com",
  "created_by_mentor": true,
  "created_at": "2025-01-15T08:00:00Z"
}
```

---

### DELETE /api/schedules/{id}

**Description:** Delete schedule

**Authentication:** Required
**Authorization:** Admin, Mentor (their students), Student (own)

**Path Parameters:**
- `id`: Schedule ID

**Response (204 No Content)**

---

## Questions & Answers

### GET /api/questions

**Description:** Retrieve questions

**Authentication:** Required
**Authorization:** Admin (all), Mentor (from their students), Student (own)

**Response (200 OK):**
```json
[
  {
    "id": "question_1",
    "question_text": "How do I set up the development environment?",
    "answer": "Follow the setup guide in the documentation...",
    "status": "Answered",
    "created_by": "john@example.com",
    "created_at": "2025-01-20T10:00:00Z"
  }
]
```

---

### POST /api/questions

**Description:** Create a new question (Students only)

**Authentication:** Required
**Authorization:** Student only

**Request:**
```json
{
  "question_text": "What are the project requirements?"
}
```

**Response (201 Created):**
```json
{
  "id": "question_2",
  "question_text": "What are the project requirements?",
  "answer": null,
  "status": "Pending",
  "created_by": "john@example.com",
  "created_at": "2025-01-21T09:00:00Z"
}
```

---

### PUT /api/questions/{id}

**Description:** Update/answer question

**Authentication:** Required
**Authorization:** Mentor (questions from their students), Admin

**Path Parameters:**
- `id`: Question ID

**Request:**
```json
{
  "answer": "The requirements are listed in the project brief document...",
  "status": "Answered"
}
```

**Response (200 OK):**
```json
{
  "id": "question_2",
  "question_text": "What are the project requirements?",
  "answer": "The requirements are listed in the project brief document...",
  "status": "Answered",
  "created_by": "john@example.com",
  "created_at": "2025-01-21T09:00:00Z"
}
```

---

### DELETE /api/questions/{id}

**Description:** Delete question (pending only)

**Authentication:** Required
**Authorization:** Student (own pending), Admin

**Path Parameters:**
- `id`: Question ID

**Response (204 No Content)**

---

## Documents Management

### GET /api/documents

**Description:** Retrieve documents (optionally filtered by student)

**Authentication:** Required
**Authorization:** Admin (all), Mentor (their students), Student (own)

**Query Parameters:**
- `student_email` (optional): Filter by student email

**Example:**
```
GET /api/documents?student_email=john@example.com
```

**Response (200 OK):**
```json
[
  {
    "id": "doc_1",
    "student_email": "john@example.com",
    "document_type": "ContractTemplate",
    "file_path": "/api/files/contract_uuid.pdf",
    "signed": true,
    "created_by": "mentor@example.com",
    "created_at": "2025-01-05T10:00:00Z"
  }
]
```

---

### POST /api/documents

**Description:** Upload/create document

**Authentication:** Required
**Authorization:** Admin, Mentor

**Request:**
```json
{
  "student_email": "jane@example.com",
  "document_type": "ConfidentialityAgreement",
  "file_path": "/api/files/agreement_uuid.pdf"
}
```

**Response (201 Created):**
```json
{
  "id": "doc_2",
  "student_email": "jane@example.com",
  "document_type": "ConfidentialityAgreement",
  "file_path": "/api/files/agreement_uuid.pdf",
  "signed": false,
  "created_by": "mentor@example.com",
  "created_at": "2025-01-22T10:00:00Z"
}
```

---

### DELETE /api/documents/{id}

**Description:** Delete document

**Authentication:** Required
**Authorization:** Admin, Mentor (their students)

**Path Parameters:**
- `id`: Document ID

**Response (204 No Content)**

---

## File Management

### POST /api/files/upload

**Description:** Upload a file (multipart/form-data)

**Authentication:** Required
**Authorization:** All authenticated users

**Request:**
```
POST /api/files/upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="screenshot.png"
Content-Type: image/png

[binary file data]
------WebKitFormBoundary--
```

**Response (200 OK):**
```json
{
  "file_url": "/api/files/a1b2c3d4-e5f6-7890.png",
  "filename": "a1b2c3d4-e5f6-7890.png"
}
```

**Supported File Types:**
- Images: jpg, png, gif
- Documents: pdf, txt
- Data: json, csv

---

### GET /api/files/{filename}

**Description:** Download/retrieve uploaded file

**Authentication:** Not required
**Authorization:** Public access

**Path Parameters:**
- `filename`: Filename with extension

**Response (200 OK):**
Binary file content with appropriate Content-Type header

**Example:**
```
GET /api/files/a1b2c3d4-e5f6-7890.png
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error description",
  "status": 400
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks permission for this resource |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error occurred |

---

## Data Types & Enums

### UserRole
```
enum UserRole {
  Student,
  Mentor,
  Admin
}
```

### TaskStatus
```
enum TaskStatus {
  Assigned,
  InProgress,
  Completed,
  Reviewed
}
```

### TimeEntryStatus
```
enum TimeEntryStatus {
  Draft,
  Submitted,
  Approved
}
```

### ProofType
```
enum ProofType {
  Git,
  Document,
  Photo
}
```

### QuestionStatus
```
enum QuestionStatus {
  Pending,
  Answered
}
```

### DocumentType
```
enum DocumentType {
  ContractTemplate,
  ConfidentialityAgreement,
  Other
}
```

---

## CORS & Headers

**CORS:** Enabled for all origins
**Content-Type:** application/json for all JSON requests/responses

---

## Database

**Type:** Sled (embedded key-value store)
**Storage Location:** `./data/` directory
**Persistence:** Automatic on every operation

---

## Changelog

### v1.0.0 (Initial Release)
- All 28 endpoints fully functional
- JWT authentication implemented
- Role-based access control
- File upload/download support
- Complete CRUD operations for all resources
