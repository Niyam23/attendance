const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveBalance = sequelize.define('LeaveBalance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  leaveType: {
    type: DataTypes.ENUM('sick', 'casual', 'annual', 'maternity', 'paternity', 'compensatory', 'unpaid'),
    allowNull: false
  },
  totalDays: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total allocated days for this leave type'
  },
  usedDays: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total days used/approved'
  },
  remainingDays: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
    comment: 'Remaining available days (calculated as totalDays - usedDays)'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: new Date().getFullYear(),
    comment: 'Year for which this balance is valid'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the leave balance'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'leaveType', 'year'],
      name: 'unique_user_leave_type_year'
    }
  ]
});

module.exports = LeaveBalance;
