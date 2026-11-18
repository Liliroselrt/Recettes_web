const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/AuthMiddleware');

// Dossier des images importées (servi sur /img par server.js)
const IMG_DIR = path.join(__dirname, '..', 'img');
fs.mkdirSync(IMG_DIR, { recursive: true });

const MAX_UPLOAD = '5mb';

// Le navigateur envoie l'image déjà réduite en JPEG ; on la sauvegarde dans /img
//   POST /api/upload  (corps = fichier JPEG)  ->  { "url": "/img/upload-....jpg" }
router.post('/', authMiddleware, express.raw({ type: 'image/jpeg', limit: MAX_UPLOAD }), async (req, res) => {
  const data = req.body;

  // Seuls les vrais JPEG sont acceptés : ils commencent toujours par FF D8 FF
  const isJpeg = Buffer.isBuffer(data) && data.length > 3 &&
                 data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (!isJpeg) {
    return res.status(400).json({ error: 'Only JPEG images are accepted.' });
  }

  // Le nom du fichier est généré par le serveur, jamais pris chez le client
  const fileName = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  await fs.promises.writeFile(path.join(IMG_DIR, fileName), data);
  res.status(201).json({ url: `/img/${fileName}` });
});

router.IMG_DIR = IMG_DIR;
router.MAX_UPLOAD = MAX_UPLOAD;
module.exports = router;
