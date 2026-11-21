const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Un abonnement = une personne (followerId) qui suit un chef (followingId).
// Table `UserFollows` déjà présente dans database/gourmetcraft_schema.sql (pas de colonne updatedAt).
const UserFollow = sequelize.define('UserFollow', {
  followerId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  followingId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  }
}, {
  tableName: 'UserFollows',
  updatedAt: false
});

module.exports = UserFollow;
