const { Recipe, User } = require('../models/Recipe');

exports.createRecipe = async (req, res) => {
  try {
    const { title, ingredients, instructions, prepTime, category } = req.body;
    // On récupère automatiquement l'ID de l'utilisateur connecté via le token !
    const newRecipe = await Recipe.create({
      title,
      ingredients,
      instructions,
      prepTime,
      category,
      userId: req.user.id
    });
    res.status(201).json({ message: 'Recette créée avec succès !', recipe: newRecipe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de la recette.' });
  }
};

exports.getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.findAll({
      include: { model: User, attributes: ['id', 'username'] },
      order: [['createdAt', 'DESC']] // Les plus récentes en premier
    });
    res.status(200).json(recipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des recettes.' });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findByPk(id);

    if (!recipe) {
      return res.status(404).json({ error: 'Recette non trouvée.' });
    }

    // 🔒 Vérification du propriétaire
    if (recipe.userId !== req.user.id) {
      return res.status(403).json({ error: 'Action interdite : vous n’êtes pas l’auteur de cette recette.' });
    }

    await recipe.update(req.body);
    res.status(200).json({ message: 'Recette mise à jour avec succès !', recipe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la modification.' });
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findByPk(id);

    if (!recipe) {
      return res.status(404).json({ error: 'Recette non trouvée.' });
    }

    // 🔒 Vérification du propriétaire
    if (recipe.userId !== req.user.id) {
      return res.status(403).json({ error: 'Action interdite : vous n’êtes pas l’auteur de cette recette.' });
    }

    await recipe.destroy();
    res.status(200).json({ message: 'Recette supprimée avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
};