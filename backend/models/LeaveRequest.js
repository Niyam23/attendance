const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Start date of leave'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'End date of leave'
  },
  totalDays: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    comment: 'Total number of days requested (calculated excluding weekends/holidays)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Reason for leave request'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User ID of the approver (admin/manager)'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date and time when leave was approved'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for rejection if status is rejected'
  },
  rejectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User ID of the person who rejected'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date and time when leave was rejected'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Array of file URLs/paths for attachments (medical certificates, etc.)'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['leaveType']
    },
    {
      fields: ['startDate', 'endDate']
    }
  ]
});

module.exports = LeaveRequest;
