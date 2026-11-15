const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const { User, Recipe } = require('./models/Recipe'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API du Carnet de Recettes opérationnelle !' });
});

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Base de données MySQL connectée et tables synchronisées.');
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MySQL :', err);
  });


async function initDb() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à MySQL réussie.');

    await sequelize.sync({ alter: true });
    console.log('Base de données synchronisée.');
  } catch (error) {
    console.error('Impossible de se connecter à la base de données :', error);
  }
}

initDb();