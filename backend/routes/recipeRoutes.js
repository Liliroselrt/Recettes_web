const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const authMiddleware = require('../middleware/AuthMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

// Lecture : visiteurs (recettes partagées) ou connectés (+ leurs recettes privées)
router.get('/', optionalAuth, recipeController.getAllRecipes);

router.post('/', authMiddleware, recipeController.createRecipe);
router.put('/:id', authMiddleware, recipeController.updateRecipe);
router.patch('/:id/share', authMiddleware, recipeController.shareRecipe);
router.delete('/:id', authMiddleware, recipeController.deleteRecipe);

router.post('/:id/reviews', authMiddleware, recipeController.addReview);
router.post('/:id/favorite', authMiddleware, recipeController.toggleFavorite);

module.exports = router;
