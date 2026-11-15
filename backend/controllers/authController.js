const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Tous les champs sont obligatoires." });
        }

        const newUser = await User.create({ username, email, password });
        res.status(201).json({ message: "Utilisateur créé avec succès !", userId: newUser.id });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'inscription (email ou pseudo déjà pris)." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Mot de passe incorrect." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret_par_defaut',
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            message: "Connexion réussie", 
            token, 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la connexion." });
    }
};