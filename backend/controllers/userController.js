const { Op } = require('sequelize');
const { User, Recipe, UserFollow, CookedRecipe } = require('../models');

const MAX_BIO = 500;
const PUBLIC_FIELDS = ['id', 'username', 'bio', 'avatarUrl', 'location', 'specialty', 'websiteUrl', 'createdAt'];

function serverError(res, message, error) {
  console.error(error);
  const cause = (error.parent && error.parent.sqlMessage) || error.message;
  const detail = process.env.NODE_ENV === 'production' ? '' : ` (${cause})`;
  res.status(500).json({ error: message + detail });
}

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ---------------------------------------------------------------------------
// Profil public : GET /api/users/:id
// Les recettes publiées sont déjà dans GET /api/recipes ; le site les filtre par auteur.
// ---------------------------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'User not found.' });

    const user = await User.findByPk(id, { attributes: PUBLIC_FIELDS });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const [followersCount, followingCount, recipesCount, follow] = await Promise.all([
      UserFollow.count({ where: { followingId: id } }),
      UserFollow.count({ where: { followerId: id } }),
      Recipe.count({ where: { userId: id, shared: true, isHidden: false } }),
      req.user ? UserFollow.findOne({ where: { followerId: req.user.id, followingId: id } }) : null
    ]);

    res.status(200).json({
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      location: user.location,
      specialty: user.specialty,
      websiteUrl: user.websiteUrl,
      memberSince: user.createdAt,
      followersCount,
      followingCount,
      recipesCount,
      isFollowing: !!follow,
      isMe: !!req.user && req.user.id === id
    });
  } catch (error) {
    serverError(res, 'Could not load this profile.', error);
  }
};

// ---------------------------------------------------------------------------
// Paramètres du compte : PUT /api/users/me/profile
// Seuls les champs envoyés sont modifiés ; une chaîne vide efface la valeur.
// ---------------------------------------------------------------------------
function cleanProfileInput(body) {
  const errors = [];
  const data = {};

  const text = (key, label, max) => {
    if (!(key in body)) return;
    const value = body[key] === null ? '' : body[key];
    if (typeof value !== 'string') { errors.push(`Invalid ${label}.`); return; }
    const trimmed = value.trim();
    if (trimmed.length > max) { errors.push(`The ${label} must be ${max} characters or fewer.`); return; }
    data[key] = trimmed || null;
  };
  text('bio', 'bio', MAX_BIO);
  text('location', 'location', 150);
  text('specialty', 'specialty', 150);

  if ('websiteUrl' in body) {
    const link = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : '';
    if (!link) data.websiteUrl = null;
    else if (/^https?:\/\/\S+$/i.test(link) && link.length <= 255) data.websiteUrl = link;
    else errors.push('The website must be a valid address starting with https://');
  }

  if ('avatarUrl' in body) {
    const src = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
    if (!src) data.avatarUrl = null;
    // Même règle que les images de recette : image importée (/img/...) ou lien https
    else if ((/^https?:\/\/\S+$/i.test(src) || /^\/img\/[\w.-]+$/.test(src)) && src.length <= 2000) data.avatarUrl = src;
    else errors.push('Invalid profile picture.');
  }

  return { errors, data };
}

exports.updateMyProfile = async (req, res) => {
  try {
    const { errors, data } = cleanProfileInput(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(' '), errors });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update(data);

    res.status(200).json({
      message: 'Profile updated successfully!',
      user: { id: user.id, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, location: user.location, specialty: user.specialty, websiteUrl: user.websiteUrl }
    });
  } catch (error) {
    serverError(res, 'Could not update your profile.', error);
  }
};

// ---------------------------------------------------------------------------
// Abonnements : POST /api/users/:id/follow  (bascule suivre / ne plus suivre)
//               GET  /api/users/:id/followers | /following
// ---------------------------------------------------------------------------
exports.toggleFollow = async (req, res) => {
  try {
    const targetId = parseId(req.params.id);
    if (!targetId) return res.status(404).json({ error: 'User not found.' });
    if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself.' });

    const target = await User.findByPk(targetId, { attributes: ['id'] });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const key = { followerId: req.user.id, followingId: targetId };
    const existing = await UserFollow.findOne({ where: key });
    const wantFollow = typeof req.body.following === 'boolean' ? req.body.following : !existing;

    if (wantFollow && !existing) await UserFollow.create(key);
    if (!wantFollow && existing) await existing.destroy();

    const followersCount = await UserFollow.count({ where: { followingId: targetId } });
    res.status(200).json({ isFollowing: wantFollow, followersCount });
  } catch (error) {
    serverError(res, 'Could not update the subscription.', error);
  }
};

// ---------------------------------------------------------------------------
// Recherche de personnes : GET /api/users/search?q=...   (par pseudo, 20 résultats maximum ; sans texte : des personnes à découvrir)
// ---------------------------------------------------------------------------
// Personnes proposées quand le champ de recherche est vide.
//   mode=followed-first (messagerie) : d'abord les personnes que je suis, puis les membres les plus récents
//   sinon (page Community)           : des membres que je ne suis pas encore, les plus récents d'abord
async function suggestPeople(me, mode) {
  const attributes = ['id', 'username', 'avatarUrl', 'specialty', 'location'];
  let followedIds = [];
  if (me) {
    const rows = await UserFollow.findAll({ where: { followerId: me }, order: [['createdAt', 'DESC']], limit: 200, raw: true });
    followedIds = rows.map(r => r.followingId);
  }

  let followed = [];
  if (mode === 'followed-first' && followedIds.length) {
    const users = await User.findAll({ where: { id: followedIds, isBanned: false }, attributes, raw: true });
    const byId = new Map(users.map(u => [u.id, u]));
    followed = followedIds.map(id => byId.get(id)).filter(Boolean).map(u => ({ ...u, isFollowing: true }));
  }

  const excluded = followedIds.slice();
  if (me) excluded.push(me);
  const where = { isBanned: false };
  if (excluded.length) where.id = { [Op.notIn]: excluded };
  const others = await User.findAll({ where, attributes, order: [['createdAt', 'DESC']], limit: 30, raw: true });
  return followed.concat(others.map(u => ({ ...u, isFollowing: false })));
}

exports.searchUsers = async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
    // Recherche vide : on propose des personnes plutôt qu'une liste vide
    if (!q) return res.status(200).json(await suggestPeople(req.user ? req.user.id : null, req.query.mode));

    // Les caractères spéciaux de LIKE (% _ \) sont neutralisés : on cherche le texte tel quel
    const escaped = q.replace(/[\\%_]/g, '\\$&');
    const where = { username: { [Op.like]: `%${escaped}%` } };
    if (req.user) where.id = { [Op.ne]: req.user.id };

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'avatarUrl', 'specialty', 'location'],
      order: [['username', 'ASC']],
      limit: 20,
      raw: true
    });
    res.status(200).json(users);
  } catch (error) {
    serverError(res, 'Could not search for people.', error);
  }
};

async function listConnections(req, res, direction) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: 'User not found.' });
    const user = await User.findByPk(id, { attributes: ['id'] });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isFollowers = direction === 'followers';
    const rows = await UserFollow.findAll({
      where: isFollowers ? { followingId: id } : { followerId: id },
      order: [['createdAt', 'DESC']],
      limit: 200,
      raw: true
    });
    const ids = rows.map(r => (isFollowers ? r.followerId : r.followingId));
    const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id', 'username', 'avatarUrl', 'specialty', 'location'], raw: true }) : [];
    const byId = new Map(users.map(u => [u.id, u]));
    res.status(200).json(ids.map(i => byId.get(i)).filter(Boolean));
  } catch (error) {
    serverError(res, 'Could not load this list.', error);
  }
}
exports.getFollowers = (req, res) => listConnections(req, res, 'followers');
exports.getFollowing = (req, res) => listConnections(req, res, 'following');

// ---------------------------------------------------------------------------
// Historique des recettes faites : GET /api/users/me/history
//                                  DELETE /api/users/me/history/:entryId
// (l'ajout se fait avec POST /api/recipes/:id/cooked)
// ---------------------------------------------------------------------------
exports.getHistory = async (req, res) => {
  try {
    const rows = await CookedRecipe.findAll({
      where: { userId: req.user.id },
      order: [['cookedAt', 'DESC'], ['id', 'DESC']],
      limit: 500
    });
    const entries = rows.map(r => ({ id: r.id, recipeId: r.recipeId, title: r.recipeTitle, image: r.recipeImage, note: r.note, cookedAt: r.cookedAt }));
    const distinct = new Set(entries.map(e => e.recipeId !== null ? `r${e.recipeId}` : `t${e.title}`));
    res.status(200).json({ entries, stats: { totalCooked: entries.length, distinctRecipes: distinct.size } });
  } catch (error) {
    serverError(res, 'Could not load your cooking history.', error);
  }
};

exports.deleteHistoryEntry = async (req, res) => {
  try {
    const entryId = parseId(req.params.entryId);
    const entry = entryId ? await CookedRecipe.findOne({ where: { id: entryId, userId: req.user.id } }) : null;
    if (!entry) return res.status(404).json({ error: 'History entry not found.' });
    await entry.destroy();
    res.status(200).json({ message: 'Removed from your history.' });
  } catch (error) {
    serverError(res, 'Could not remove this entry.', error);
  }
};
