# Company Multi-Tenancy System

## Overview
The intern tracker now supports company-based multi-tenancy. Each company gets a unique key that links all their users (admins, mentors, students) together.

## Architecture

### Database Schema
- **companies** table: Stores company information
  - `id`: Primary key
  - `name`: Unique company name
  - `companyKey`: Auto-generated unique key (32-character hex)
  - `description`: Optional company description
  - `industry`: Optional industry classification
  - `isActive`: Company status
  - `createdAt`, `updatedAt`: Timestamps

- **users** table: Enhanced with company relationship
  - `company_id`: Foreign key to companies
  - `companyKey`: Stored for reference
  - Relationship: Many users belong to one company

- **students** table: Already has company_id for filtering

### How It Works

#### 1. Company Registration Flow
1. Admin visits `/company-setup`
2. Fills company information (name, industry, description)
3. System generates unique company key (e.g., "A1B2C3D4E5F6...")
4. Key is displayed once - must be saved!

#### 2. User Registration Flow
1. User visits login page, clicks "Sign up here"
2. Enters: full name, email, password, **company key**, role
3. System validates company key
4. User is linked to company via `company_id`
5. All data access is filtered by company

#### 3. Role-Based Company Access

**Admin:**
- See ALL students and mentors in their company
- Assign students to mentors within company
- Add/remove projects and programs
- Generate company-wide reports and analytics
- Manage system settings for company
- View company statistics

**Mentor:**
- See only students assigned to them (within same company)
- Give tasks to assigned students
- Review student submissions
- Submit reports to admin
- Send messages to admin
- Cannot see other mentors' students

**Student:**
- See their own tasks from their mentor
- Submit work and proof
- Track their own hours
- View their progress
- Access student dashboard features

### API Endpoints

#### Company Endpoints
```
POST   /api/companies              - Create new company (public)
GET    /api/companies              - Get all companies (admin only)
GET    /api/companies/:id          - Get company by ID
GET    /api/companies/key/:key     - Validate company key
GET    /api/companies/:id/stats    - Get company statistics
PATCH  /api/companies/:id          - Update company
DELETE /api/companies/:id          - Delete company
```

#### User Endpoints
```
GET    /api/users                  - Get all users in company
GET    /api/users?role=mentor      - Get mentors in company
GET    /api/users?role=student     - Get students in company
GET    /api/users?role=admin       - Get admins in company
GET    /api/users/me               - Get current user profile
```

#### Student Endpoints (Company-Filtered)
```
GET    /api/students                           - Get students (filtered by company)
GET    /api/students?mentor_email=x@y.com     - Get students by mentor (in company)
GET    /api/students?student_email=x@y.com    - Get specific student (if in company)
POST   /api/students                           - Create student
PUT    /api/students/:id                       - Update student
DELETE /api/students/:id                       - Delete student
```

### Frontend Components

#### New Pages
1. **`/company-setup`** - Company registration page
   - Form to create new company
   - Displays generated company key
   - Instructions for team setup

2. **Enhanced `/login`** - Login/signup page
   - Added company key field to signup form
   - Link to company setup page
   - Validation of company key on registration

### Security Features

1. **Company Isolation**
   - All queries automatically filter by `company_id`
   - Users can only see data from their company
   - JWT token includes `company_id` in payload

2. **Key Validation**
   - Company key required for registration
   - Key validated against database
   - Invalid key prevents account creation

3. **Role-Based Access**
   - Admins: Full company access
   - Mentors: Filtered to assigned students
   - Students: Own data only

### Usage Instructions

#### For Company Admins Setting Up:

1. Go to `/company-setup`
2. Enter company details
3. Copy and securely save the generated key
4. Share key with team members (admins, mentors, students)
5. Each person registers using the company key

#### For Team Members Joining:

1. Get company key from admin
2. Click "Sign up" on login page
3. Fill in personal details
4. Enter company key
5. Select appropriate role
6. Register and start using the system

### Benefits

✅ **Isolation**: Companies can't see each other's data
✅ **Scalability**: Support multiple companies on same instance
✅ **Security**: Company-scoped authentication
✅ **Admin Control**: Admins manage their company users
✅ **Mentor Management**: See assigned students only
✅ **Analytics**: Company-specific reporting
✅ **Flexibility**: Add/remove users per company

### Example Workflow

**TechCorp Setup:**
1. Admin creates "TechCorp" company
2. Gets key: `A1B2C3D4E5F6789...`
3. Shares with team

**Users Join:**
- alice@techcorp.com (admin, key: A1B2...)
- bob@techcorp.com (mentor, key: A1B2...)
- charlie@techcorp.com (student, key: A1B2...)

**Data Access:**
- Alice (admin): Sees Bob and Charlie
- Bob (mentor): Sees only students assigned to him
- Charlie (student): Sees only his own tasks

**Another Company:**
- StartupXYZ creates company with key: `X9Y8Z7W6...`
- Their users completely isolated from TechCorp
- No data overlap or visibility

### Database Queries Examples

**Admin viewing students:**
```sql
SELECT * FROM students WHERE company_id = 1
```

**Mentor viewing assigned students:**
```sql
SELECT * FROM students 
WHERE company_id = 1 AND mentor_email = 'mentor@company.com'
```

**Student viewing own data:**
```sql
SELECT * FROM students 
WHERE company_id = 1 AND student_email = 'student@company.com'
```

### Migration Notes

If you have existing data:
1. Create a default company for existing users
2. Update all users with `company_id = 1`
3. Update all students with `company_id = 1`
4. New companies start with fresh data

### Testing

1. **Create Company Test:**
   - Visit `/company-setup`
   - Create "Test Company"
   - Note the generated key

2. **Registration Test:**
   - Use company key to register as admin
   - Use same key to register as mentor
   - Use same key to register as student

3. **Isolation Test:**
   - Create second company with different key
   - Register users with second key
   - Verify first company can't see second company's data

4. **Access Control Test:**
   - Login as admin - should see all company users
   - Login as mentor - should see only assigned students
   - Login as student - should see only own data

### API Client Methods

Frontend can now use:
```javascript
// Company management
await apiClient.createCompany({ name, description, industry })
await apiClient.getCompanyByKey(key)
await apiClient.getCompanyStats(companyId)

// User management
await apiClient.getUsers()           // All users in company
await apiClient.getMentors()          // All mentors in company
await apiClient.getStudentUsers()     // All student-users in company
await apiClient.getAdmins()           // All admins in company

// Register with company key
await userStore.register({ 
  email, 
  password, 
  full_name, 
  role, 
  companyKey 
})
```

### Future Enhancements

Potential additions:
- Company settings/preferences
- Company branding/logo
- Subscription/billing per company
- Company-wide announcements
- Inter-company messaging (if needed)
- Company analytics dashboard
- Bulk user import via CSV
- Company admin delegation
