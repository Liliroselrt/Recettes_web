'use strict'
// ==========================================================================
// Règles d'accès aux vidéos des recettes.
// Une vidéo est visible si la personne est :
//   - l'auteur de la recette (« My Creations » : ses propres vidéos sont toujours accessibles),
//   - abonnée (abonnement en cours),
//   - ou a débloqué cette recette à l'unité (VideoUnlocks),
//   - ou modératrice / admin,
//   - ou la vidéo n'est pas premium.
// ==========================================================================
const { QueryTypes } = require('sequelize')
const { effectiveRole } = require('../middleware/roles')

const hasText = (value) => !!(value && String(value).trim())

// Abonnement en cours : actif, annulé ou en retard de paiement MAIS déjà payé jusqu'à endDate
async function getActiveSubscription(sequelize, userId, now = new Date()) {
  const rows = await sequelize.query(
    `SELECT id, planId, status, startDate, endDate
       FROM UserSubscriptions
      WHERE userId = :userId
        AND status IN ('active', 'canceled', 'past_due')
        AND endDate > :now
      ORDER BY endDate DESC
      LIMIT 1`,
    { replacements: { userId, now }, type: QueryTypes.SELECT }
  )
  return rows[0] || null
}

// user = { id, role } ou null (visiteur non connecté)
async function getViewerAccess(sequelize, user) {
  if (!user || !user.id) return { userId: null, role: null, isSubscriber: false, unlockedRecipeIds: new Set() }
  const [subscription, unlocks] = await Promise.all([
    getActiveSubscription(sequelize, user.id),
    sequelize.query('SELECT recipeId FROM VideoUnlocks WHERE userId = :userId', {
      replacements: { userId: user.id }, type: QueryTypes.SELECT
    })
  ])
  return {
    userId: user.id,
    role: effectiveRole(user),                                  // un admin qui « voit comme » un utilisateur n'a pas ses droits
    isSubscriber: !!subscription || user.viewAs === 'subscriber', // simulation d'un abonné (voir comme)
    unlockedRecipeIds: new Set(unlocks.map((u) => u.recipeId))
  }
}

function canWatchVideo(recipe, viewer) {
  if (!hasText(recipe.videoUrl)) return false
  if (viewer.userId && recipe.userId === viewer.userId) return true          // sa propre recette
  if (!recipe.isVideoPremium) return true
  if (viewer.isSubscriber) return true
  if (viewer.unlockedRecipeIds.has(recipe.id)) return true
  return viewer.role === 'admin' || viewer.role === 'moderator'
}

// À appliquer à CHAQUE recette envoyée au navigateur (objet simple, pas une instance Sequelize).
// Si la vidéo est verrouillée, le lien n'est jamais envoyé.
function applyVideoAccess(recipe, viewer) {
  const hasVideo = hasText(recipe.videoUrl)
  const allowed = canWatchVideo(recipe, viewer)
  return { ...recipe, hasVideo, videoUrl: allowed ? recipe.videoUrl : null, videoLocked: hasVideo && !allowed }
}

module.exports = { getActiveSubscription, getViewerAccess, canWatchVideo, applyVideoAccess }
