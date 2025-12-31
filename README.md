# Attendance Management System

A full-stack attendance management application with React frontend, Node.js backend, and MySQL database.

## Project Structure

```
attendance/
├── backend/          # Node.js/Express backend API
├── frontend/         # React frontend application
└── postman/          # Postman API collection
```

## Features

- User authentication (Register/Login)
- Check-in/Check-out functionality
- Attendance history with date filters
- Real-time status updates
- Admin dashboard (view all attendance)
- Responsive and modern UI
- JWT-based authentication
- RESTful API

## Tech Stack

### Backend
- Node.js
- Express.js
- Sequelize ORM
- MySQL
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- React 18
- React Router DOM
- Axios
- Lucide React (Icons)
- React Hot Toast

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Backend Setup

1. **Create the database in MySQL:**
   
   Open MySQL Workbench (or your MySQL client) and run:
   ```sql
   CREATE DATABASE attendance_db;
   ```

2. Navigate to backend directory:
```bash
cd backend
```

3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file:
```bash
cp .env.example .env
```

5. Update `.env` with your database credentials:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=attendance_db
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Qikberry SMS Configuration (Optional)
QIKBERRY_API_KEY=e88cb7d9372c05cd652d3a3a17db6075
QIKBERRY_SENDER=QBERRY
QIKBERRY_TEMPLATE_ID=1707161528616464235
```

**Important:** Replace `your_mysql_password_here` with your actual MySQL root password.

6. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

**Note:** When you start the server, Sequelize will automatically:
- Connect to your MySQL database
- Create all tables (Users, Attendances, OTPVerifications) if they don't exist
- Update tables if schema changes

The backend will run on `http://localhost:5000`

For detailed database setup instructions, see `backend/DATABASE_SETUP.md`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Attendance
- `POST /api/attendance/checkin` - Check in (requires auth)
- `POST /api/attendance/checkout` - Check out (requires auth)
- `GET /api/attendance/today-status` - Get today's status (requires auth)
- `GET /api/attendance/my-attendance` - Get my attendance history (requires auth)
- `GET /api/attendance/all` - Get all attendance (admin only)

### Health Check
- `GET /api/health` - Server health check

## Postman Collection

Import the Postman collection from `postman/Attendance_API_Collection.json` to test all API endpoints.

The collection includes:
- Environment variables (base_url, token)
- All authentication endpoints
- All attendance endpoints
- Pre-configured requests with example data

## Usage

1. Start the backend server
2. Start the frontend development server
3. Register a new user or login
4. Use the dashboard to check in/out
5. View attendance history

## Database Schema

### Users Table
- id (Primary Key)
- name
- email (Unique)
- password (Hashed)
- role (employee/admin)

### Attendance Table
- id (Primary Key)
- userId (Foreign Key)
- checkIn (DateTime)
- checkOut (DateTime)
- status (present/absent/half-day)
- notes (Text)

## License

ISC

