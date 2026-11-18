const { Op } = require('sequelize');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const newUser = await User.create({ username, email, password });
        res.status(201).json({ message: "Account created successfully!", userId: newUser.id });
    } catch (error) {
        res.status(500).json({ error: "Could not create the account (email or username already taken)." });
    }
};

exports.login = async (req, res) => {
    try {
        // On accepte un email OU un pseudo (la maquette se connecte avec le pseudo)
        const { password } = req.body;
        const identifier = req.body.identifier || req.body.email || req.body.username;
        if (!identifier || !password) {
            return res.status(400).json({ error: "Username (or email) and password are required." });
        }

        const user = await User.findOne({
            where: { [Op.or]: [{ email: identifier }, { username: identifier }] }
        });
        if (!user) {
            return res.status(404).json({ error: "No account found with this username or email." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Incorrect password." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret_par_defaut',
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            message: "Login successful", 
            token, 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    } catch (error) {
        res.status(500).json({ error: "Login failed." });
    }
};