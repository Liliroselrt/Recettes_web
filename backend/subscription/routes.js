'use strict'
// ==========================================================================
// Routes /api/subscription/*  —  PAIEMENT SIMULÉ (projet local, aucun vrai paiement)
//   GET  /plan        infos publiques du plan (prix en rand)
//   GET  /me          état de l'abonnement de la personne connectée
//   POST /subscribe   « paie » : crée l'abonnement (1 mois) + une ligne dans Payments
//   POST /cancel      annule : l'accès est conservé jusqu'à endDate
// Aucune donnée de carte n'est envoyée ni stockée : la fenêtre de paiement du frontend est factice.
// ==========================================================================
const express = require('express')
const { QueryTypes } = require('sequelize')
const { getActiveSubscription } = require('./access')

const PLAN_SLUG = 'gourmet-plus'
const CURRENCY = 'ZAR'

const addOneMonth = (from) => {
  const d = new Date(from)
  d.setMonth(d.getMonth() + 1)
  return d
}

/**
 * @param {object}   deps
 * @param {import('sequelize').Sequelize} deps.sequelize  instance Sequelize du backend
 * @param {Function} deps.authenticate                    middleware qui exige un JWT valide
 * @param {Function} [deps.getUserId]                     lit l'id de la personne connectée dans `req`
 */
function createSubscriptionRouter({ sequelize, authenticate, getUserId = (req) => req.user?.id ?? req.userId }) {
  const router = express.Router()
  const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT })
  const getPlan = async () => (await select('SELECT * FROM SubscriptionPlans WHERE slug = :slug AND isActive = TRUE LIMIT 1', { slug: PLAN_SLUG }))[0]

  router.get('/plan', async (req, res) => {
    const plan = await getPlan()
    if (!plan) return res.status(404).json({ error: 'The subscription plan is not available.' })
    res.json({ slug: plan.slug, name: plan.name, price: Number(plan.priceMonthly), currency: CURRENCY })
  })

  router.get('/me', authenticate, async (req, res) => {
    const sub = await getActiveSubscription(sequelize, getUserId(req))
    // Admin qui « voit comme » un abonné : abonnement simulé (rien n'est créé en base)
    if (!sub && req.user && req.user.viewAs === 'subscriber') {
      return res.json({ isSubscriber: true, status: 'active', startDate: new Date(), endDate: addOneMonth(new Date()), willRenew: false, simulated: true })
    }
    res.json({
      isSubscriber: !!sub,
      status: sub ? sub.status : null,
      startDate: sub ? sub.startDate : null,
      endDate: sub ? sub.endDate : null,
      willRenew: !!sub && sub.status === 'active'
    })
  })

  router.post('/subscribe', authenticate, async (req, res) => {
    try {
      const userId = getUserId(req)
      if (req.user && req.user.viewAs === 'subscriber') {
        return res.status(409).json({ error: 'You are viewing the site as a subscriber (simulation). Switch to another view to test the payment.' })
      }
      if (await getActiveSubscription(sequelize, userId)) {
        return res.status(409).json({ error: 'You already have an active subscription.' })
      }
      const plan = await getPlan()
      if (!plan) return res.status(404).json({ error: 'The subscription plan is not available.' })

      const now = new Date()
      const endDate = addOneMonth(now)
      await sequelize.transaction(async (transaction) => {
        const [subscriptionId] = await sequelize.query(
          `INSERT INTO UserSubscriptions (userId, planId, status, startDate, endDate, createdAt, updatedAt)
           VALUES (:userId, :planId, 'active', :now, :endDate, :now, :now)`,
          { replacements: { userId, planId: plan.id, now, endDate }, transaction }
        )
        await sequelize.query(
          `INSERT INTO Payments (userId, amount, currency, paymentType, referenceId, status, createdAt)
           VALUES (:userId, :amount, :currency, 'subscription', :subscriptionId, 'succeeded', :now)`,
          { replacements: { userId, amount: plan.priceMonthly, currency: CURRENCY, subscriptionId, now }, transaction }
        )
      })
      res.status(201).json({ isSubscriber: true, status: 'active', startDate: now, endDate, willRenew: true })
    } catch (e) {
      console.error('[subscription] subscribe', e)
      res.status(500).json({ error: 'Could not complete the subscription. Please try again.' })
    }
  })

  router.post('/cancel', authenticate, async (req, res) => {
    try {
      const sub = await getActiveSubscription(sequelize, getUserId(req))
      if (!sub) return res.status(404).json({ error: 'You have no active subscription.' })
      await sequelize.query("UPDATE UserSubscriptions SET status = 'canceled', updatedAt = :now WHERE id = :id",
        { replacements: { now: new Date(), id: sub.id } })
      res.json({ status: 'canceled', endDate: sub.endDate })
    } catch (e) {
      console.error('[subscription] cancel', e)
      res.status(500).json({ error: 'Could not cancel the subscription.' })
    }
  })

  return router
}

module.exports = { createSubscriptionRouter }
