const { Op, fn } = require('sequelize');
const { User, Recipe, Review, Favorite, RecipeLike } = require('../models');
const sequelize = require('../config/database');
const { getViewerAccess, canWatchVideo } = require('../subscription/access');

const CATEGORIES = ['Starter', 'Main', 'Dessert', 'Quick'];
const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp', ''];   // '' = "to taste"
const MAX_IMAGES = 6;

// ---------------------------------------------------------------------------
// Validation : on ne garde que les champs autorisés (jamais userId, shared, likes...)
// ---------------------------------------------------------------------------
function cleanRecipeInput(body) {
  const errors = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) errors.push('Please enter a recipe title.');

  const category = body.category || 'Main';
  if (!CATEGORIES.includes(category)) errors.push('Invalid category.');

  const prepTime = Number(body.prepTime);
  if (!Number.isInteger(prepTime) || prepTime < 1) errors.push('Prep time must be a whole number of minutes (1 or more).');

  const ingredients = [];
  (Array.isArray(body.ingredients) ? body.ingredients : []).forEach((ing) => {
    const name = typeof ing?.name === 'string' ? ing.name.trim().toLowerCase() : '';
    if (!name) return;
    const unit = ing.unit ?? '';
    if (!UNITS.includes(unit)) { errors.push(`Invalid unit for "${name}".`); return; }
    const quantity = unit ? Number(ing.quantity) : null;
    if (unit && !(quantity > 0)) { errors.push(`Enter a quantity for "${name}" (or choose "to taste").`); return; }
    ingredients.push({ name, quantity, unit });
  });
  if (ingredients.length === 0) errors.push('Add at least one ingredient.');

  const steps = typeof body.instructions === 'string'
    ? body.instructions.split('\n').map(s => s.trim()).filter(Boolean)
    : [];
  if (steps.length === 0) errors.push('Add at least one preparation step.');

  const images = [];
  (Array.isArray(body.images) ? body.images : []).forEach((src) => {
    if (typeof src !== 'string') return;
    const ok = /^https?:\/\//i.test(src) || /^\/img\/[\w.-]+$/.test(src);
    if (ok && !images.includes(src)) images.push(src);
  });
  if (images.length > MAX_IMAGES) errors.push(`You can add up to ${MAX_IMAGES} images.`);

  // Lien vidéo facultatif (vide = pas de vidéo)
  let videoUrl = null;
  if (typeof body.videoUrl === 'string' && body.videoUrl.trim()) {
    const link = body.videoUrl.trim();
    if (/^https?:\/\/\S+$/i.test(link) && link.length <= 2000) videoUrl = link;
    else errors.push('The video link must be a valid address starting with https://');
  }

  if (errors.length) return { errors };
  // `imageUrl` (colonne du schéma) garde toujours l'image de couverture = la première
  return { data: { title, category, prepTime, ingredients, instructions: steps.join('\n'), images, imageUrl: images[0] || null, videoUrl, isVideoPremium: !!videoUrl } };
}

// ---------------------------------------------------------------------------
// Mise en forme de la réponse (même structure que SEED_RECIPES de la maquette)
// ---------------------------------------------------------------------------
const recipeInclude = [
  { model: User, attributes: ['id', 'username'] },
  { model: Review, attributes: ['id', 'userId', 'rating', 'comment', 'createdAt'], include: [{ model: User, attributes: ['username'] }] },
  { model: RecipeLike, attributes: ['likes'], required: false }
];
const recipeOrder = [['createdAt', 'DESC'], [Review, 'createdAt', 'ASC'], [Review, 'id', 'ASC']];

async function favoriteInfo(user) {
  const userId = user && user.id;
  const counts = await Favorite.findAll({
    attributes: ['recipeId', [fn('COUNT', '*'), 'n']],
    group: ['recipeId'],
    raw: true
  });
  const countByRecipe = {};
  counts.forEach(c => { countByRecipe[c.recipeId] = Number(c.n); });

  let mine = new Set();
  if (userId) {
    const rows = await Favorite.findAll({ where: { userId }, raw: true });
    mine = new Set(rows.map(r => r.recipeId));
  }
  // Droits de la personne sur les vidéos (abonnement, déblocages). Si les tables d'abonnement
  // sont absentes, on ne bloque pas le site : simplement aucune vidéo premium n'est débloquée.
  let access;
  try {
    access = await getViewerAccess(sequelize, user || null);
  } catch (error) {
    console.error('Could not read the subscription status:', error.message);
    access = { userId: userId || null, role: null, isSubscriber: false, unlockedRecipeIds: new Set() };
  }
  return { countByRecipe, mine, userId, access };
}

function formatRecipe(recipe, { countByRecipe, mine, access }) {
  // La vidéo n'est visible que par son auteur, un abonné Gourmet Plus ou une personne qui l'a débloquée :
  // le lien n'est jamais envoyé aux autres (voir subscription/access.js)
  const hasVideo = !!recipe.videoUrl;
  const canSeeVideo = canWatchVideo(recipe, access);
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    prepTime: recipe.prepTime,
    images: recipe.images,
    hasVideo,
    videoUrl: canSeeVideo ? recipe.videoUrl : null,
    isVideoPremium: !!recipe.isVideoPremium,
    isHidden: !!recipe.isHidden,   // masquée par la modération (seule l'autrice / l'auteur la voit)
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    shared: recipe.shared,
    // Recette partagée sans date de partage (ajoutée directement en base) : on utilise sa date de création
    sharedAt: recipe.shared ? (recipe.sharedAt || recipe.createdAt) : null,
    createdAt: recipe.createdAt,
    likes: recipe.RecipeLike ? recipe.RecipeLike.likes : 0,
    userId: recipe.userId,
    author: recipe.User ? recipe.User.username : 'Unknown chef',
    favoritesCount: countByRecipe[recipe.id] || 0,
    isFavorite: mine.has(recipe.id),
    reviews: (recipe.Reviews || []).map(r => ({
      id: r.id, userId: r.userId, author: r.User ? r.User.username : 'Deleted user', rating: r.rating, comment: r.comment, createdAt: r.createdAt
    }))
  };
}

// Visible = partagée, ou écrite par la personne connectée
const visibleWhere = (user) =>
  user ? { [Op.or]: [{ shared: true, isHidden: false }, { userId: user.id }] } : { shared: true, isHidden: false };

async function loadVisibleRecipe(id, user) {
  return Recipe.findOne({
    where: { id, ...visibleWhere(user) },
    include: recipeInclude,
    order: recipeOrder
  });
}

async function sendRecipe(res, status, id, user, extra = {}) {
  const recipe = await loadVisibleRecipe(id, user);
  const info = await favoriteInfo(user);
  res.status(status).json({ ...extra, recipe: formatRecipe(recipe, info) });
}

// Erreur serveur : on garde la cause (SQL...) dans la console et, hors production, dans la
// réponse, ce qui permet de comprendre rapidement ce qui ne va pas.
function serverError(res, message, error) {
  console.error(error);
  const cause = (error.parent && error.parent.sqlMessage) || error.message;
  const detail = process.env.NODE_ENV === 'production' ? '' : ` (${cause})`;
  res.status(500).json({ error: message + detail });
}

// ---------------------------------------------------------------------------
// Contrôleurs
// ---------------------------------------------------------------------------
exports.getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.findAll({
      where: visibleWhere(req.user),
      include: recipeInclude,
      order: recipeOrder
    });
    const info = await favoriteInfo(req.user);
    res.status(200).json(recipes.map(r => formatRecipe(r, info)));
  } catch (error) {
    serverError(res, 'Could not load the recipes.', error);
  }
};

exports.createRecipe = async (req, res) => {
  try {
    const { errors, data } = cleanRecipeInput(req.body);
    if (errors) return res.status(400).json({ error: errors.join(' '), errors });

    // Les nouvelles recettes sont privées jusqu'à ce que l'auteur les partage
    const created = await Recipe.create({ ...data, shared: false, userId: req.user.id });
    await sendRecipe(res, 201, created.id, req.user, { message: 'Recipe created successfully!' });
  } catch (error) {
    serverError(res, 'Could not create the recipe.', error);
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    if (recipe.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you are not the author of this recipe.' });
    }

    const { errors, data } = cleanRecipeInput(req.body);
    if (errors) return res.status(400).json({ error: errors.join(' '), errors });

    await recipe.update(data);
    await sendRecipe(res, 200, recipe.id, req.user, { message: 'Recipe updated successfully!' });
  } catch (error) {
    serverError(res, 'Could not update the recipe.', error);
  }
};

// Partager avec la communauté (enregistre l'heure exacte) ou repasser en privé
exports.shareRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    if (recipe.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you are not the author of this recipe.' });
    }

    const shared = typeof req.body.shared === 'boolean' ? req.body.shared : !recipe.shared;
    if (shared && recipe.isHidden) {
      return res.status(403).json({ error: 'This recipe was hidden by the moderators and cannot be shared.' });
    }
    await recipe.update({
      shared,
      sharedAt: shared ? (recipe.shared && recipe.sharedAt ? recipe.sharedAt : new Date()) : null
    });
    await sendRecipe(res, 200, recipe.id, req.user);
  } catch (error) {
    serverError(res, 'Could not change the sharing status.', error);
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    if (recipe.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you are not the author of this recipe.' });
    }

    await recipe.destroy();
    res.status(200).json({ message: 'Recipe deleted successfully!' });
  } catch (error) {
    serverError(res, 'Could not delete the recipe.', error);
  }
};

// Avis : un compte est nécessaire (Reviews.userId est obligatoire dans le schéma)
exports.addReview = async (req, res) => {
  try {
    const recipe = await loadVisibleRecipe(req.params.id, req.user);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'The rating must be between 1 and 5.' });
    }
    if (!comment || comment.length > 2000) {
      return res.status(400).json({ error: 'Please write a comment (2000 characters maximum).' });
    }

    const review = await Review.create({
      rating,
      comment,
      userId: req.user.id,
      recipeId: recipe.id
    });
    res.status(201).json({
      review: { id: review.id, userId: req.user.id, author: req.user.username, rating, comment, createdAt: review.createdAt }
    });
  } catch (error) {
    serverError(res, 'Could not post the review.', error);
  }
};

// Ajoute / retire la recette des favoris de la personne connectée
exports.toggleFavorite = async (req, res) => {
  try {
    const recipe = await loadVisibleRecipe(req.params.id, req.user);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    const key = { userId: req.user.id, recipeId: recipe.id };
    const existing = await Favorite.findOne({ where: key });
    if (existing) await existing.destroy();
    else await Favorite.create(key);

    const favoritesCount = await Favorite.count({ where: { recipeId: recipe.id } });
    res.status(200).json({ isFavorite: !existing, favoritesCount });
  } catch (error) {
    serverError(res, 'Could not update the favorites.', error);
  }
};
