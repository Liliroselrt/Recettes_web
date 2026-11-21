'use strict'
// ==========================================================================
// Modération et administration
//
//  /api/mod   (modérateurs + admins)
//    GET   /reports?status=pending|resolved      file des signalements
//    POST  /reports/:id/decision                 décision sur un signalement
//    PATCH /users/:id/report-access              retirer / rendre le droit de signaler
//
//  /api/admin (admins uniquement)
//    GET   /stats                                chiffres clés
//    GET   /users                                liste des comptes (recherche, filtres)
//    PATCH /users/:id                            rôle, suspension, droit de signaler
//    GET   /logs                                 journal des actions
// ==========================================================================
const express = require('express')
const { QueryTypes } = require('sequelize')

const ROLES = ['user', 'moderator', 'admin']

// Décisions possibles selon ce qui est signalé
const DECISIONS = {
  recipe: ['dismiss', 'warn', 'hide_recipe', 'delete_recipe', 'ban_user'],
  review: ['dismiss', 'warn', 'delete_review', 'ban_user'],
  user: ['dismiss', 'warn', 'ban_user']
}
const ACTION_BY_DECISION = {
  dismiss: 'none', warn: 'warning', hide_recipe: 'recipe_hidden',
  delete_recipe: 'recipe_deleted', delete_review: 'review_deleted', ban_user: 'user_banned'
}

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const n = (value) => Number(value) || 0

function helpers(sequelize) {
  const select = (sql, replacements, transaction) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction })
  const run = (sql, replacements, transaction) => sequelize.query(sql, { replacements, transaction })
  const log = (adminId, action, targetType, targetId, details, transaction) =>
    run('INSERT INTO AdminLogs (adminId, action, targetType, targetId, details, createdAt) VALUES (:adminId, :action, :targetType, :targetId, :details, :now)',
      { adminId, action, targetType, targetId, details, now: new Date() }, transaction)
  return { select, run, log }
}

// ---------------------------------------------------------------------------
// Modération
// ---------------------------------------------------------------------------
function createModerationRouter({ sequelize, requireRole }) {
  const router = express.Router()
  const { select, run, log } = helpers(sequelize)
  const staff = requireRole('moderator', 'admin')

  router.get('/reports', staff, async (req, res) => {
    try {
      const pending = req.query.status !== 'resolved'
      const rows = await select(
        `SELECT r.id, r.reporterId, r.targetType, r.targetId, r.targetOwnerId, r.targetLabel, r.reason, r.details,
                r.status, r.action, r.decisionMessage, r.moderatorNote, r.createdAt, r.updatedAt,
                rep.username AS reporterName, rep.canReport AS reporterCanReport, rep.role AS reporterRole,
                own.username AS ownerName, own.isBanned AS ownerBanned, own.role AS ownerRole,
                rev.username AS reviewedByName
           FROM Reports r
           LEFT JOIN Users rep ON rep.id = r.reporterId
           LEFT JOIN Users own ON own.id = r.targetOwnerId
           LEFT JOIN Users rev ON rev.id = r.reviewedBy
          WHERE ${pending ? "r.status = 'pending'" : "r.status <> 'pending'"}
          ORDER BY ${pending ? 'r.createdAt ASC' : 'r.updatedAt DESC'}
          LIMIT 200`, {})

      const ids = (type) => [...new Set(rows.filter(r => r.targetType === type).map(r => r.targetId))]
      const owners = [...new Set(rows.map(r => r.targetOwnerId).filter(Boolean))]
      const recipes = ids('recipe').length
        ? await select('SELECT id, title, shared, isHidden FROM Recipes WHERE id IN (:ids)', { ids: ids('recipe') }) : []
      const reviews = ids('review').length
        ? await select('SELECT v.id, v.comment, v.rating, rc.title AS recipeTitle FROM Reviews v JOIN Recipes rc ON rc.id = v.recipeId WHERE v.id IN (:ids)', { ids: ids('review') }) : []
      const history = owners.length
        ? await select("SELECT targetOwnerId AS id, COUNT(*) AS total, SUM(status = 'action_taken') AS actions FROM Reports WHERE targetOwnerId IN (:ids) GROUP BY targetOwnerId", { ids: owners }) : []
      const recipeById = Object.fromEntries(recipes.map(x => [x.id, x]))
      const reviewById = Object.fromEntries(reviews.map(x => [x.id, x]))
      const historyById = Object.fromEntries(history.map(x => [x.id, x]))

      res.json(rows.map(r => ({
        id: r.id, status: r.status, targetType: r.targetType, targetId: r.targetId, targetLabel: r.targetLabel,
        reason: r.reason, details: r.details, createdAt: r.createdAt, updatedAt: r.updatedAt,
        action: r.action, decisionMessage: r.decisionMessage, moderatorNote: r.moderatorNote, reviewedBy: r.reviewedByName,
        reporter: { id: r.reporterId, username: r.reporterName || 'Deleted user', canReport: !!r.reporterCanReport, isStaff: r.reporterRole !== 'user' },
        owner: r.targetOwnerId ? {
          id: r.targetOwnerId, username: r.ownerName || 'Deleted user', isBanned: !!r.ownerBanned,
          totalReports: n(historyById[r.targetOwnerId] && historyById[r.targetOwnerId].total),
          actionsTaken: n(historyById[r.targetOwnerId] && historyById[r.targetOwnerId].actions)
        } : null,
        // État actuel de ce qui est signalé (null si supprimé entre-temps)
        preview: r.targetType === 'recipe' ? (recipeById[r.targetId] ? {
            title: recipeById[r.targetId].title, shared: !!recipeById[r.targetId].shared, isHidden: !!recipeById[r.targetId].isHidden } : null)
          : r.targetType === 'review' ? (reviewById[r.targetId] || null)
          : { username: r.ownerName }
      })))
    } catch (error) {
      console.error('[mod] reports', error)
      res.status(500).json({ error: 'Could not load the reports.' })
    }
  })

  router.post('/reports/:id/decision', staff, async (req, res) => {
    try {
      const id = Number(req.params.id)
      const body = req.body || {}
      const decision = body.decision
      const message = text(body.message)
      const note = text(body.note)

      const [report] = await select('SELECT * FROM Reports WHERE id = :id', { id })
      if (!report) return res.status(404).json({ error: 'Report not found.' })
      if (report.status !== 'pending') return res.status(409).json({ error: 'This report has already been handled.' })
      if (!(DECISIONS[report.targetType] || []).includes(decision)) return res.status(400).json({ error: 'Invalid decision for this report.' })
      if (decision === 'ban_user' && req.user.effectiveRole !== 'admin') return res.status(403).json({ error: 'Only an admin can suspend an account.' })
      if (decision !== 'dismiss' && message.length < 5) {
        return res.status(400).json({ error: 'Write a short message for the person concerned: it is shown to them.' })
      }
      if (message.length > 1000 || note.length > 1000) return res.status(400).json({ error: 'Messages are limited to 1000 characters.' })

      const ownerId = report.targetOwnerId
      if (decision === 'ban_user') {
        if (!ownerId) return res.status(400).json({ error: 'The person concerned is unknown for this report.' })
        if (ownerId === req.user.id) return res.status(400).json({ error: 'You cannot suspend yourself.' })
        const [owner] = await select('SELECT role FROM Users WHERE id = :id', { id: ownerId })
        if (!owner) return res.status(404).json({ error: 'This account no longer exists.' })
        if (owner.role === 'admin') return res.status(400).json({ error: 'Remove the admin role before suspending this account.' })
      }

      await sequelize.transaction(async (t) => {
        const now = new Date()
        if (decision === 'hide_recipe') await run('UPDATE Recipes SET isHidden = TRUE, updatedAt = :now WHERE id = :id', { id: report.targetId, now }, t)
        if (decision === 'delete_recipe') await run('DELETE FROM Recipes WHERE id = :id', { id: report.targetId }, t)
        if (decision === 'delete_review') await run('DELETE FROM Reviews WHERE id = :id', { id: report.targetId }, t)
        if (decision === 'ban_user') {
          await run('UPDATE Users SET isBanned = TRUE, bannedReason = :reason, updatedAt = :now WHERE id = :id', { id: ownerId, reason: message, now }, t)
        }

        // Rejeter ne ferme que ce signalement ; une action sur le contenu ferme tous ceux qui visent la même cible
        const where = decision === 'dismiss' ? 'id = :id' : "targetType = :targetType AND targetId = :targetId AND status = 'pending'"
        await run(
          `UPDATE Reports SET status = :status, action = :action, decisionMessage = :message, moderatorNote = :note,
                  reviewedBy = :me, updatedAt = :now WHERE ${where}`,
          {
            id, targetType: report.targetType, targetId: report.targetId, me: req.user.id, now,
            status: decision === 'dismiss' ? 'dismissed' : 'action_taken',
            action: ACTION_BY_DECISION[decision], message: message || null, note: note || null
          }, t)

        if (body.restrictReporter === true) {
          const [reporter] = await select('SELECT role FROM Users WHERE id = :id', { id: report.reporterId }, t)
          if (reporter && reporter.role === 'user') {
            await run('UPDATE Users SET canReport = FALSE, reportBlockedReason = :reason, updatedAt = :now WHERE id = :id',
              { id: report.reporterId, reason: 'Misuse of the reporting feature.', now }, t)
            await log(req.user.id, 'report_access_removed', 'user', report.reporterId, `After report #${id}`, t)
          }
        }
        await log(req.user.id, `report_${ACTION_BY_DECISION[decision]}`, report.targetType, report.targetId,
          `Report #${id}: ${decision}${note ? ' (' + note + ')' : ''}`, t)
      })
      res.json({ ok: true })
    } catch (error) {
      console.error('[mod] decision', error)
      res.status(500).json({ error: 'Could not save the decision.' })
    }
  })

  // Retirer ou rendre le droit de signaler à une personne
  router.patch('/users/:id/report-access', staff, async (req, res) => {
    try {
      const id = Number(req.params.id)
      const allowed = req.body && req.body.allowed
      const reason = text(req.body && req.body.reason) || 'Misuse of the reporting feature.'
      if (typeof allowed !== 'boolean') return res.status(400).json({ error: 'Invalid request.' })
      if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own account here.' })
      const [user] = await select('SELECT id, username, role FROM Users WHERE id = :id', { id })
      if (!user) return res.status(404).json({ error: 'User not found.' })
      if (user.role !== 'user' && req.user.effectiveRole !== 'admin') return res.status(403).json({ error: 'Only an admin can change this account.' })

      await run('UPDATE Users SET canReport = :allowed, reportBlockedReason = :reason, updatedAt = :now WHERE id = :id',
        { id, allowed, reason: allowed ? null : reason, now: new Date() })
      await log(req.user.id, allowed ? 'report_access_restored' : 'report_access_removed', 'user', id, allowed ? null : reason)
      res.json({ ok: true })
    } catch (error) {
      console.error('[mod] report-access', error)
      res.status(500).json({ error: 'Could not update this account.' })
    }
  })

  return router
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------
function createAdminRouter({ sequelize, requireRole }) {
  const router = express.Router()
  const { select, run, log } = helpers(sequelize)
  const adminOnly = requireRole('admin')

  router.get('/stats', adminOnly, async (req, res) => {
    try {
      const now = new Date()
      const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
      const since = new Date(now.getTime() - 12 * 7 * 24 * 3600 * 1000)
      const [users] = await select(
        'SELECT COUNT(*) AS total, SUM(role = \'moderator\') AS moderators, SUM(role = \'admin\') AS admins, SUM(isBanned) AS banned, SUM(createdAt > :week) AS newThisWeek FROM Users', { week })
      const [recipes] = await select(
        "SELECT COUNT(*) AS total, SUM(shared AND NOT isHidden) AS shared, SUM(NOT shared) AS private, SUM(isHidden) AS hidden, SUM(videoUrl IS NOT NULL AND videoUrl <> '') AS withVideo FROM Recipes")
      const [subs] = await select(
        `SELECT COUNT(DISTINCT s.userId) AS subscribers,
                COALESCE(SUM(CASE WHEN s.status = 'active' THEN p.priceMonthly ELSE 0 END), 0) AS monthlyRevenue
           FROM UserSubscriptions s JOIN SubscriptionPlans p ON p.id = s.planId
          WHERE s.status IN ('active', 'canceled', 'past_due') AND s.endDate > :now`, { now })
      const [payments] = await select("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM Payments WHERE status = 'succeeded' AND currency = 'ZAR'")
      const reportsByStatus = await select('SELECT status, COUNT(*) AS count FROM Reports GROUP BY status')
      const reportsByReason = await select('SELECT reason, COUNT(*) AS count FROM Reports GROUP BY reason ORDER BY count DESC')
      const signups = await select(
        "SELECT DATE_FORMAT(DATE_SUB(createdAt, INTERVAL WEEKDAY(createdAt) DAY), '%Y-%m-%d') AS week, COUNT(*) AS count FROM Users WHERE createdAt >= :since GROUP BY week ORDER BY week", { since })
      const topRecipes = await select(
        `SELECT r.id, r.title, ROUND(AVG(v.rating), 1) AS rating, COUNT(v.id) AS reviews
           FROM Recipes r JOIN Reviews v ON v.recipeId = r.id
          WHERE r.shared AND NOT r.isHidden
          GROUP BY r.id, r.title ORDER BY rating DESC, reviews DESC LIMIT 5`)
      const pending = (reportsByStatus.find(x => x.status === 'pending') || {}).count

      res.json({
        users: { total: n(users.total), moderators: n(users.moderators), admins: n(users.admins), banned: n(users.banned), newThisWeek: n(users.newThisWeek) },
        recipes: { total: n(recipes.total), shared: n(recipes.shared), private: n(recipes.private), hidden: n(recipes.hidden), withVideo: n(recipes.withVideo) },
        subscriptions: { subscribers: n(subs.subscribers), monthlyRevenue: n(subs.monthlyRevenue), totalPaid: n(payments.total), payments: n(payments.count) },
        reports: {
          pending: n(pending),
          byStatus: reportsByStatus.map(x => ({ status: x.status, count: n(x.count) })),
          byReason: reportsByReason.map(x => ({ reason: x.reason, count: n(x.count) }))
        },
        signups: signups.map(x => ({ week: x.week, count: n(x.count) })),
        topRecipes: topRecipes.map(x => ({ id: x.id, title: x.title, rating: Number(x.rating), reviews: n(x.reviews) }))
      })
    } catch (error) {
      console.error('[admin] stats', error)
      res.status(500).json({ error: 'Could not load the statistics.' })
    }
  })

  router.get('/users', adminOnly, async (req, res) => {
    try {
      const where = []
      const params = { now: new Date() }
      const search = text(req.query.search)
      if (search) { where.push('(u.username LIKE :q OR u.email LIKE :q)'); params.q = `%${search}%` }
      if (ROLES.includes(req.query.role)) { where.push('u.role = :role'); params.role = req.query.role }
      if (req.query.filter === 'banned') where.push('u.isBanned = TRUE')
      if (req.query.filter === 'no_reporting') where.push('u.canReport = FALSE')
      if (req.query.filter === 'reported') where.push('EXISTS (SELECT 1 FROM Reports x WHERE x.targetOwnerId = u.id)')

      const rows = await select(
        `SELECT u.id, u.username, u.email, u.role, u.isBanned, u.bannedReason, u.canReport, u.reportBlockedReason, u.createdAt,
                (SELECT COUNT(*) FROM Recipes WHERE userId = u.id) AS recipes,
                (SELECT COUNT(*) FROM Reviews WHERE userId = u.id) AS reviews,
                (SELECT COUNT(*) FROM Reports WHERE targetOwnerId = u.id) AS reportsReceived,
                (SELECT COUNT(*) FROM UserSubscriptions s WHERE s.userId = u.id AND s.status IN ('active', 'canceled', 'past_due') AND s.endDate > :now) AS activeSubs
           FROM Users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          ORDER BY u.createdAt DESC, u.id DESC LIMIT 300`, params)
      res.json(rows.map(u => ({
        id: u.id, username: u.username, email: u.email, role: u.role,
        isBanned: !!u.isBanned, bannedReason: u.bannedReason, canReport: !!u.canReport, reportBlockedReason: u.reportBlockedReason,
        createdAt: u.createdAt, recipes: n(u.recipes), reviews: n(u.reviews), reportsReceived: n(u.reportsReceived), isSubscriber: n(u.activeSubs) > 0
      })))
    } catch (error) {
      console.error('[admin] users', error)
      res.status(500).json({ error: 'Could not load the users.' })
    }
  })

  // Rôle (y compris nommer d'autres admins), suspension, droit de signaler
  router.patch('/users/:id', adminOnly, async (req, res) => {
    try {
      const id = Number(req.params.id)
      const body = req.body || {}
      if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own account here.' })
      const [user] = await select('SELECT id, username, role FROM Users WHERE id = :id', { id })
      if (!user) return res.status(404).json({ error: 'User not found.' })

      const sets = []
      const params = { id, now: new Date() }
      const entries = []

      if (user.role === 'admin' && (body.role !== undefined || body.subscriber !== undefined)) {
        return res.status(400).json({ error: "The role of an admin cannot be changed." })
      }

      if (body.role !== undefined) {
        if (!ROLES.includes(body.role)) return res.status(400).json({ error: 'Invalid role.' })
        if (body.role !== user.role) {
          sets.push('role = :role'); params.role = body.role
          entries.push(['role_changed', `${user.role} -> ${body.role}`])
        }
      }
      if (body.isBanned !== undefined) {
        if (typeof body.isBanned !== 'boolean') return res.status(400).json({ error: 'Invalid request.' })
        const reason = text(body.bannedReason)
        if (body.isBanned) {
          if (user.role === 'admin' && body.role !== 'user' && body.role !== 'moderator') return res.status(400).json({ error: 'Remove the admin role before suspending this account.' })
          if (reason.length < 3) return res.status(400).json({ error: 'Give a reason for the suspension (it is shown to the person).' })
        }
        sets.push('isBanned = :isBanned', 'bannedReason = :bannedReason')
        params.isBanned = body.isBanned; params.bannedReason = body.isBanned ? reason : null
        entries.push([body.isBanned ? 'user_banned' : 'user_unbanned', body.isBanned ? reason : null])
      }
      if (body.canReport !== undefined) {
        if (typeof body.canReport !== 'boolean') return res.status(400).json({ error: 'Invalid request.' })
        const reason = text(body.reportBlockedReason) || 'Misuse of the reporting feature.'
        sets.push('canReport = :canReport', 'reportBlockedReason = :blockedReason')
        params.canReport = body.canReport; params.blockedReason = body.canReport ? null : reason
        entries.push([body.canReport ? 'report_access_restored' : 'report_access_removed', body.canReport ? null : reason])
      }
      // Abonné : offrir Gourmet Plus un mois (sans paiement) ou retirer l'abonnement en cours
      let subscriptionChange = null
      if (body.subscriber !== undefined) {
        if (typeof body.subscriber !== 'boolean') return res.status(400).json({ error: 'Invalid request.' })
        const [active] = await select(
          "SELECT id FROM UserSubscriptions WHERE userId = :id AND status IN ('active', 'canceled', 'past_due') AND endDate > :now LIMIT 1", { id, now: params.now })
        if (body.subscriber && !active) {
          const [plan] = await select("SELECT id FROM SubscriptionPlans WHERE slug = 'gourmet-plus' AND isActive = TRUE LIMIT 1", {})
          if (!plan) return res.status(404).json({ error: 'The subscription plan is not available.' })
          const endDate = new Date(params.now); endDate.setMonth(endDate.getMonth() + 1)
          subscriptionChange = { type: 'grant', planId: plan.id, endDate }
          entries.push(['subscription_granted', 'Gourmet Plus offered for one month'])
        } else if (!body.subscriber && active) {
          subscriptionChange = { type: 'revoke' }
          entries.push(['subscription_revoked', 'Subscription ended by an admin'])
        }
      }
      if (!sets.length && !subscriptionChange) return res.status(400).json({ error: 'Nothing to change.' })

      await sequelize.transaction(async (t) => {
        if (sets.length) await run(`UPDATE Users SET ${sets.join(', ')}, updatedAt = :now WHERE id = :id`, params, t)
        if (subscriptionChange && subscriptionChange.type === 'grant') {
          await run(`INSERT INTO UserSubscriptions (userId, planId, status, startDate, endDate, createdAt, updatedAt)
                     VALUES (:id, :planId, 'canceled', :now, :endDate, :now, :now)`,
            { id, planId: subscriptionChange.planId, now: params.now, endDate: subscriptionChange.endDate }, t)
        }
        if (subscriptionChange && subscriptionChange.type === 'revoke') {
          await run("UPDATE UserSubscriptions SET status = 'expired', endDate = :now, updatedAt = :now WHERE userId = :id AND status IN ('active', 'canceled', 'past_due') AND endDate > :now",
            { id, now: params.now }, t)
        }
        for (const [action, details] of entries) await log(req.user.id, action, 'user', id, details, t)
      })
      res.json({ ok: true })
    } catch (error) {
      console.error('[admin] update user', error)
      res.status(500).json({ error: 'Could not update this account.' })
    }
  })

  router.get('/logs', adminOnly, async (req, res) => {
    try {
      const rows = await select(
        `SELECT l.id, l.action, l.targetType, l.targetId, l.details, l.createdAt, u.username AS adminName,
                t.username AS targetName
           FROM AdminLogs l
           LEFT JOIN Users u ON u.id = l.adminId
           LEFT JOIN Users t ON l.targetType = 'user' AND t.id = l.targetId
          ORDER BY l.id DESC LIMIT 150`, {})
      res.json(rows)
    } catch (error) {
      console.error('[admin] logs', error)
      res.status(500).json({ error: 'Could not load the activity log.' })
    }
  })

  return router
}

module.exports = { createModerationRouter, createAdminRouter }
