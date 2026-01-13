const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/face', require('./routes/faceRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Initialize Face Recognition Service (Python microservice)
    try {
      const faceNetService = require('./services/faceNetService');
      await faceNetService.initialize();
      console.log('✓ Face Recognition Service initialized successfully');
    } catch (error) {
      console.warn('⚠ Face Recognition Service initialization failed:', error.message);
      console.warn('⚠ Make sure Python service is running on', process.env.PYTHON_SERVICE_URL || 'http://localhost:5001');
    }

    // Create UserFaceProfiles table if it doesn't exist
    try {
      const [tableExists] = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'UserFaceProfiles'
      `);
      
      if (tableExists.length === 0) {
        console.log('Creating UserFaceProfiles table...');
        await sequelize.query(`
          CREATE TABLE UserFaceProfiles (
            id INTEGER AUTO_INCREMENT PRIMARY KEY,
            userId INTEGER NOT NULL UNIQUE,
            faceEmbedding TEXT NOT NULL,
            embeddingCount INTEGER DEFAULT 1,
            modelVersion VARCHAR(255) DEFAULT 'face-recognition-python',
            isActive BOOLEAN DEFAULT TRUE,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ UserFaceProfiles table created successfully');
      } else {
        // Check if embeddingCount column exists, add if not
        const [columns] = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'UserFaceProfiles' 
          AND COLUMN_NAME = 'embeddingCount'
        `);
        
        if (columns.length === 0) {
          console.log('Adding embeddingCount column to UserFaceProfiles table...');
          await sequelize.query(`
            ALTER TABLE UserFaceProfiles 
            ADD COLUMN embeddingCount INTEGER DEFAULT 1
          `);
          console.log('✓ embeddingCount column added successfully');
        }
        
        console.log('✓ UserFaceProfiles table already exists');
      }
    } catch (error) {
      console.error('Warning: Could not create UserFaceProfiles table:', error.message);
    }

    // Manually add departmentId column if it doesn't exist (BEFORE sync to avoid constraint issues)
    try {
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Users' 
        AND COLUMN_NAME = 'departmentId'
      `);
      
      if (results.length === 0) {
        console.log('Adding departmentId column to Users table...');
        await sequelize.query(`
          ALTER TABLE Users 
          ADD COLUMN departmentId INTEGER NULL COMMENT 'Department ID'
        `);
        console.log('✓ departmentId column added successfully');
      } else {
        console.log('✓ departmentId column already exists');
      }
    } catch (error) {
      console.error('Warning: Could not add departmentId column:', error.message);
      // Continue anyway - column might already exist or table doesn't exist yet
    }

    // Manually add checkInPhoto and checkOutPhoto columns if they don't exist
    try {
      const [checkInPhotoResults] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Attendances' 
        AND COLUMN_NAME = 'checkInPhoto'
      `);
      
      if (checkInPhotoResults.length === 0) {
        console.log('Adding checkInPhoto column to Attendances table...');
        await sequelize.query(`
          ALTER TABLE Attendances 
          ADD COLUMN checkInPhoto VARCHAR(255) NULL COMMENT 'Check-in face photo path'
        `);
        console.log('✓ checkInPhoto column added successfully');
      }

      const [checkOutPhotoResults] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Attendances' 
        AND COLUMN_NAME = 'checkOutPhoto'
      `);
      
      if (checkOutPhotoResults.length === 0) {
        console.log('Adding checkOutPhoto column to Attendances table...');
        await sequelize.query(`
          ALTER TABLE Attendances 
          ADD COLUMN checkOutPhoto VARCHAR(255) NULL COMMENT 'Check-out face photo path'
        `);
        console.log('✓ checkOutPhoto column added successfully');
      } else {
        console.log('✓ Attendance photo columns already exist');
      }

      // Add break columns if they don't exist
      const breakColumns = [
        { name: 'break1Start', comment: 'Break 1 start time' },
        { name: 'break1End', comment: 'Break 1 end time' },
        { name: 'break2Start', comment: 'Break 2 start time' },
        { name: 'break2End', comment: 'Break 2 end time' },
        { name: 'lunchStart', comment: 'Lunch break start time' },
        { name: 'lunchEnd', comment: 'Lunch break end time' }
      ];

      for (const col of breakColumns) {
        const [results] = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'Attendances' 
          AND COLUMN_NAME = '${col.name}'
        `);
        
        if (results.length === 0) {
          await sequelize.query(`
            ALTER TABLE Attendances 
            ADD COLUMN ${col.name} DATETIME NULL COMMENT '${col.comment}'
          `);
          console.log(`✓ ${col.name} column added successfully`);
        }
      }
      console.log('✓ All break columns checked');
    } catch (error) {
      console.error('Warning: Could not add attendance columns:', error.message);
      // Continue anyway - columns might already exist or table doesn't exist yet
    }

    // Sync database (creates tables if they don't exist)
    // Using alter: false to prevent constraint/key issues
    // Columns are added manually above if needed
    await sequelize.sync({ alter: false });
    console.log('Database synchronized.');

    // Auto-seed departments if none exist
    try {
      const { Department } = require('./models');
      const { Op } = require('sequelize');
      
      const departmentCount = await Department.count();
      if (departmentCount === 0) {
        console.log('No departments found. Seeding default departments...');
        
        const defaultDepartments = [
          { name: 'Human Resources', code: 'HR', description: 'Human Resources and People Management', isActive: true },
          { name: 'Information Technology', code: 'IT', description: 'Information Technology and Systems', isActive: true },
          { name: 'Sales', code: 'SALES', description: 'Sales and Business Development', isActive: true },
          { name: 'Marketing', code: 'MKTG', description: 'Marketing and Communications', isActive: true },
          { name: 'Finance', code: 'FIN', description: 'Finance and Accounting', isActive: true },
          { name: 'Operations', code: 'OPS', description: 'Operations and Administration', isActive: true },
          { name: 'Customer Support', code: 'CS', description: 'Customer Support and Service', isActive: true },
          { name: 'Product Development', code: 'PROD', description: 'Product Development and Engineering', isActive: true },
          { name: 'Quality Assurance', code: 'QA', description: 'Quality Assurance and Testing', isActive: true },
          { name: 'Legal', code: 'LEGAL', description: 'Legal and Compliance', isActive: true },
          { name: 'Research & Development', code: 'R&D', description: 'Research and Development', isActive: true },
          { name: 'Business Development', code: 'BD', description: 'Business Development and Partnerships', isActive: true },
          { name: 'Supply Chain', code: 'SCM', description: 'Supply Chain and Logistics', isActive: true },
          { name: 'Manufacturing', code: 'MFG', description: 'Manufacturing and Production', isActive: true },
          { name: 'Design', code: 'DESIGN', description: 'Design and Creative', isActive: true },
          { name: 'Security', code: 'SEC', description: 'Security and Safety', isActive: true },
          { name: 'Training & Development', code: 'T&D', description: 'Training and Development', isActive: true },
          { name: 'Administration', code: 'ADMIN', description: 'General Administration', isActive: true }
        ];

        for (const dept of defaultDepartments) {
          const existing = await Department.findOne({
            where: {
              [Op.or]: [
                { name: dept.name },
                { code: dept.code }
              ]
            }
          });

          if (!existing) {
            await Department.create(dept);
          }
        }

        const finalCount = await Department.count();
        console.log(`✓ Default departments seeded successfully. Total departments: ${finalCount}`);
      } else {
        console.log(`✓ Departments already exist. Total departments: ${departmentCount}`);
      }
    } catch (error) {
      console.error('Warning: Error seeding departments:', error.message);
      // Don't exit - server can still run without departments (they can be added manually)
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://192.168.1.29:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

