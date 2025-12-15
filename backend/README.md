# Internship Tracker Backend (NestJS)

A complete NestJS backend API for the internship tracking application.

## Features

- **Authentication**: JWT-based auth with login/register endpoints
- **Users**: User management with roles (admin, mentor, student)
- **Students**: Student contract management
- **Time Entries**: Track daily work hours with approval workflow
- **Tasks**: Task assignment and tracking
- **Schedules**: Event and meeting scheduling
- **Database**: SQLite (no external database installation required)

## Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure Database

Create a `.env` file in the backend directory:

```env
DB_DATABASE=intern_tracker.db

JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

Or simply copy the example:

```bash
cp .env.example .env
```

**Note:** Using SQLite - no database installation required! The database file will be created automatically.

### 3. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile

### Students
- `GET /api/students` - Get all students (role-based filtering)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Time Entries
- `GET /api/time-entries` - Get time entries (filterable by student_id, status)
- `GET /api/time-entries/:id` - Get time entry by ID
- `POST /api/time-entries` - Create time entry
- `PUT /api/time-entries/:id` - Update time entry
- `DELETE /api/time-entries/:id` - Delete time entry

### Tasks
- `GET /api/tasks` - Get tasks (filterable by student_id)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Schedules
- `GET /api/schedules` - Get schedules (filterable by student_id)
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

## Database Schema

The application uses SQLite with TypeORM. The database file (`intern_tracker.db`) and tables are automatically created on first run with `synchronize: true`.

### Tables:
- `users` - User accounts with authentication
- `students` - Student contracts and profiles
- `time_entries` - Daily time tracking records
- `tasks` - Task assignments
- `schedules` - Events and meetings

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "Admin User",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Get Current User (with JWT token)
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Connecting Frontend

Update `vite.config.mjs` proxy to point to the NestJS backend:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

Then set `offlineMode = false` in your frontend stores to use the real backend.

## Production Deployment

1. Set `synchronize: false` in `app.module.ts`
2. Use proper environment variables
3. Set up migrations for database schema changes
4. Enable HTTPS and proper CORS settings
5. Use a process manager like PM2

## License

MIT
