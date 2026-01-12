const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeaveHistory = sequelize.define('LeaveHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  leaveRequestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'LeaveRequests',
      key: 'id'
    },
    comment: 'Reference to the leave request'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who owns the leave request'
  },
  action: {
    type: DataTypes.ENUM('requested', 'approved', 'rejected', 'cancelled', 'modified'),
    allowNull: false,
    comment: 'Action performed on the leave request'
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User ID who performed the action (employee for requested/cancelled, admin for approved/rejected)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the action'
  },
  previousStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: true,
    comment: 'Previous status before the action (useful for modifications)'
  },
  newStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: true,
    comment: 'New status after the action'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['leaveRequestId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = LeaveHistory;
