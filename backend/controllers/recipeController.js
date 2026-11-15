const Recipe = require('../models/Recipe');
const User = require('../models/User');

exports.createRecipe = async (req, res) => {
    try {
        const { title, ingredients, instructions, prepTime, category, UserId } = req.body;
        const newRecipe = await Recipe.create({ title, ingredients, instructions, prepTime, category, UserId });
        res.status(201).json({ message: "Recette créée avec succès !", recipe: newRecipe });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la création de la recette." });
    }
};

exports.getAllRecipes = async (req, res) => {
    try {
        const recipes = await Recipe.findAll({
            include: { model: User, attributes: ['username'] } // Affiche le nom de l'auteur
        });
        res.status(200).json(recipes);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des recettes." });
    }
};

exports.updateRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Recipe.update(req.body, { where: { id } });
        if (updated) {
            const updatedRecipe = await Recipe.findByPk(id);
            return res.status(200).json({ message: "Recette mise à jour avec succès !", recipe: updatedRecipe });
        }
        res.status(404).json({ error: "Recette non trouvée." });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la modification." });
    }
};

exports.deleteRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Recipe.destroy({ where: { id } });
        if (deleted) {
            return res.status(200).json({ message: "Recette supprimée avec succès !" });
        }
        res.status(404).json({ error: "Recette non trouvée." });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la suppression." });
    }
};