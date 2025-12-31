# Attendance Backend API

Backend API for the Attendance Management System built with Node.js, Express, Sequelize, and MySQL.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Create a `.env` file in the `backend` folder with your database credentials:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=attendance_db
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Qikberry SMS Configuration (Optional - defaults provided)
QIKBERRY_API_KEY=e88cb7d9372c05cd652d3a3a17db6075
QIKBERRY_SENDER=QBERRY
QIKBERRY_TEMPLATE_ID=1707161528616464235
```

**Important:** 
- Replace `DB_PASSWORD=root` with your actual MySQL password
- If your MySQL uses a different port (like 3006 or 3007), change `DB_PORT=3306` to your port number

4. Create the database in MySQL:
```sql
CREATE DATABASE attendance_db;
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Attendance
- `POST /api/attendance/checkin` - Check in (requires auth)
- `POST /api/attendance/checkout` - Check out (requires auth)
- `GET /api/attendance/my-attendance` - Get my attendance history (requires auth)
- `GET /api/attendance/today-status` - Get today's status (requires auth)
- `GET /api/attendance/all` - Get all attendance (admin only)

### OTP Verification
- `POST /api/otp/send` - Send OTP to mobile number (via Qikberry SMS)
- `POST /api/otp/verify` - Verify OTP

## Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

