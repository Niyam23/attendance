const sequelize = require('../config/database');
const User = require('./User');
const Attendance = require('./Attendance');
const OTPVerification = require('./OtpVerification');
const PasswordReset = require('./PasswordReset');
const LeaveBalance = require('./LeaveBalance');
const LeaveRequest = require('./LeaveRequest');
const LeaveHistory = require('./LeaveHistory');
const PublicHoliday = require('./PublicHoliday');
const Department = require('./Department');

// Define associations

// User - Attendance associations
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - LeaveBalance associations
User.hasMany(LeaveBalance, { foreignKey: 'userId', as: 'leaveBalances' });
LeaveBalance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - LeaveRequest associations (employee)
User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

// User - LeaveRequest associations (approver)
User.hasMany(LeaveRequest, { foreignKey: 'approvedBy', as: 'approvedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// User - LeaveRequest associations (rejecter)
User.hasMany(LeaveRequest, { foreignKey: 'rejectedBy', as: 'rejectedLeaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'rejectedBy', as: 'rejecter' });

// LeaveRequest - LeaveHistory associations
LeaveRequest.hasMany(LeaveHistory, { foreignKey: 'leaveRequestId', as: 'history' });
LeaveHistory.belongsTo(LeaveRequest, { foreignKey: 'leaveRequestId', as: 'leaveRequest' });

// User - LeaveHistory associations (employee)
User.hasMany(LeaveHistory, { foreignKey: 'userId', as: 'leaveHistories' });
LeaveHistory.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

// User - LeaveHistory associations (performedBy)
User.hasMany(LeaveHistory, { foreignKey: 'performedBy', as: 'performedLeaveHistories' });
LeaveHistory.belongsTo(User, { foreignKey: 'performedBy', as: 'performer' });

// PublicHoliday associations
User.hasMany(PublicHoliday, { foreignKey: 'createdBy', as: 'createdHolidays' });
PublicHoliday.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// User - Department associations
Department.hasMany(User, { foreignKey: 'departmentId', as: 'employees' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

module.exports = {
  sequelize,
  User,
  Attendance,
  OTPVerification,
  PasswordReset,
  LeaveBalance,
  LeaveRequest,
  LeaveHistory,
  PublicHoliday,
  Department
};

