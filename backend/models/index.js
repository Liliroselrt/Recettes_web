const User = require('./User');
const Recipe = require('./Recipe');
const Review = require('./Review');
const Favorite = require('./Favorite');
const RecipeLike = require('./RecipeLike');
const UserFollow = require('./UserFollow');
const CookedRecipe = require('./CookedRecipe');

User.hasMany(Recipe, { foreignKey: 'userId', onDelete: 'CASCADE' });
Recipe.belongsTo(User, { foreignKey: 'userId' });

Recipe.hasMany(Review, { foreignKey: { name: 'recipeId', allowNull: false }, onDelete: 'CASCADE' });
Review.belongsTo(Recipe, { foreignKey: 'recipeId' });
User.hasMany(Review, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Favorite, { foreignKey: 'userId', onDelete: 'CASCADE' });
Recipe.hasMany(Favorite, { foreignKey: 'recipeId', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Favorite.belongsTo(Recipe, { foreignKey: 'recipeId' });

Recipe.hasOne(RecipeLike, { foreignKey: 'recipeId', onDelete: 'CASCADE' });
RecipeLike.belongsTo(Recipe, { foreignKey: 'recipeId' });

module.exports = { User, Recipe, Review, Favorite, RecipeLike, UserFollow, CookedRecipe };
