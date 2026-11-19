const identify = require('./authUser');
const { effectiveRole } = require('./roles');

// Route réservée à certains rôles : requireRole('moderator', 'admin')
// Un admin qui « voit comme » un modérateur ou un utilisateur a exactement leurs droits (utile pour tester).
module.exports = (...allowed) => async (req, res, next) => {
  try {
    const result = await identify(req);
    if (result.status === 'none') return res.status(401).json({ error: 'Access denied: no token provided.' });
    if (result.status === 'invalid') return res.status(401).json({ error: 'Invalid or expired token.' });
    if (result.status === 'unknown') return res.status(401).json({ error: 'Your account no longer exists. Please log in again.' });
    if (result.status === 'banned') return res.status(403).json({ error: 'Your account is suspended.' });

    const role = effectiveRole(result.user);
    if (!allowed.includes(role)) return res.status(403).json({ error: 'You do not have permission to do this.' });
    req.user = { ...result.user, effectiveRole: role };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while checking your permissions.' });
  }
};
