# Abonnement Gourmet Plus (30 ZAR / mois) — paiement SIMULÉ

Projet local : aucun vrai paiement. La fenêtre de paiement est factice (aucune donnée de carte n'est envoyée ni stockée) ; le serveur crée simplement l'abonnement et une ligne dans `Payments`.

## Contenu
| Dossier | Contenu |
|---|---|
| `database/` | `efrecipe_schema.sql` et `efrecipe_data.sql` modifiés (devise ZAR, plan à 30 ZAR, vidéos réservées aux abonnés) |
| `backend/subscription/` | `access.js` (règles d'accès aux vidéos), `routes.js` (routes `/api/subscription/*`) |
| `frontend/src/` | nouveaux : `composables/useSubscription.js`, `views/PlansView.vue`, `components/FakePaymentModal.vue` ; modifiés : `router/index.js`, `Navbar.vue`, `RecipeModal.vue`, `RecipeFormModal.vue` |

## Règle d'accès aux vidéos
Une vidéo est visible si la personne est **l'auteur de la recette** (ses vidéos dans *My Creations* sont toujours accessibles), **abonnée**, a débloqué la recette à l'unité (`VideoUnlocks`), est modératrice/admin, ou si la vidéo n'est pas premium. Sinon le serveur n'envoie jamais le lien (`videoUrl: null`). Dans la fenêtre d'une recette, la vidéo s'affiche dans un encadré **après les instructions**.

## Étapes
1. **Base** : remplacer vos deux `.sql` par ceux de `database/`, les exécuter (schéma puis données). Le schéma supprime et recrée `projet_web`.
2. **Backend** (Express, CommonJS) : copier `backend/subscription/` puis
   ```js
   const { createSubscriptionRouter } = require('./subscription/routes')
   app.use('/api/subscription', createSubscriptionRouter({ sequelize, authenticate })) // authenticate = votre middleware JWT
   ```
   (si votre middleware ne remplit pas `req.user.id`, ajoutez `getUserId: (req) => ...`)
3. **Masquer les vidéos verrouillées** (indispensable) dans les routes qui renvoient des recettes :
   ```js
   const { getViewerAccess, applyVideoAccess } = require('./subscription/access')
   const viewer = await getViewerAccess(sequelize, req.user || null)   // null = visiteur
   const payload = recipes.map(r => applyVideoAccess(r.toJSON(), viewer))
   ```
   Dans `POST /recipes` et `PUT /recipes/:id`, forcez `isVideoPremium = !!videoUrl`.
4. **Frontend** : copier `frontend/src/` par-dessus votre `src/`.

## Test
Connectez-vous → **Go Plus** → *Subscribe* → entrez n'importe quelles valeurs (carte finissant par `0000` = refusée) → les vidéos se débloquent. *Cancel subscription* garde l'accès jusqu'à la date de fin. Il n'y a pas de renouvellement automatique : après `endDate`, il faut se réabonner.

## Limites
- Backend non testé contre votre code (je n'avais que le frontend et le SQL) ; composants Vue non compilés ici : lancez `npm run dev` et regardez la console.
- Non implémenté : achat d'une vidéo à l'unité, essai gratuit, tarif annuel.
