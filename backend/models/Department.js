const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Department name (e.g., Human Resources, Information Technology)'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Short code for department (e.g., HR, IT, SALES)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the department'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the department is active'
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['code'] },
    { fields: ['isActive'] }
  ]
});

module.exports = Department;
