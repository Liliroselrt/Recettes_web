const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

const User = require('./models/User');
const Recipe = require('./models/Recipe');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


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