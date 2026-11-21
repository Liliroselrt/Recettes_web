'use strict'
// ==========================================================================
// Signalements
//   POST /api/reports            envoyer un signalement { targetType, targetId, reason, details }
//   GET  /api/reports/about-me   les signalements faits à l'égard de la personne connectée
// Table `Reports` ; les décisions sont prises depuis la page de modération (moderation/routes.js).
// ==========================================================================
const express = require('express')
const { effectiveRole } = require('../middleware/roles')
const { QueryTypes } = require('sequelize')

const TARGET_TYPES = ['recipe', 'user', 'review']
const REASONS = ['spam', 'harassment', 'inappropriate_content', 'copyright', 'other']
const MAX_DETAILS = 1000
const MAX_PER_HOUR = 5   // limite anti-abus : 5 signalements par heure et par personne

const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text)

function createReportsRouter({ sequelize, authenticate, getUserId = (req) => req.user?.id ?? req.userId }) {
  const router = express.Router()
  const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT })

  router.post('/', authenticate, async (req, res) => {
    try {
      const reporterId = getUserId(req)
      const { targetType, reason } = req.body || {}
      const targetId = Number(req.body && req.body.targetId)
      const details = typeof (req.body && req.body.details) === 'string' ? req.body.details.trim() : ''

      // Signalement retiré par la modération
      const [reporter] = await select('SELECT canReport, reportBlockedReason FROM Users WHERE id = :id', { id: reporterId })
      if (reporter && !reporter.canReport) {
        const why = reporter.reportBlockedReason ? ` Reason: ${reporter.reportBlockedReason}` : ''
        return res.status(403).json({ error: `You can no longer send reports.${why}` })
      }

      if (!TARGET_TYPES.includes(targetType) || !Number.isInteger(targetId) || targetId < 1) {
        return res.status(400).json({ error: 'Invalid report: nothing to report.' })
      }
      if (!REASONS.includes(reason)) return res.status(400).json({ error: 'Please choose the nature of the problem.' })
      if (reason === 'other' && details.length < 10) {
        return res.status(400).json({ error: 'Please describe the problem (at least 10 characters).' })
      }
      if (details.length > MAX_DETAILS) {
        return res.status(400).json({ error: `Please keep the description under ${MAX_DETAILS} characters.` })
      }

      // La cible existe-t-elle, qui est la personne concernée, et comment l'appeler dans la liste ?
      let ownerId = null
      let label = ''
      if (targetType === 'recipe') {
        const [row] = await select('SELECT title, userId, shared, isHidden FROM Recipes WHERE id = :id', { id: targetId })
        if (!row || ((!row.shared || row.isHidden) && row.userId !== reporterId)) return res.status(404).json({ error: 'Recipe not found.' })
        ownerId = row.userId
        label = row.title
      } else if (targetType === 'user') {
        const [row] = await select('SELECT id, username FROM Users WHERE id = :id', { id: targetId })
        if (!row) return res.status(404).json({ error: 'User not found.' })
        ownerId = row.id
        label = row.username
      } else {
        const [row] = await select(
          'SELECT v.userId, v.comment, r.title FROM Reviews v JOIN Recipes r ON r.id = v.recipeId WHERE v.id = :id', { id: targetId })
        if (!row) return res.status(404).json({ error: 'Review not found.' })
        ownerId = row.userId
        label = `Review on "${clip(row.title, 40)}": ${clip(row.comment, 60)}`
      }
      if (ownerId === reporterId) return res.status(400).json({ error: 'You cannot report your own content.' })

      // Pas de doublon en attente, et pas de rafale de signalements
      const [duplicate] = await select(
        "SELECT id FROM Reports WHERE reporterId = :reporterId AND targetType = :targetType AND targetId = :targetId AND status = 'pending' LIMIT 1",
        { reporterId, targetType, targetId }
      )
      if (duplicate) return res.status(409).json({ error: 'You already reported this. Our moderators will look at it soon.' })

      const [{ n }] = await select(
        'SELECT COUNT(*) AS n FROM Reports WHERE reporterId = :reporterId AND createdAt > :since',
        { reporterId, since: new Date(Date.now() - 60 * 60 * 1000) }
      )
      if (Number(n) >= MAX_PER_HOUR) return res.status(429).json({ error: 'Too many reports in a short time. Please try again later.' })

      const now = new Date()
      await sequelize.query(
        `INSERT INTO Reports (reporterId, targetType, targetId, targetOwnerId, targetLabel, reason, details, status, createdAt, updatedAt)
         VALUES (:reporterId, :targetType, :targetId, :ownerId, :label, :reason, :details, 'pending', :now, :now)`,
        { replacements: { reporterId, targetType, targetId, ownerId, label, reason, details: details || null, now } }
      )
      res.status(201).json({ message: 'Thank you. Our moderators will review your report.' })
    } catch (error) {
      console.error('[reports]', error)
      res.status(500).json({ error: 'Could not send your report. Please try again.' })
    }
  })

  // Ce qui a été signalé à mon sujet (recettes, avis, profil). Jamais le nom de la personne qui signale,
  // ni sa description : seulement la raison, l'état et la décision de la modération.
  router.get('/about-me', authenticate, async (req, res) => {
    try {
      const me = getUserId(req)
      const [user] = await select('SELECT canReport, reportBlockedReason FROM Users WHERE id = :me', { me })
      // Les utilisateurs et abonnés ne voient que les signalements ayant donné lieu à une décision :
      // ni ceux en cours de traitement, ni ceux rejetés. Les modérateurs et admins voient tout.
      const staff = ['moderator', 'admin'].includes(effectiveRole(req.user))
      const reports = await select(
        `SELECT id, targetType, targetLabel, reason, status, action, decisionMessage, createdAt, updatedAt
           FROM Reports WHERE targetOwnerId = :me ${staff ? '' : "AND status = 'action_taken'"}
          ORDER BY createdAt DESC LIMIT 200`, { me })
      res.json({
        canReport: user ? !!user.canReport : true,
        reportBlockedReason: user ? user.reportBlockedReason : null,
        reports
      })
    } catch (error) {
      console.error('[reports] about-me', error)
      res.status(500).json({ error: 'Could not load your reports.' })
    }
  })

  return router
}

module.exports = { createReportsRouter }
