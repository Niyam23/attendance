# Database Setup Guide

This guide will help you set up your local MySQL database for the Attendance Management System.

## Prerequisites

- MySQL Server installed and running
- MySQL Workbench (or any MySQL client) installed
- Node.js and npm installed

## Step-by-Step Setup

### Step 1: Create the Database

Open MySQL Workbench (or your MySQL client) and run:

```sql
CREATE DATABASE attendance_db;
```

Or if you want to use a different database name, update it in your `.env` file.

### Step 2: Configure Environment Variables

1. Navigate to the `backend` folder
2. Create a `.env` file (if it doesn't exist)
3. Add your database credentials:

```env
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

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Start the Server

```bash
npm start
```

or for development with auto-reload:

```bash
npm run dev
```

### Step 5: Verify Tables Are Created

When you start the server, Sequelize will automatically:
- Connect to your database
- Create all tables if they don't exist
- Update tables if schema changes (due to `alter: true`)

You should see these messages in the console:
```
Database connection established successfully.
Database synchronized.
Server is running on port 5000
```

### Step 6: Verify in MySQL Workbench

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Select the `attendance_db` database
4. You should see these tables:
   - `Users` - User accounts
   - `Attendances` - Attendance records
   - `OTPVerifications` - OTP records

## Database Tables Structure

### Users Table
- `id` (INTEGER, Primary Key, Auto Increment)
- `name` (STRING)
- `email` (STRING, Unique)
- `password` (STRING, Hashed)
- `role` (ENUM: 'employee', 'admin')
- `mobileNumber` (STRING, Optional)
- `createdAt` (DATE)
- `updatedAt` (DATE)

### Attendances Table
- `id` (INTEGER, Primary Key, Auto Increment)
- `userId` (INTEGER, Foreign Key to Users)
- `checkIn` (DATE)
- `checkOut` (DATE)
- `status` (ENUM: 'present', 'absent', 'half-day')
- `notes` (TEXT, Optional)
- `createdAt` (DATE)
- `updatedAt` (DATE)

### OTPVerifications Table
- `id` (INTEGER, Primary Key, Auto Increment)
- `mobileNumber` (STRING)
- `otp` (STRING)
- `expiresAt` (DATE)
- `isVerified` (BOOLEAN, Default: false)
- `verifiedAt` (DATE, Optional)
- `createdAt` (DATE)
- `updatedAt` (DATE)

## Troubleshooting

### Error: "Access denied for user"
- Check your MySQL username and password in `.env`
- Make sure MySQL server is running
- Verify the user has permission to create databases

### Error: "Unknown database"
- Make sure you've created the database first (Step 1)
- Check the database name in `.env` matches the created database

### Tables not created
- Check the console for error messages
- Make sure the database connection is successful
- Verify Sequelize has permission to create tables

### Connection timeout
- Check if MySQL server is running
- Verify `DB_HOST` is correct (usually `localhost`)
- Check MySQL port (default is 3306)

## Manual Table Creation (Optional)

If you prefer to create tables manually, here are the SQL scripts:

```sql
USE attendance_db;

CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('employee', 'admin') DEFAULT 'employee',
  mobileNumber VARCHAR(10),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS Attendances (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  userId INTEGER NOT NULL,
  checkIn DATETIME NOT NULL,
  checkOut DATETIME,
  status ENUM('present', 'absent', 'half-day') DEFAULT 'present',
  notes TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS OTPVerifications (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  mobileNumber VARCHAR(10) NOT NULL,
  otp VARCHAR(4) NOT NULL,
  expiresAt DATETIME NOT NULL,
  isVerified BOOLEAN DEFAULT FALSE,
  verifiedAt DATETIME,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

However, **Sequelize will handle this automatically** when you start the server, so manual creation is not necessary.

## Testing the Database

After setup, you can test by:

1. **Register a user** via API:
```bash
POST http://localhost:5000/api/auth/register
Body: {
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

2. **Check in MySQL Workbench** - You should see the user in the `Users` table

3. **Send OTP** via API:
```bash
POST http://localhost:5000/api/otp/send
Body: {
  "mobileNumber": "9876543210"
}
```

4. **Check in MySQL Workbench** - You should see the OTP record in the `OTPVerifications` table

## Notes

- Sequelize uses `sync({ alter: true })` which will automatically create/update tables
- Data persists in your MySQL database
- All CRUD operations are handled by Sequelize ORM
- The database connection is managed automatically

