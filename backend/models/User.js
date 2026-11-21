const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Rôle : user | moderator | admin (colonnes du schéma SQL)
    role: {
        type: DataTypes.ENUM('user', 'moderator', 'admin'),
        allowNull: false,
        defaultValue: 'user'
    },
    // Compte suspendu : ne peut plus se connecter
    isBanned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    bannedReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Profil public (colonnes du schéma SQL)
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    specialty: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    websiteUrl: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    // FALSE = la personne ne peut plus signaler (décision d'un modérateur ou d'un admin)
    canReport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    reportBlockedReason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
});

module.exports = User;