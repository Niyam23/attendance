const sequelize = require('../config/database');
const User = require('./User');
const Attendance = require('./Attendance');
const OTPVerification = require('./OtpVerification');
const PasswordReset = require('./PasswordReset');

// Define associations
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Attendance,
  OTPVerification,
  PasswordReset
};

