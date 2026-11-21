const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/AuthMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

// Ma partie (connecté) : à déclarer avant « /:id »
router.put('/me/profile', authMiddleware, userController.updateMyProfile);
router.get('/me/history', authMiddleware, userController.getHistory);
router.delete('/me/history/:entryId', authMiddleware, userController.deleteHistoryEntry);

// Profils publics (visiteurs acceptés). « /search » avant « /:id ».
router.get('/search', optionalAuth, userController.searchUsers);
router.get('/:id', optionalAuth, userController.getProfile);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);
router.post('/:id/follow', authMiddleware, userController.toggleFollow);

module.exports = router;
