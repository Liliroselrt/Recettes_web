const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Récupère le token dans l'en-tête "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied: no token provided.' });
    }

    const token = authHeader.split(' ')[1];
    // Vérifie et décode le token avec ta clé secrète
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_par_defaut');
    
    // Attache les infos de l'utilisateur (ex: req.user.id) à la requête
    req.user = decoded;
    next(); // Passe à la suite (le contrôleur)
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};