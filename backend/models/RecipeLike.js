const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Likes de départ de la communauté (table RecipeLikes du schéma, une ligne par recette)
const RecipeLike = sequelize.define('RecipeLike', {
  recipeId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: false
});

module.exports = RecipeLike;
