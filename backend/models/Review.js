const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Un avis est toujours écrit par un compte (userId obligatoire dans le schéma) ;
// son auteur affiché est le pseudo de l'utilisateur.
const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

module.exports = Review;
