const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PublicHoliday = sequelize.define('PublicHoliday', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of the holiday'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of the holiday'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: new Date().getFullYear(),
    comment: 'Year of the holiday'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this holiday repeats every year'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the holiday'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who created this holiday'
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['date'] },
    { fields: ['year'] },
    { unique: true, fields: ['date', 'year'] }
  ]
});

module.exports = PublicHoliday;
