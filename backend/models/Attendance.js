const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
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
  checkIn: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'half-day'),
    defaultValue: 'present'
  },
  checkInPhoto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  checkOutPhoto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  break1Start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  break1End: {
    type: DataTypes.DATE,
    allowNull: true
  },
  break2Start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  break2End: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lunchStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lunchEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Attendance;

