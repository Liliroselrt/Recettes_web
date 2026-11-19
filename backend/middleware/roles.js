// Rôles : user, moderator, admin. Un admin peut « voir le site comme » un autre type de compte
// (en-tête X-View-As). Le vrai rôle en base ne change jamais.
const VIEW_AS_MODES = ['user', 'subscriber', 'moderator'];

// Rôle utilisé pour les droits : un admin qui « voit comme » agit avec les droits de ce rôle.
function effectiveRole(user) {
  if (!user) return null;
  if (user.role === 'admin' && user.viewAs) return user.viewAs === 'moderator' ? 'moderator' : 'user';
  return user.role || 'user';
}

module.exports = { VIEW_AS_MODES, effectiveRole };
