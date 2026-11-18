const jwt = require('jsonwebtoken');

// Comme AuthMiddleware, mais ne bloque pas : sans jeton valide, la requête
// continue simplement sans `req.user` (visiteur anonyme).
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'secret_par_defaut');
    } catch (error) {
      // jeton invalide ou expiré : on traite la personne comme un visiteur
    }
  }
  next();
};
