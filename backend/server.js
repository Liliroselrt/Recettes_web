const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middleware/AuthMiddleware');
const { createSubscriptionRouter } = require('./subscription/routes');
const { createReportsRouter } = require('./reports/routes');
const { createModerationRouter, createAdminRouter } = require('./moderation/routes');
const requireRole = require('./middleware/requireRole');
const { createMessagesRouter, ensureMessagingSchema } = require('./messages/routes');
require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Images importées depuis le site (dossier backend/img)
app.use('/img', express.static(uploadRoutes.IMG_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/upload', uploadRoutes);
// Profils publics, abonnements, paramètres du compte et historique des recettes faites
app.use('/api/users', userRoutes);
// Abonnement Gourmet Plus (paiement simulé)
app.use('/api/subscription', createSubscriptionRouter({ sequelize, authenticate: authMiddleware }));
// Signalements (recette, personne ou avis)
app.use('/api/reports', createReportsRouter({ sequelize, authenticate: authMiddleware }));
// Modération (modérateurs + admins) et administration (admins)
app.use('/api/mod', createModerationRouter({ sequelize, requireRole }));
app.use('/api/admin', createAdminRouter({ sequelize, requireRole }));
// Messagerie : chat entre membres + contact des modérateurs / admins
app.use('/api/messages', createMessagesRouter({ sequelize, authenticate: authMiddleware, requireRole }));

app.get('/', (req, res) => {
  res.json({ message: 'Recipe cookbook API is running!' });
});

// Erreurs de l'API (par exemple une image trop lourde)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: `The image is too large (${uploadRoutes.MAX_UPLOAD} maximum).` });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

// Les tables sont créées par database/gourmetcraft.sql. `sync()` ne fait que créer
// celles qui manquent. On évite `{ alter: true }` : sous Windows (noms de tables en
// minuscules) il rajoute une clé étrangère à chaque démarrage puis plante avec
// « Duplicate foreign key constraint name ».
sequelize.sync()
  .then(() => ensureMessagingSchema(sequelize))
  .then(() => {
    console.log('✅ Base de données MySQL connectée et tables synchronisées.');
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MySQL :', err);
  });
