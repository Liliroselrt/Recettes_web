const identify = require('./authUser');

// Comme AuthMiddleware, mais ne bloque jamais : sans jeton valide (ou avec un jeton dont
// le compte n'existe plus), la requête continue simplement comme un visiteur.
module.exports = async (req, res, next) => {
  try {
    const result = await identify(req);
    if (result.status === 'ok') req.user = result.user;
  } catch (error) {
    console.error(error);
  }
  next();
};
