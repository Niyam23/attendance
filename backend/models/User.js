const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: 'email_unique',
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('employee', 'admin'),
    defaultValue: 'employee'
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: 'mobileNumber_unique',
    validate: {
      is: /^[0-9]{10}$/
    }
  },
  isMobileVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Onboarding fields
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: 'employeeId_unique',
    comment: 'Company employee code'
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Employee full name'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Contact number'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: 'username_unique',
    comment: 'Login ID'
  },
  profilePhoto: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Image URL'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  maritalStatus: {
    type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
    allowNull: true
  },
  onboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether user has completed onboarding'
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      showHoursChart: true,
      showCheckInOutChart: true,
      showStatistics: true
    },
    comment: 'User dashboard preferences'
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && user.password.trim() !== '') {
        user.password = await bcrypt.hash(user.password, 10);
      } else {
        user.password = null;
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password && user.password.trim() !== '') {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;

