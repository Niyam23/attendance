const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFaceProfile = sequelize.define('UserFaceProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  faceEmbedding: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Face embeddings (JSON array of 128-dimensional vectors) - stores multiple embeddings per user'
  },
  embeddingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of embeddings stored for this user'
  },
  modelVersion: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'facenet-20170512',
    comment: 'FaceNet model version used'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this face profile is active'
  }
}, {
  timestamps: true,
  tableName: 'UserFaceProfiles'
});

module.exports = UserFaceProfile;
