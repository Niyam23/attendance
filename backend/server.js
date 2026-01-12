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
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

