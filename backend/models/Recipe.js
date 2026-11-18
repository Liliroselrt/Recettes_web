const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { parseIngredients, serializeIngredients } = require('../utils/ingredients');

// La base garde les catégories en français ; l'API et l'interface parlent anglais.
const CATEGORY_TO_DB = { Starter: 'Entrée', Main: 'Plat', Dessert: 'Dessert', Quick: 'Rapide' };
const DB_TO_CATEGORY = Object.fromEntries(Object.entries(CATEGORY_TO_DB).map(([en, fr]) => [fr, en]));

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
  // En base : une ligne de texte par ingrédient. Ici : [{ name, quantity, unit }]
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() { return parseIngredients(this.getDataValue('ingredients')); },
    set(list) { this.setDataValue('ingredients', serializeIngredients(list)); }
  },
  // Une étape de préparation par ligne
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
    defaultValue: 'Plat',
    get() { const raw = this.getDataValue('category'); return DB_TO_CATEGORY[raw] || raw; },
    set(value) { this.setDataValue('category', CATEGORY_TO_DB[value] || value); }
  },
  // Image de couverture (colonne d'origine du schéma). Elle est toujours égale à la
  // première image de `images`, pour que les autres développements puissent l'utiliser.
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Toutes les images (JSON). S'il est vide, on retombe sur `imageUrl`.
  images: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      let list = [];
      try { list = JSON.parse(this.getDataValue('images') || '[]'); } catch { list = []; }
      if (Array.isArray(list) && list.length) return list;
      const cover = this.getDataValue('imageUrl');
      return cover ? [cover] : [];
    },
    set(list) { this.setDataValue('images', JSON.stringify(list || [])); }
  },
  // FALSE = recette privée ("My Creations"). Les recettes déjà présentes en base sont partagées.
  shared: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sharedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Recipe;
