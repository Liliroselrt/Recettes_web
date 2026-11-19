const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { VIEW_AS_MODES } = require('./roles');

// Lit le jeton JWT de l'en-tête "Authorization: Bearer <token>" et retrouve le compte
// correspondant DANS LA BASE. Un jeton valide ne suffit pas : si la base a été réimportée
// ou si le compte a été supprimé, le jeton pointe vers un utilisateur qui n'existe plus
// (ou, pire, qui est devenu quelqu'un d'autre).
//   -> { status: 'none' }                       pas de jeton
//   -> { status: 'invalid' }                    jeton illisible ou expiré
//   -> { status: 'unknown' }                    jeton valide mais compte introuvable
//   -> { status: 'banned', reason }             compte suspendu
//   -> { status: 'ok', user: { id, username, role, viewAs } }
// `viewAs` : mode « voir comme » demandé par un admin (en-tête X-View-As), sinon null.
async function identify(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { status: 'none' };

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'secret_par_defaut');
  } catch (error) {
    return { status: 'invalid' };
  }

  const user = await User.findByPk(decoded.id, { attributes: ['id', 'username', 'role', 'isBanned', 'bannedReason'] });
  if (!user) return { status: 'unknown' };
  if (user.isBanned) return { status: 'banned', reason: user.bannedReason };

  const asked = String(req.headers['x-view-as'] || '').toLowerCase();
  const viewAs = user.role === 'admin' && VIEW_AS_MODES.includes(asked) ? asked : null;
  return { status: 'ok', user: { id: user.id, username: user.username, role: user.role, viewAs } };
}

module.exports = identify;
