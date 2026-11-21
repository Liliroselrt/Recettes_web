const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Historique des recettes faites : une ligne à chaque fois qu'une personne indique avoir cuisiné une recette.
// Le titre et l'image sont recopiés (« snapshot ») : l'historique reste lisible même si la recette
// est supprimée ensuite (recipeId passe alors à NULL).
const CookedRecipe = sequelize.define('CookedRecipe', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  recipeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  recipeTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recipeImage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  note: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  cookedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'CookedRecipes'
});

module.exports = CookedRecipe;
