const express = require('express');
const router = express.Router();

router.post('/signalements', async (req, res) => {
    try {
        const { type, target_id, motif } = req.body;
        
        console.log(`Signalement reçu : ${type} #${target_id} pour le motif : ${motif}`);

        res.status(200).json({ message: "Signalement bien pris en compte !" });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.post('/api/bloquer', async (req, res) => {
    const { blockedId } = req.body;
    res.json({ success: true, message: "Utilisateur bloqué." });
});

router.post('/api/abonnement', async (req, res) => {
    const { creatorId, action } = req.body; 
    res.json({ success: true, action });
});

router.post('/api/contact', async (req, res) => {
    const { email, sujet, message } = req.body;
    console.log(`Message de contact de ${email} (${sujet}): ${message}`);
    res.json({ success: true, message: "Message envoyé !" });
});

router.get('/api/admin/signalements', async (req, res) => {
    const signalementsFictifs = [{ id: 1, type: 'recette', motif: 'Spam' }];
    res.json(signalementsFictifs);
});

router.delete('/api/admin/contenu/:id', async (req, res) => {
    const id = req.params.id;
    res.json({ success: true, message: "Contenu supprimé." });
});

module.exports = router;