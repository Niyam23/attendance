const { Sequelize } = require('sequelize');
require('dotenv').config();

// Debug: Log environment variables (remove password in production)
console.log('DB Config:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'attendance_db',
  password: process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***'
});

const sequelize = new Sequelize(
  process.env.DB_NAME || 'attendance_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;

