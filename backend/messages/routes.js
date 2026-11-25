'use strict'
// ==========================================================================
// Messagerie
//
//  Chat entre membres (tables ChatRooms / ChatParticipants / ChatMessages, déjà dans le schéma)
//    GET    /api/messages/unread                  compteurs pour la barre de navigation
//    GET    /api/messages/threads                 mes conversations (la plus récente d'abord)
//    GET    /api/messages/threads/:userId         la conversation avec une personne (marque comme lu)
//    POST   /api/messages/threads/:userId         envoyer un message { content } (crée la conversation si besoin)
//    DELETE /api/messages/:id                     supprimer un de mes messages
//    GET    /api/messages/groups/:roomId          un groupe : membres + messages (marque comme lu)
//    POST   /api/messages/groups                  créer un groupe { name, memberIds }
//    POST   /api/messages/groups/:roomId          envoyer un message dans le groupe { content }
//    PATCH  /api/messages/groups/:roomId          renommer (créateur) { name }
//    POST   /api/messages/groups/:roomId/members  ajouter des membres (créateur) { userIds }
//    DELETE /api/messages/groups/:roomId/members/:userId   quitter (soi-même) ou retirer quelqu'un (créateur)
//    POST   /api/messages/blocks/:userId          bloquer      (table UserBlocks)
//    DELETE /api/messages/blocks/:userId          débloquer
//
//  Contacter la modération / l'administration (table ModContactTickets + ModTicketMessages)
//    GET    /api/messages/tickets                 mes tickets
//    POST   /api/messages/tickets                 nouveau ticket { subject, category, message, adminOnly }
//    GET    /api/messages/tickets/:id             le fil d'un ticket (son auteur ou le staff autorisé)
//    POST   /api/messages/tickets/:id/messages    répondre { content }
//    GET    /api/messages/staff/tickets           boîte de réception : ?scope=users (demandes des membres, défaut)
//                                                 ou ?scope=staff (demandes de l'équipe, admins seulement)
//    PATCH  /api/messages/staff/tickets/:id       changer l'état { status }
//
// Pas de WebSocket : la page interroge le serveur toutes les quelques secondes (aucune dépendance en plus).
// ==========================================================================
const express = require('express')
const { QueryTypes } = require('sequelize')
const { effectiveRole } = require('../middleware/roles')

const MAX_MESSAGE = 2000
const MAX_TICKET_TEXT = 3000
const MAX_SUBJECT = 120
const MAX_PER_MINUTE = 20     // anti-spam : 20 messages par minute et par personne
const MAX_ACTIVE_TICKETS = 5  // anti-spam : 5 tickets ouverts en même temps
const THREAD_LIMIT = 150      // derniers messages renvoyés pour une conversation
const MAX_GROUP_MEMBERS = 20  // créateur compris
const MAX_GROUPS_OWNED = 20
const MAX_GROUP_NAME = 60

const CATEGORIES = ['general', 'billing', 'bug', 'ban_appeal', 'other']
const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const parseId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}
const clip = (value, max) => (value.length > max ? value.slice(0, max - 1) + '…' : value)

// Crée ce qui manque : la table des réponses aux tickets et la colonne « admins seulement ».
// À appeler une fois au démarrage (idempotent). Voir aussi database/add_messaging.sql.
async function ensureMessagingSchema(sequelize) {
  try {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`ModTicketMessages\` (
         \`id\`         INT        NOT NULL AUTO_INCREMENT,
         \`ticketId\`   INT        NOT NULL,
         \`senderId\`   INT        DEFAULT NULL,
         \`isStaff\`    TINYINT(1) NOT NULL DEFAULT 0,
         \`readByUser\` TINYINT(1) NOT NULL DEFAULT 0,
         \`content\`    TEXT       NOT NULL,
         \`createdAt\`  DATETIME   NOT NULL,
         PRIMARY KEY (\`id\`),
         KEY \`ticketId\` (\`ticketId\`),
         KEY \`senderId\` (\`senderId\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )
    const ensureColumn = async (table, column, definition) => {
      const found = await sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(:table) AND COLUMN_NAME = :column`,
        { replacements: { table, column }, type: QueryTypes.SELECT }
      )
      if (!found.length) await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
    }
    await ensureColumn('ModContactTickets', 'adminOnly', 'TINYINT(1) NOT NULL DEFAULT 0')
    await ensureColumn('ChatRooms', 'createdBy', 'INT DEFAULT NULL')   // créateur d'un groupe
  } catch (error) {
    console.error('❌ Messagerie : impossible de préparer les tables (importez database/efrecipe_schema.sql puis database/add_messaging.sql).', error.message)
  }
}

function createMessagesRouter({ sequelize, authenticate, requireRole }) {
  const router = express.Router()
  const select = (sql, replacements, transaction) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction })
  const run = (sql, replacements, transaction) => sequelize.query(sql, { replacements, transaction })
  const insert = async (sql, replacements, transaction) => {
    const [insertId] = await sequelize.query(sql, { replacements, type: QueryTypes.INSERT, transaction })
    return insertId
  }
  const staff = requireRole('moderator', 'admin')
  const roleOf = (req) => effectiveRole(req.user)
  const isStaffReq = (req) => ['moderator', 'admin'].includes(roleOf(req))

  const fail = (res, label, error, message) => {
    console.error(`[messages] ${label}`, error)
    res.status(500).json({ error: message })
  }

  // Bloqué dans un sens ou dans l'autre ?
  async function blockState(me, other) {
    const rows = await select(
      'SELECT blockerId FROM UserBlocks WHERE (blockerId = :me AND blockedId = :other) OR (blockerId = :other AND blockedId = :me)',
      { me, other }
    )
    return { byMe: rows.some(r => r.blockerId === me), byThem: rows.some(r => r.blockerId === other) }
  }

  async function findRoom(me, other) {
    const [row] = await select(
      `SELECT r.id FROM ChatRooms r
         JOIN ChatParticipants a ON a.roomId = r.id AND a.userId = :me
         JOIN ChatParticipants b ON b.roomId = r.id AND b.userId = :other
        WHERE r.type = 'direct' LIMIT 1`,
      { me, other }
    )
    return row ? row.id : null
  }

  // ------------------------------------------------------------------------
  // Compteurs (pastille de la barre de navigation)
  // ------------------------------------------------------------------------
  router.get('/unread', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const [chats] = await select(
        `SELECT COUNT(*) AS n FROM ChatMessages m
           JOIN ChatParticipants p ON p.roomId = m.roomId AND p.userId = :me
          WHERE m.senderId <> :me AND m.isDeleted = FALSE AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)`,
        { me }
      )
      const [answers] = await select(
        `SELECT COUNT(*) AS n FROM ModTicketMessages tm JOIN ModContactTickets t ON t.id = tm.ticketId
          WHERE t.userId = :me AND tm.isStaff = TRUE AND tm.readByUser = FALSE`,
        { me }
      )
      let inbox = 0   // (staff) demandes des membres en attente
      let team = 0    // (admins) demandes des modérateurs / autres admins en attente
      const isStaff = isStaffReq(req)
      if (isStaff) {
        const isAdmin = roleOf(req) === 'admin' ? 1 : 0
        const [row] = await select(
          `SELECT COUNT(*) AS n FROM ModContactTickets t JOIN Users u ON u.id = t.userId
            WHERE t.status = 'open' AND u.role = 'user' AND (t.adminOnly = FALSE OR :isAdmin = 1)`,
          { isAdmin }
        )
        inbox = Number(row.n)
        if (isAdmin) {
          const [teamRow] = await select(
            "SELECT COUNT(*) AS n FROM ModContactTickets t JOIN Users u ON u.id = t.userId WHERE t.status = 'open' AND u.role <> 'user' AND t.userId <> :me",
            { me }
          )
          team = Number(teamRow.n)
        }
      }
      const support = Number(answers.n)
      res.json({ chats: Number(chats.n), support, inbox, team, isStaff, total: Number(chats.n) + support + inbox + team })
    } catch (error) {
      fail(res, 'unread', error, 'Could not check your messages.')
    }
  })

  // ------------------------------------------------------------------------
  // Chat entre membres
  // ------------------------------------------------------------------------
  router.get('/threads', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const rows = await select(
        `SELECT r.id AS roomId, o.id AS userId, o.username, o.avatarUrl, o.role,
                lm.content AS lastContent, lm.isDeleted AS lastDeleted, lm.senderId AS lastSenderId,
                COALESCE(lm.createdAt, r.createdAt) AS lastAt,
                (SELECT COUNT(*) FROM ChatMessages m
                  WHERE m.roomId = r.id AND m.senderId <> :me AND m.isDeleted = FALSE
                    AND (mine.lastReadAt IS NULL OR m.createdAt > mine.lastReadAt)) AS unread,
                (SELECT COUNT(*) FROM UserBlocks b WHERE b.blockerId = :me AND b.blockedId = o.id) AS blockedByMe
           FROM ChatParticipants mine
           JOIN ChatRooms r ON r.id = mine.roomId AND r.type = 'direct'
           JOIN ChatParticipants other ON other.roomId = r.id AND other.userId <> :me
           JOIN Users o ON o.id = other.userId
           JOIN ChatMessages lm ON lm.id = (SELECT MAX(id) FROM ChatMessages WHERE roomId = r.id)
          WHERE mine.userId = :me
          ORDER BY lastAt DESC LIMIT 100`,
        { me }
      )
      const direct = rows.map(r => ({
        kind: 'direct',
        userId: r.userId,
        username: r.username,
        avatarUrl: r.avatarUrl,
        role: r.role,
        lastMessage: r.lastDeleted ? 'Message deleted' : clip(r.lastContent || '', 80),
        lastFromMe: r.lastSenderId === me,
        lastAt: r.lastAt,
        unread: Number(r.unread),
        blockedByMe: Number(r.blockedByMe) > 0
      }))

      const groupRows = await select(
        `SELECT r.id AS roomId, r.name,
                (SELECT COUNT(*) FROM ChatParticipants x WHERE x.roomId = r.id) AS memberCount,
                lm.content AS lastContent, lm.isDeleted AS lastDeleted, lm.senderId AS lastSenderId, su.username AS lastSenderName,
                COALESCE(lm.createdAt, r.createdAt) AS lastAt,
                (SELECT COUNT(*) FROM ChatMessages m
                  WHERE m.roomId = r.id AND m.senderId <> :me AND m.isDeleted = FALSE
                    AND (mine.lastReadAt IS NULL OR m.createdAt > mine.lastReadAt)) AS unread
           FROM ChatParticipants mine
           JOIN ChatRooms r ON r.id = mine.roomId AND r.type = 'group'
           LEFT JOIN ChatMessages lm ON lm.id = (SELECT MAX(id) FROM ChatMessages WHERE roomId = r.id)
           LEFT JOIN Users su ON su.id = lm.senderId
          WHERE mine.userId = :me
          ORDER BY lastAt DESC LIMIT 100`,
        { me }
      )
      const groups = groupRows.map(g => ({
        kind: 'group',
        roomId: g.roomId,
        name: g.name,
        memberCount: Number(g.memberCount),
        lastMessage: g.lastAt && g.lastSenderId == null && !g.lastContent
          ? 'New group'
          : g.lastDeleted ? 'Message deleted'
          : clip(`${g.lastSenderId === me ? 'You' : (g.lastSenderName || 'Someone')}: ${g.lastContent || ''}`, 80),
        lastFromMe: g.lastSenderId === me,
        lastAt: g.lastAt,
        unread: Number(g.unread)
      }))

      res.json([...direct, ...groups].sort((x, y) => new Date(y.lastAt) - new Date(x.lastAt)))
    } catch (error) {
      fail(res, 'threads', error, 'Could not load your conversations.')
    }
  })

  router.get('/threads/:userId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const other = parseId(req.params.userId)
      if (!other || other === me) return res.status(404).json({ error: 'User not found.' })
      const [user] = await select('SELECT id, username, avatarUrl, role FROM Users WHERE id = :other', { other })
      if (!user) return res.status(404).json({ error: 'User not found.' })

      const blocked = await blockState(me, other)
      const roomId = await findRoom(me, other)
      let messages = []
      if (roomId) {
        const rows = await select(
          `SELECT id, senderId, content, isDeleted, createdAt FROM ChatMessages
            WHERE roomId = :roomId ORDER BY id DESC LIMIT ${THREAD_LIMIT}`,
          { roomId }
        )
        messages = rows.reverse().map(m => ({
          id: m.id, mine: m.senderId === me, isDeleted: !!m.isDeleted,
          content: m.isDeleted ? null : m.content, createdAt: m.createdAt
        }))
        await run('UPDATE ChatParticipants SET lastReadAt = :now WHERE roomId = :roomId AND userId = :me', { now: new Date(), roomId, me })
      }
      // `blockedMe` n'est volontairement pas renvoyé : la personne bloquée ne doit pas le savoir
      res.json({ user, messages, blockedByMe: blocked.byMe })
    } catch (error) {
      fail(res, 'thread', error, 'Could not load this conversation.')
    }
  })

  router.post('/threads/:userId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const other = parseId(req.params.userId)
      const content = text(req.body && req.body.content)
      if (!other || other === me) return res.status(400).json({ error: 'You cannot send a message to this person.' })
      if (req.user.isBanned) {
        return res.status(403).json({ error: 'Your account is suspended: you cannot send messages. You can still contact the staff from the “Contact staff” tab.' })
      }
      if (!content) return res.status(400).json({ error: 'Write a message first.' })
      if (content.length > MAX_MESSAGE) return res.status(400).json({ error: `Please keep your message under ${MAX_MESSAGE} characters.` })

      const [user] = await select('SELECT id FROM Users WHERE id = :other', { other })
      if (!user) return res.status(404).json({ error: 'User not found.' })

      const blocked = await blockState(me, other)
      if (blocked.byMe) return res.status(403).json({ error: 'You blocked this person. Unblock them to send a message.' })
      // On ne dit pas à la personne bloquée qu'elle est bloquée
      if (blocked.byThem) return res.status(403).json({ error: 'You cannot send a message to this person.' })

      const [{ n }] = await select(
        'SELECT COUNT(*) AS n FROM ChatMessages WHERE senderId = :me AND createdAt > :since',
        { me, since: new Date(Date.now() - 60 * 1000) }
      )
      if (Number(n) >= MAX_PER_MINUTE) return res.status(429).json({ error: 'You are sending messages too fast. Please wait a moment.' })

      const now = new Date()
      let roomId = await findRoom(me, other)
      if (!roomId) {
        roomId = await sequelize.transaction(async (transaction) => {
          const id = await insert("INSERT INTO ChatRooms (name, type, createdAt, updatedAt) VALUES (NULL, 'direct', :now, :now)", { now }, transaction)
          await run('INSERT INTO ChatParticipants (roomId, userId, joinedAt, lastReadAt) VALUES (:id, :me, :now, :now), (:id, :other, :now, NULL)', { id, me, other, now }, transaction)
          return id
        })
      }
      const id = await insert('INSERT INTO ChatMessages (roomId, senderId, content, isDeleted, createdAt) VALUES (:roomId, :me, :content, FALSE, :now)', { roomId, me, content, now })
      await run('UPDATE ChatRooms SET updatedAt = :now WHERE id = :roomId', { now, roomId })
      await run('UPDATE ChatParticipants SET lastReadAt = :now WHERE roomId = :roomId AND userId = :me', { now, roomId, me })
      res.status(201).json({ message: { id, mine: true, isDeleted: false, content, createdAt: now } })
    } catch (error) {
      fail(res, 'send', error, 'Could not send your message.')
    }
  })

  router.delete('/:id', authenticate, async (req, res) => {
    try {
      const id = parseId(req.params.id)
      const [message] = id ? await select('SELECT id, senderId FROM ChatMessages WHERE id = :id', { id }) : []
      if (!message || message.senderId !== req.user.id) return res.status(404).json({ error: 'Message not found.' })
      await run('UPDATE ChatMessages SET isDeleted = TRUE WHERE id = :id', { id })
      res.json({ message: 'Message deleted.' })
    } catch (error) {
      fail(res, 'delete', error, 'Could not delete this message.')
    }
  })

  router.post('/blocks/:userId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const other = parseId(req.params.userId)
      if (!other || other === me) return res.status(400).json({ error: 'You cannot block this person.' })
      const [user] = await select('SELECT id, role FROM Users WHERE id = :other', { other })
      if (!user) return res.status(404).json({ error: 'User not found.' })
      if (user.role !== 'user') return res.status(400).json({ error: 'Moderators and admins cannot be blocked. You can report a problem instead.' })
      await run('INSERT IGNORE INTO UserBlocks (blockerId, blockedId, createdAt) VALUES (:me, :other, :now)', { me, other, now: new Date() })
      res.json({ blockedByMe: true })
    } catch (error) {
      fail(res, 'block', error, 'Could not block this person.')
    }
  })

  router.delete('/blocks/:userId', authenticate, async (req, res) => {
    try {
      const other = parseId(req.params.userId)
      if (!other) return res.status(404).json({ error: 'User not found.' })
      await run('DELETE FROM UserBlocks WHERE blockerId = :me AND blockedId = :other', { me: req.user.id, other })
      res.json({ blockedByMe: false })
    } catch (error) {
      fail(res, 'unblock', error, 'Could not unblock this person.')
    }
  })

  // ------------------------------------------------------------------------
  // Groupes de conversation
  // ------------------------------------------------------------------------
  async function loadGroup(roomId, me) {
    const [room] = roomId ? await select(
      `SELECT r.id, r.name, r.createdBy FROM ChatRooms r
         JOIN ChatParticipants p ON p.roomId = r.id AND p.userId = :me
        WHERE r.id = :roomId AND r.type = 'group'`, { roomId, me }) : []
    return room || null
  }

  const groupMembers = (roomId) => select(
    `SELECT u.id, u.username, u.avatarUrl, u.role FROM ChatParticipants p JOIN Users u ON u.id = p.userId
      WHERE p.roomId = :roomId ORDER BY p.joinedAt ASC, u.username ASC`, { roomId })

  // Parmi `ids` : les personnes qui existent, pas déjà dans le groupe, ni bloquées dans un sens ou l'autre
  async function addableMembers(me, ids, alreadyIn = []) {
    const unique = [...new Set((Array.isArray(ids) ? ids : []).map(Number)
      .filter(id => Number.isInteger(id) && id > 0 && id !== me && !alreadyIn.includes(id)))]
    if (!unique.length) return { ok: [], skipped: 0 }
    const users = await select('SELECT id FROM Users WHERE id IN (:ids)', { ids: unique })
    const blocks = await select(
      'SELECT blockerId, blockedId FROM UserBlocks WHERE (blockerId = :me AND blockedId IN (:ids)) OR (blockedId = :me AND blockerId IN (:ids))',
      { me, ids: unique })
    const blocked = new Set(blocks.flatMap(b => [b.blockerId, b.blockedId]))
    const ok = users.map(u => u.id).filter(id => !blocked.has(id))
    return { ok, skipped: unique.length - ok.length }
  }

  const groupBannedError = 'Your account is suspended: you cannot send messages. You can still contact the staff from the “Contact staff” tab.'

  router.post('/groups', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      if (req.user.isBanned) return res.status(403).json({ error: groupBannedError })
      const name = text(req.body && req.body.name)
      if (name.length < 2) return res.status(400).json({ error: 'Please give your group a name (at least 2 characters).' })
      if (name.length > MAX_GROUP_NAME) return res.status(400).json({ error: `Please keep the group name under ${MAX_GROUP_NAME} characters.` })

      const { ok, skipped } = await addableMembers(me, req.body && req.body.memberIds)
      if (ok.length < 2) {
        return res.status(400).json({ error: skipped ? 'Some people cannot be added to a group. Pick at least 2 other people.' : 'Pick at least 2 other people for a group. For one person, send a direct message.' })
      }
      if (ok.length + 1 > MAX_GROUP_MEMBERS) return res.status(400).json({ error: `A group can have ${MAX_GROUP_MEMBERS} people at most, including you.` })

      const [{ n }] = await select("SELECT COUNT(*) AS n FROM ChatRooms WHERE type = 'group' AND createdBy = :me", { me })
      if (Number(n) >= MAX_GROUPS_OWNED) return res.status(429).json({ error: `You already created ${MAX_GROUPS_OWNED} groups. Leave or empty one before creating another.` })

      const now = new Date()
      const roomId = await sequelize.transaction(async (transaction) => {
        const id = await insert("INSERT INTO ChatRooms (name, type, createdBy, createdAt, updatedAt) VALUES (:name, 'group', :me, :now, :now)", { name, me, now }, transaction)
        await run('INSERT INTO ChatParticipants (roomId, userId, joinedAt, lastReadAt) VALUES (:id, :me, :now, :now)', { id, me, now }, transaction)
        for (const userId of ok) {
          await run('INSERT INTO ChatParticipants (roomId, userId, joinedAt, lastReadAt) VALUES (:id, :userId, :now, NULL)', { id, userId, now }, transaction)
        }
        return id
      })
      res.status(201).json({ roomId, skipped })
    } catch (error) {
      fail(res, 'group-create', error, 'Could not create this group.')
    }
  })

  router.get('/groups/:roomId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const roomId = parseId(req.params.roomId)
      const room = await loadGroup(roomId, me)
      if (!room) return res.status(404).json({ error: 'Group not found.' })

      const members = await groupMembers(roomId)
      const rows = await select(
        `SELECT m.id, m.senderId, m.content, m.isDeleted, m.createdAt, u.username, u.avatarUrl
           FROM ChatMessages m LEFT JOIN Users u ON u.id = m.senderId
          WHERE m.roomId = :roomId ORDER BY m.id DESC LIMIT ${THREAD_LIMIT}`, { roomId })
      const messages = rows.reverse().map(m => ({
        id: m.id, mine: m.senderId === me, senderId: m.senderId, senderName: m.username || 'Deleted account', senderAvatar: m.avatarUrl,
        isDeleted: !!m.isDeleted, content: m.isDeleted ? null : m.content, createdAt: m.createdAt
      }))
      await run('UPDATE ChatParticipants SET lastReadAt = :now WHERE roomId = :roomId AND userId = :me', { now: new Date(), roomId, me })
      res.json({ room: { id: room.id, name: room.name, isOwner: room.createdBy === me, createdBy: room.createdBy }, members, messages })
    } catch (error) {
      fail(res, 'group', error, 'Could not load this group.')
    }
  })

  router.post('/groups/:roomId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const roomId = parseId(req.params.roomId)
      const content = text(req.body && req.body.content)
      if (req.user.isBanned) return res.status(403).json({ error: groupBannedError })
      if (!content) return res.status(400).json({ error: 'Write a message first.' })
      if (content.length > MAX_MESSAGE) return res.status(400).json({ error: `Please keep your message under ${MAX_MESSAGE} characters.` })
      const room = await loadGroup(roomId, me)
      if (!room) return res.status(404).json({ error: 'Group not found.' })

      const [{ n }] = await select('SELECT COUNT(*) AS n FROM ChatMessages WHERE senderId = :me AND createdAt > :since', { me, since: new Date(Date.now() - 60 * 1000) })
      if (Number(n) >= MAX_PER_MINUTE) return res.status(429).json({ error: 'You are sending messages too fast. Please wait a moment.' })

      const now = new Date()
      const id = await insert('INSERT INTO ChatMessages (roomId, senderId, content, isDeleted, createdAt) VALUES (:roomId, :me, :content, FALSE, :now)', { roomId, me, content, now })
      await run('UPDATE ChatRooms SET updatedAt = :now WHERE id = :roomId', { now, roomId })
      await run('UPDATE ChatParticipants SET lastReadAt = :now WHERE roomId = :roomId AND userId = :me', { now, roomId, me })
      res.status(201).json({ message: { id, mine: true, senderId: me, senderName: req.user.username, senderAvatar: null, isDeleted: false, content, createdAt: now } })
    } catch (error) {
      fail(res, 'group-send', error, 'Could not send your message.')
    }
  })

  router.patch('/groups/:roomId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const roomId = parseId(req.params.roomId)
      const name = text(req.body && req.body.name)
      const room = await loadGroup(roomId, me)
      if (!room) return res.status(404).json({ error: 'Group not found.' })
      if (room.createdBy !== me) return res.status(403).json({ error: 'Only the person who created the group can rename it.' })
      if (name.length < 2 || name.length > MAX_GROUP_NAME) return res.status(400).json({ error: `The group name must have between 2 and ${MAX_GROUP_NAME} characters.` })
      await run('UPDATE ChatRooms SET name = :name, updatedAt = :now WHERE id = :roomId', { name, now: new Date(), roomId })
      res.json({ name })
    } catch (error) {
      fail(res, 'group-rename', error, 'Could not rename this group.')
    }
  })

  router.post('/groups/:roomId/members', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const roomId = parseId(req.params.roomId)
      const room = await loadGroup(roomId, me)
      if (!room) return res.status(404).json({ error: 'Group not found.' })
      if (room.createdBy !== me) return res.status(403).json({ error: 'Only the person who created the group can add people.' })

      const current = await groupMembers(roomId)
      const { ok, skipped } = await addableMembers(me, req.body && req.body.userIds, current.map(m => m.id))
      if (!ok.length) return res.status(400).json({ error: skipped ? 'These people cannot be added to the group.' : 'Pick at least one person to add.' })
      if (current.length + ok.length > MAX_GROUP_MEMBERS) return res.status(400).json({ error: `A group can have ${MAX_GROUP_MEMBERS} people at most.` })

      const now = new Date()
      for (const userId of ok) {
        await run('INSERT INTO ChatParticipants (roomId, userId, joinedAt, lastReadAt) VALUES (:roomId, :userId, :now, NULL)', { roomId, userId, now })
      }
      res.status(201).json({ added: ok.length, skipped })
    } catch (error) {
      fail(res, 'group-add', error, 'Could not add these people.')
    }
  })

  // Quitter le groupe (userId = soi-même) ou retirer quelqu'un (créateur seulement)
  router.delete('/groups/:roomId/members/:userId', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const roomId = parseId(req.params.roomId)
      const target = parseId(req.params.userId)
      const room = await loadGroup(roomId, me)
      if (!room || !target) return res.status(404).json({ error: 'Group not found.' })
      if (target !== me && room.createdBy !== me) return res.status(403).json({ error: 'Only the person who created the group can remove people.' })

      await run('DELETE FROM ChatParticipants WHERE roomId = :roomId AND userId = :target', { roomId, target })
      const left = await groupMembers(roomId)
      if (!left.length) {
        await run('DELETE FROM ChatRooms WHERE id = :roomId', { roomId })   // plus personne : le groupe disparaît
      } else if (target === room.createdBy) {
        await run('UPDATE ChatRooms SET createdBy = :next WHERE id = :roomId', { next: left[0].id, roomId })   // le plus ancien membre reprend le groupe
      }
      res.json({ left: target === me })
    } catch (error) {
      fail(res, 'group-leave', error, 'Could not update this group.')
    }
  })

  // ------------------------------------------------------------------------
  // Contacter la modération / l'administration
  // ------------------------------------------------------------------------
  const ticketSelect = `SELECT t.id, t.userId, t.subject, t.category, t.status, t.adminOnly, t.message, t.createdAt, t.updatedAt,
                               u.username, u.avatarUrl, u.isBanned, u.role AS authorRole, a.username AS assignedName
                          FROM ModContactTickets t
                          JOIN Users u ON u.id = t.userId
                          LEFT JOIN Users a ON a.id = t.assignedModId`

  // Un ticket « admins seulement » n'est visible que par un admin (vrai ou en mode « voir comme » admin)
  const staffCanSee = (req, ticket) => isStaffReq(req) && (!ticket.adminOnly || roleOf(req) === 'admin')

  const publicTicket = (t) => ({
    id: t.id, userId: t.userId, username: t.username, avatarUrl: t.avatarUrl, isBanned: !!t.isBanned, authorRole: t.authorRole,
    subject: t.subject, category: t.category, status: t.status, adminOnly: !!t.adminOnly,
    assignedName: t.assignedName || null, createdAt: t.createdAt, updatedAt: t.updatedAt
  })

  router.get('/tickets', authenticate, async (req, res) => {
    try {
      const rows = await select(
        `${ticketSelect} WHERE t.userId = :me ORDER BY t.updatedAt DESC LIMIT 100`, { me: req.user.id })
      const unread = await select(
        `SELECT tm.ticketId, COUNT(*) AS n FROM ModTicketMessages tm JOIN ModContactTickets t ON t.id = tm.ticketId
          WHERE t.userId = :me AND tm.isStaff = TRUE AND tm.readByUser = FALSE GROUP BY tm.ticketId`,
        { me: req.user.id }
      )
      const unreadBy = new Map(unread.map(r => [r.ticketId, Number(r.n)]))
      res.json(rows.map(t => ({ ...publicTicket(t), unread: unreadBy.get(t.id) || 0 })))
    } catch (error) {
      fail(res, 'tickets', error, 'Could not load your requests.')
    }
  })

  router.post('/tickets', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const subject = text(req.body && req.body.subject)
      const message = text(req.body && req.body.message)
      const category = CATEGORIES.includes(req.body && req.body.category) ? req.body.category : 'general'
      // Une demande de levée de suspension est lue par un admin : la modération n'a pas le dernier mot
      // Une demande venant d'un modérateur ou d'un admin n'est lue que par les admins
      const adminOnly = !!(req.body && req.body.adminOnly) || category === 'billing' || isStaffReq(req)

      if (subject.length < 3) return res.status(400).json({ error: 'Please add a short subject (at least 3 characters).' })
      if (subject.length > MAX_SUBJECT) return res.status(400).json({ error: `Please keep the subject under ${MAX_SUBJECT} characters.` })
      if (message.length < 10) return res.status(400).json({ error: 'Please describe your request (at least 10 characters).' })
      if (message.length > MAX_TICKET_TEXT) return res.status(400).json({ error: `Please keep your message under ${MAX_TICKET_TEXT} characters.` })

      const [{ n }] = await select("SELECT COUNT(*) AS n FROM ModContactTickets WHERE userId = :me AND status IN ('open', 'in_progress')", { me })
      if (Number(n) >= MAX_ACTIVE_TICKETS) {
        return res.status(429).json({ error: `You already have ${MAX_ACTIVE_TICKETS} open requests. Please wait for an answer or add details to one of them.` })
      }

      const now = new Date()
      const id = await insert(
        `INSERT INTO ModContactTickets (userId, subject, category, message, status, adminOnly, createdAt, updatedAt)
         VALUES (:me, :subject, :category, :message, 'open', :adminOnly, :now, :now)`,
        { me, subject, category, message, adminOnly: adminOnly ? 1 : 0, now }
      )
      res.status(201).json({ id, message: 'Your request was sent. We will answer here.' })
    } catch (error) {
      fail(res, 'ticket-create', error, 'Could not send your request.')
    }
  })

  // Le fil d'un ticket : le premier message est celui du ticket, puis les réponses
  router.get('/tickets/:id', authenticate, async (req, res) => {
    try {
      const id = parseId(req.params.id)
      const [ticket] = id ? await select(`${ticketSelect} WHERE t.id = :id`, { id }) : []
      const owner = ticket && ticket.userId === req.user.id
      if (!ticket || !(owner || staffCanSee(req, ticket))) return res.status(404).json({ error: 'Request not found.' })

      const replies = await select(
        `SELECT m.id, m.senderId, m.isStaff, m.content, m.createdAt, u.username, u.avatarUrl, u.role
           FROM ModTicketMessages m LEFT JOIN Users u ON u.id = m.senderId
          WHERE m.ticketId = :id ORDER BY m.id ASC`,
        { id }
      )
      if (owner) await run('UPDATE ModTicketMessages SET readByUser = TRUE WHERE ticketId = :id AND isStaff = TRUE AND readByUser = FALSE', { id })

      const messages = [
        { id: 0, fromStaff: false, author: ticket.username, avatarUrl: ticket.avatarUrl, role: null, content: ticket.message, createdAt: ticket.createdAt },
        ...replies.map(m => ({
          id: m.id, fromStaff: !!m.isStaff, author: m.username || 'Deleted account',
          avatarUrl: m.avatarUrl, role: m.isStaff ? m.role : null, content: m.content, createdAt: m.createdAt
        }))
      ]
      res.json({ ticket: publicTicket(ticket), messages, isOwner: owner })
    } catch (error) {
      fail(res, 'ticket', error, 'Could not load this request.')
    }
  })

  router.post('/tickets/:id/messages', authenticate, async (req, res) => {
    try {
      const me = req.user.id
      const id = parseId(req.params.id)
      const content = text(req.body && req.body.content)
      const [ticket] = id ? await select('SELECT id, userId, status, adminOnly FROM ModContactTickets WHERE id = :id', { id }) : []
      const owner = ticket && ticket.userId === me
      if (!ticket || !(owner || staffCanSee(req, ticket))) return res.status(404).json({ error: 'Request not found.' })
      if (!content) return res.status(400).json({ error: 'Write a message first.' })
      if (content.length > MAX_TICKET_TEXT) return res.status(400).json({ error: `Please keep your message under ${MAX_TICKET_TEXT} characters.` })
      if (ticket.status === 'closed') return res.status(400).json({ error: 'This request is closed. Please open a new one.' })

      const now = new Date()
      // Une personne répond comme demandeuse sur son propre ticket, sinon comme membre du staff
      await insert(
        'INSERT INTO ModTicketMessages (ticketId, senderId, isStaff, readByUser, content, createdAt) VALUES (:id, :me, :isStaff, :read, :content, :now)',
        { id, me, isStaff: owner ? 0 : 1, read: owner ? 1 : 0, content, now }
      )
      if (owner) {
        // Une réponse du demandeur rouvre un ticket résolu
        await run("UPDATE ModContactTickets SET updatedAt = :now, status = IF(status = 'resolved', 'open', status) WHERE id = :id", { now, id })
      } else {
        await run(
          "UPDATE ModContactTickets SET updatedAt = :now, status = IF(status = 'open', 'in_progress', status), assignedModId = COALESCE(assignedModId, :me) WHERE id = :id",
          { now, id, me }
        )
      }
      res.status(201).json({ message: 'Sent.' })
    } catch (error) {
      fail(res, 'ticket-reply', error, 'Could not send your message.')
    }
  })

  // Boîte de réception du staff. `status` : active (défaut) | open | in_progress | resolved | closed | all
  router.get('/staff/tickets', staff, async (req, res) => {
    try {
      const wanted = String(req.query.status || 'active')
      // users : demandes des membres (défaut) · staff : demandes de l'équipe, lues par les admins seulement
      const scope = req.query.scope === 'staff' ? 'staff' : 'users'
      if (scope === 'staff' && roleOf(req) !== 'admin') return res.status(403).json({ error: 'Only admins can read the requests from the team.' })
      const where = [scope === 'staff' ? "u.role <> 'user' AND t.userId <> :me" : "u.role = 'user'"]
      const replacements = { isAdmin: roleOf(req) === 'admin' ? 1 : 0, me: req.user.id }
      if (wanted === 'active') where.push("t.status IN ('open', 'in_progress')")
      else if (STATUSES.includes(wanted)) { where.push('t.status = :wanted'); replacements.wanted = wanted }
      where.push('(t.adminOnly = FALSE OR :isAdmin = 1)')

      const rows = await select(
        `${ticketSelect} WHERE ${where.join(' AND ')}
          ORDER BY FIELD(t.status, 'open', 'in_progress', 'resolved', 'closed'), t.updatedAt DESC LIMIT 200`,
        replacements
      )
      res.json(rows.map(publicTicket))
    } catch (error) {
      fail(res, 'staff-tickets', error, 'Could not load the requests.')
    }
  })

  router.patch('/staff/tickets/:id', staff, async (req, res) => {
    try {
      const id = parseId(req.params.id)
      const status = req.body && req.body.status
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' })
      const [ticket] = id ? await select('SELECT id, adminOnly FROM ModContactTickets WHERE id = :id', { id }) : []
      if (!ticket || !staffCanSee(req, ticket)) return res.status(404).json({ error: 'Request not found.' })

      await run('UPDATE ModContactTickets SET status = :status, assignedModId = COALESCE(assignedModId, :me), updatedAt = :now WHERE id = :id',
        { status, me: req.user.id, now: new Date(), id })
      await run('INSERT INTO AdminLogs (adminId, action, targetType, targetId, details, createdAt) VALUES (:me, :action, :type, :id, :details, :now)',
        { me: req.user.id, action: 'ticket_status', type: 'ticket', id, details: `Status: ${status}`, now: new Date() })
      res.json({ status })
    } catch (error) {
      fail(res, 'ticket-status', error, 'Could not update this request.')
    }
  })

  return router
}

module.exports = { createMessagesRouter, ensureMessagingSchema }
