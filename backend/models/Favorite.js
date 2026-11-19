const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Un favori = un utilisateur + une recette
const Favorite = sequelize.define('Favorite', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  recipeId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  }
});

module.exports = Favorite;
