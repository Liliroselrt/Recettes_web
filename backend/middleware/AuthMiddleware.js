const identify = require('./authUser');

// Route réservée aux utilisateurs connectés : remplit `req.user` ({ id, username, role, viewAs })
module.exports = async (req, res, next) => {
  try {
    const result = await identify(req);
    if (result.status === 'none') return res.status(401).json({ error: 'Access denied: no token provided.' });
    if (result.status === 'invalid') return res.status(401).json({ error: 'Invalid or expired token.' });
    if (result.status === 'unknown') {
      return res.status(401).json({ error: 'Your account no longer exists. Please log in again.' });
    }
    if (result.status === 'banned') {
      return res.status(403).json({ error: `Your account is suspended${result.reason ? ': ' + result.reason : '.'}` });
    }
    req.user = result.user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while checking your session.' });
  }
};
