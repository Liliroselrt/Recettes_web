const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prepTime: {
    type: DataTypes.INTEGER, 
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Plat'
  }
});

User.hasMany(Recipe, { onDelete: 'CASCADE' });
Recipe.belongsTo(User);

module.exports = Recipe;