-- ==========================================================================
-- GourmetCraft - Carnet de recettes communautaire
-- Script MySQL (1/2) : STRUCTURE (Base de données & Tables)
--
-- Utilisation :   mysql -u root -p < database/gourmetcraft_schema.sql
--            ou : exécuter ce fichier en premier dans MySQL Workbench,
--                 puis exécuter `gourmetcraft_data.sql`.
--
-- Les tables (`Users`, `Recipes`) reproduisent les modèles Sequelize du backend
-- (backend/models). Le backend utilise `sequelize.sync()` (sans `alter`) : il ne
-- touche pas aux tables existantes.
--
-- AJOUTS NÉCESSAIRES À L'APPLICATION (repérés par « [APP] » dans le script) :
--   * Recipes.images    : toutes les images de la recette (JSON). `imageUrl` reste
--                         la couverture et est toujours égale à la 1re image.
--   * Recipes.shared    : FALSE = recette privée ("My Creations"), TRUE = partagée.
--                         Défaut TRUE : les recettes insérées à la main sont publiques.
--   * Recipes.sharedAt  : date/heure du partage.
--   * Favorites         : favoris par utilisateur (le coeur sur une recette).
--
-- CONVENTIONS DE DONNÉES (lues par le backend, voir backend/utils/ingredients.js) :
--   * Recipes.ingredients : une ligne par ingrédient, ex. « 150 g sugar »,
--                           « 6 apples », « Black pepper (to taste) ».
--   * Recipes.category    : Entrée | Plat | Dessert | Rapide (affichées en anglais :
--                           Starter / Main / Dessert / Quick).
-- ==========================================================================

-- Supprime l'ancienne base (et toutes ses données) avant de la recréer :
-- le script peut donc être relancé autant que nécessaire.
DROP DATABASE IF EXISTS `projet_web`;

CREATE DATABASE `projet_web`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `projet_web`;

-- --------------------------------------------------------------------------
-- 1. Tables principales & Profils
-- --------------------------------------------------------------------------

-- Utilisateurs, profils publics, rôles (user/moderator/admin) et statut de ban
CREATE TABLE IF NOT EXISTS `Users` (
  `id`            INT                                NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(255)                       NOT NULL,
  `email`         VARCHAR(255)                       NOT NULL,
  `password`      VARCHAR(255)                       NOT NULL,
  `role`          ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
  `bio`           TEXT                               DEFAULT NULL,
  `avatarUrl`     TEXT                               DEFAULT NULL,
  `location`      VARCHAR(150)                       DEFAULT NULL,
  `specialty`     VARCHAR(150)                       DEFAULT NULL,
  `websiteUrl`    VARCHAR(255)                       DEFAULT NULL,
  `isBanned`      BOOLEAN                            NOT NULL DEFAULT FALSE,
  `bannedReason`  TEXT                               DEFAULT NULL,
  `createdAt`     DATETIME                           NOT NULL,
  `updatedAt`     DATETIME                           NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recettes : inclut les vidéos tutoriels et le verrouillage paywall
CREATE TABLE IF NOT EXISTS `Recipes` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `title`             VARCHAR(255)  NOT NULL,
  `ingredients`       TEXT          NOT NULL,               -- une ligne par ingrédient : « 150 g sugar »
  `instructions`      TEXT          NOT NULL,               -- une étape par ligne
  `prepTime`          INT           NOT NULL,
  `category`          VARCHAR(255)  DEFAULT 'Plat',               -- Entrée | Plat | Dessert | Rapide
  `imageUrl`          TEXT          DEFAULT NULL,           -- lien de l'image de couverture
  `videoUrl`          TEXT          DEFAULT NULL,           -- lien vidéo (YouTube / hébergé)
  `isVideoPremium`    BOOLEAN       NOT NULL DEFAULT FALSE, -- TRUE = vidéo derrière un paywall
  `videoUnlockPrice`  DECIMAL(10,2) DEFAULT NULL,           -- prix à l'unité (si non abonné)
  `images`            TEXT          DEFAULT NULL,           -- [APP] toutes les images (JSON) ; imageUrl = la 1re
  `shared`            BOOLEAN       NOT NULL DEFAULT TRUE,  -- [APP] FALSE = recette privée (My Creations)
  `sharedAt`          DATETIME      DEFAULT NULL,           -- [APP] date/heure du partage
  `createdAt`         DATETIME      NOT NULL,
  `updatedAt`         DATETIME      NOT NULL,
  `userId`            INT           DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `Recipes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Avis des utilisateurs
CREATE TABLE IF NOT EXISTS `Reviews` (
  `id`        INT      NOT NULL AUTO_INCREMENT,
  `rating`    TINYINT  NOT NULL,
  `comment`   TEXT     NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `recipeId`  INT      NOT NULL,
  `userId`    INT      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `recipeId` (`recipeId`),
  KEY `userId` (`userId`),
  CONSTRAINT `Reviews_chk_rating` CHECK (`rating` BETWEEN 1 AND 5),
  CONSTRAINT `Reviews_ibfk_1` FOREIGN KEY (`recipeId`) REFERENCES `Recipes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Reviews_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Likes / favoris de la communauté
CREATE TABLE IF NOT EXISTS `RecipeLikes` (
  `recipeId` INT NOT NULL,
  `likes`    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`recipeId`),
  CONSTRAINT `RecipeLikes_ibfk_1` FOREIGN KEY (`recipeId`) REFERENCES `Recipes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [APP] Favoris par utilisateur (coeur sur une recette).
-- RecipeLikes (ci-dessus) = favoris de départ de la communauté ; l'application affiche
-- RecipeLikes.likes + le nombre de lignes de cette table pour la recette.
CREATE TABLE IF NOT EXISTS `Favorites` (
  `userId`    INT      NOT NULL,
  `recipeId`  INT      NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`userId`, `recipeId`),
  KEY `recipeId` (`recipeId`),
  CONSTRAINT `Favorites_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Favorites_ibfk_2` FOREIGN KEY (`recipeId`) REFERENCES `Recipes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 2. Monétisation : Abonnements, Déblocages Vidéos & Demandes de Recettes Payantes
-- --------------------------------------------------------------------------

-- Plans d'abonnement (ex: Gratuit, Gourmet Plus, Chef VIP)
CREATE TABLE IF NOT EXISTS `SubscriptionPlans` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(100)  NOT NULL,
  `slug`         VARCHAR(100)  NOT NULL,
  `description`  TEXT          DEFAULT NULL,
  `priceMonthly` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `features`     TEXT          DEFAULT NULL,
  `isActive`     BOOLEAN       NOT NULL DEFAULT TRUE,
  `createdAt`    DATETIME      NOT NULL,
  `updatedAt`    DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Abonnements actifs/passés des utilisateurs
CREATE TABLE IF NOT EXISTS `UserSubscriptions` (
  `id`        INT                                               NOT NULL AUTO_INCREMENT,
  `userId`    INT                                               NOT NULL,
  `planId`    INT                                               NOT NULL,
  `status`    ENUM('active', 'canceled', 'expired', 'past_due') NOT NULL DEFAULT 'active',
  `startDate` DATETIME                                          NOT NULL,
  `endDate`   DATETIME                                          DEFAULT NULL,
  `createdAt` DATETIME                                          NOT NULL,
  `updatedAt` DATETIME                                          NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `planId` (`planId`),
  CONSTRAINT `UserSubscriptions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserSubscriptions_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlans` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Achats à l'acte pour débloquer une vidéo paywall sans abonnement
CREATE TABLE IF NOT EXISTS `VideoUnlocks` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `userId`     INT           NOT NULL,
  `recipeId`   INT           NOT NULL,
  `amountPaid` DECIMAL(10,2) NOT NULL,
  `unlockedAt` DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_recipe_unlock` (`userId`, `recipeId`),
  KEY `recipeId` (`recipeId`),
  CONSTRAINT `VideoUnlocks_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VideoUnlocks_ibfk_2` FOREIGN KEY (`recipeId`) REFERENCES `Recipes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demandes de recettes rémunérées ("Fined / Paid Request for Recipes")
CREATE TABLE IF NOT EXISTS `RecipeRequests` (
  `id`                INT                                                             NOT NULL AUTO_INCREMENT,
  `requesterId`       INT                                                             NOT NULL,
  `targetChefId`      INT                                                             DEFAULT NULL, -- NULL = ouvert à tous les chefs
  `title`             VARCHAR(255)                                                    NOT NULL,
  `description`       TEXT                                                            NOT NULL,
  `dietaryNotes`      VARCHAR(255)                                                    DEFAULT NULL,
  `offeredAmount`     DECIMAL(10,2)                                                   NOT NULL,
  `status`            ENUM('open', 'accepted', 'fulfilled', 'completed', 'cancelled') NOT NULL DEFAULT 'open',
  `fulfilledRecipeId` INT                                                             DEFAULT NULL,
  `createdAt`         DATETIME                                                        NOT NULL,
  `updatedAt`         DATETIME                                                        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `requesterId` (`requesterId`),
  KEY `targetChefId` (`targetChefId`),
  KEY `fulfilledRecipeId` (`fulfilledRecipeId`),
  CONSTRAINT `RecipeRequests_ibfk_1` FOREIGN KEY (`requesterId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RecipeRequests_ibfk_2` FOREIGN KEY (`targetChefId`) REFERENCES `Users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RecipeRequests_ibfk_3` FOREIGN KEY (`fulfilledRecipeId`) REFERENCES `Recipes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal global des transactions financières
CREATE TABLE IF NOT EXISTS `Payments` (
  `id`          INT                                                    NOT NULL AUTO_INCREMENT,
  `userId`      INT                                                    NOT NULL,
  `amount`      DECIMAL(10,2)                                          NOT NULL,
  `currency`    VARCHAR(10)                                            NOT NULL DEFAULT 'EUR',
  `paymentType` ENUM('subscription', 'video_unlock', 'recipe_request') NOT NULL,
  `referenceId` INT                                                    DEFAULT NULL, -- ID de l'abonnement, de la recette ou de la demande
  `status`      ENUM('pending', 'succeeded', 'failed', 'refunded')     NOT NULL DEFAULT 'succeeded',
  `createdAt`   DATETIME                                               NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `Payments_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 3. Social & Chat en ligne
-- --------------------------------------------------------------------------

-- Abonnements entre utilisateurs (suivre un chef sur sa page profil)
CREATE TABLE IF NOT EXISTS `UserFollows` (
  `followerId`  INT      NOT NULL,
  `followingId` INT      NOT NULL,
  `createdAt`   DATETIME NOT NULL,
  PRIMARY KEY (`followerId`, `followingId`),
  KEY `followingId` (`followingId`),
  CONSTRAINT `UserFollows_ibfk_1` FOREIGN KEY (`followerId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserFollows_ibfk_2` FOREIGN KEY (`followingId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salons de discussion (chat privé 1-à-1 ou salon communautaire)
CREATE TABLE IF NOT EXISTS `ChatRooms` (
  `id`        INT                     NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(150)            DEFAULT NULL, -- NULL pour un DM 1-à-1
  `type`      ENUM('direct', 'group') NOT NULL DEFAULT 'direct',
  `createdAt` DATETIME                NOT NULL,
  `updatedAt` DATETIME                NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Participants d'un salon de chat
CREATE TABLE IF NOT EXISTS `ChatParticipants` (
  `roomId`     INT      NOT NULL,
  `userId`     INT      NOT NULL,
  `joinedAt`   DATETIME NOT NULL,
  `lastReadAt` DATETIME DEFAULT NULL,
  PRIMARY KEY (`roomId`, `userId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ChatParticipants_ibfk_1` FOREIGN KEY (`roomId`) REFERENCES `ChatRooms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChatParticipants_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages envoyés dans le chat en ligne
CREATE TABLE IF NOT EXISTS `ChatMessages` (
  `id`        INT      NOT NULL AUTO_INCREMENT,
  `roomId`    INT      NOT NULL,
  `senderId`  INT      NOT NULL,
  `content`   TEXT     NOT NULL,
  `isDeleted` BOOLEAN  NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `roomId` (`roomId`),
  KEY `senderId` (`senderId`),
  CONSTRAINT `ChatMessages_ibfk_1` FOREIGN KEY (`roomId`) REFERENCES `ChatRooms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChatMessages_ibfk_2` FOREIGN KEY (`senderId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 4. Modération : Contact Admins, Signalements & Blocages
-- --------------------------------------------------------------------------

-- Tickets pour contacter les modérateurs / administrateurs
CREATE TABLE IF NOT EXISTS `ModContactTickets` (
  `id`            INT                                                      NOT NULL AUTO_INCREMENT,
  `userId`        INT                                                      NOT NULL,
  `assignedModId` INT                                                      DEFAULT NULL,
  `subject`       VARCHAR(255)                                             NOT NULL,
  `category`      ENUM('general', 'billing', 'bug', 'ban_appeal', 'other') NOT NULL DEFAULT 'general',
  `message`       TEXT                                                     NOT NULL,
  `status`        ENUM('open', 'in_progress', 'resolved', 'closed')        NOT NULL DEFAULT 'open',
  `adminReply`    TEXT                                                     DEFAULT NULL,
  `createdAt`     DATETIME                                                 NOT NULL,
  `updatedAt`     DATETIME                                                 NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `assignedModId` (`assignedModId`),
  CONSTRAINT `ModContactTickets_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ModContactTickets_ibfk_2` FOREIGN KEY (`assignedModId`) REFERENCES `Users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Signalements (recettes, avis, utilisateurs ou messages de chat)
CREATE TABLE IF NOT EXISTS `Reports` (
  `id`            INT                                                                       NOT NULL AUTO_INCREMENT,
  `reporterId`    INT                                                                       NOT NULL,
  `targetType`    ENUM('user', 'recipe', 'review', 'chat_message')                          NOT NULL,
  `targetId`      INT                                                                       NOT NULL,
  `reason`        ENUM('spam', 'harassment', 'inappropriate_content', 'copyright', 'other') NOT NULL,
  `details`       TEXT                                                                      DEFAULT NULL,
  `status`        ENUM('pending', 'reviewed', 'action_taken', 'dismissed')                  NOT NULL DEFAULT 'pending',
  `reviewedBy`    INT                                                                       DEFAULT NULL,
  `moderatorNote` TEXT                                                                      DEFAULT NULL,
  `createdAt`     DATETIME                                                                  NOT NULL,
  `updatedAt`     DATETIME                                                                  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reporterId` (`reporterId`),
  KEY `reviewedBy` (`reviewedBy`),
  CONSTRAINT `Reports_ibfk_1` FOREIGN KEY (`reporterId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Reports_ibfk_2` FOREIGN KEY (`reviewedBy`) REFERENCES `Users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocages entre utilisateurs
CREATE TABLE IF NOT EXISTS `UserBlocks` (
  `blockerId` INT          NOT NULL,
  `blockedId` INT          NOT NULL,
  `reason`    VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME     NOT NULL,
  PRIMARY KEY (`blockerId`, `blockedId`),
  KEY `blockedId` (`blockedId`),
  CONSTRAINT `UserBlocks_ibfk_1` FOREIGN KEY (`blockerId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserBlocks_ibfk_2` FOREIGN KEY (`blockedId`) REFERENCES `Users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
