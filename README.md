# 🍳 Ef'Recipe – Community Cookbook

**Ef'Recipe** is a full-stack web application where cooking enthusiasts explore, share, rate and manage recipes. Beyond the classic recipe book, it includes a **pantry** ("What can I cook with what I have?") that tells you which recipes you can make with the ingredients you own.

---

## ✨ Features

- **Three tabs**: *Home* (shared recipes), *My Creations* (your recipes, private until you share them) and *Favorites*.
- **Search & filters**: search by dish or ingredient, category pills (Starter / Main / Dessert / Quick), and 6 sort orders (Most recent, Trending, Top rated, Most reviewed, Quickest, Best pantry match).
- **My Pantry**: tick the ingredients you have (with quantities). Basics (water, salt, pepper, oils) are assumed available. Cards show *"You have everything"* or what is missing, and *"Only recipes I can make"* filters the list. In a recipe window, each ingredient is marked ✓ / missing / not enough and can be added to the pantry in one click.
- **Recipe window** with previous / next navigation (buttons or ← → keys), image carousel (up to 6 pictures), numbered steps, ratings and reviews.
- **Create / edit recipes** with structured ingredients (name, quantity, unit), several images (a link, or a file imported from your computer and saved in `backend/img`) and an optional video link (shown as a *Watch the video* button).
- **Share / unshare**: sharing records the exact date and time.
- **Favorites and reviews** saved in MySQL. Visitors can read everything; an account is needed to favorite, review, create and share.

> The pantry is personal to the browser (`localStorage`); everything else is stored in MySQL.

---

## 🛠️ Tech Stack

- **Frontend:** Vue.js 3 (Composition API), Vue Router, Tailwind CSS 4, FontAwesome
- **Backend:** Node.js, Express.js, Sequelize (ORM)
- **Database:** MySQL
- **Security & Authentication:** password hashing with `bcrypt`, stateless authentication via `JWT`, server-side ownership checks, whitelisted input fields, JPEG signature check on uploads.

---

## 🚀 Prerequisites & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **MySQL Server** (e.g., via MySQL Workbench)

### 2. Database Setup
The database is defined by two scripts in `database/`, to run **in this order**:
```bash
mysql -u root -p --default-character-set=utf8mb4 < database/efrecipe_schema.sql   # drops & recreates `projet_web`, creates the tables
mysql -u root -p --default-character-set=utf8mb4 < database/efrecipe_data.sql     # inserts the sample data
```
(or run both files, in that order, in MySQL Workbench).

Sample data: 26 recipes, 30 reviews, 10 accounts (8 users, 1 admin, 1 moderator) plus the data of the other tables (subscriptions, chat, reports...). Log in with a username (e.g. `Chef_Lucas`) or an email (e.g. `chef_lucas@example.com`). **All demo accounts use the password `Password123!`.**

*(Note: the backend uses `sequelize.sync()`, which only creates missing tables. Do not switch it to `{ alter: true }`: on Windows it adds a foreign key at every start and ends with a "Duplicate foreign key constraint name" error.)*

#### What the application needs from the schema
The schema contains many tables for future features (subscriptions, chat, moderation...) that the application does not use yet. The few additions made for the application are tagged `[APP]` in `efrecipe_schema.sql`:

| Addition | Purpose |
| --- | --- |
| `Recipes.images` | all the pictures of a recipe (JSON). `Recipes.imageUrl` stays the cover and always equals the first picture. |
| `Recipes.shared` | `FALSE` = private recipe (*My Creations*). Default `TRUE`, so recipes inserted by hand are public. |
| `Recipes.sharedAt` | date and time of the sharing (falls back to `createdAt` when empty). |
| `Favorites` table | favorites per user. `RecipeLikes` holds the starting community favorites; the application shows `RecipeLikes.likes` + the number of rows in `Favorites`. |

Data conventions read by the backend:
- `Recipes.ingredients`: one line per ingredient (`150 g sugar`, `6 apples`, `Black pepper (to taste)`). Units: `g`, `ml`, `tbsp`, `tsp`. The backend turns these lines into `{ name, quantity, unit }` objects for the pantry (`backend/utils/ingredients.js`).
- `Recipes.category`: `Entrée`, `Plat`, `Dessert` or `Rapide`, displayed as Starter / Main / Dessert / Quick.

### 3. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file inside `backend/`:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=projet_web
JWT_SECRET=your_super_secret_jwt_key
```
Start the server (`http://localhost:3000`):
```bash
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application is available at `http://localhost:5173`.

---

## 🗄️ Database (`database/`) – tables used by the application

| Table | Content |
| --- | --- |
| `Users` | username, email, bcrypt password |
| `Recipes` | title, `ingredients` (one line per ingredient), `instructions` (one step per line), `prepTime`, `category`, `imageUrl` + `images` (links or `/img/...` paths), `shared`, `sharedAt`, `videoUrl` (video link), `isVideoPremium` / `videoUnlockPrice` (paywall, future), `userId` |
| `Reviews` | rating (1–5), comment, `recipeId`, `userId` |
| `RecipeLikes` | starting community favorites per recipe |
| `Favorites` | one row per (user, recipe) |
| other tables | subscriptions, payments, follows, chat, reports... (future features, not used yet) |

---

## ⚙️ Backend Architecture (`backend/`)

* **`server.js`** – Entry point: Express, CORS, JSON parsing, API routes, static `/img` folder, `sequelize.sync()`.
* **`config/database.js`** – Sequelize connection from environment variables.
* **`models/`** – `User`, `Recipe`, `Review`, `Favorite`, `RecipeLike` schemas; `index.js` declares the relationships. `Recipe` exposes `ingredients` and `images` as JavaScript arrays and translates `category` between the database (French) and the API (English).
* **`middleware/`** – `AuthMiddleware.js` (JWT required) and `optionalAuth.js` (identifies the user when a token is present, never blocks). Both go through `authUser.js`, which checks in the database that the account of the token still exists: after re-importing the database, an old token is refused (`401`, "Your account no longer exists") and the site logs the user out, instead of failing with a foreign key error.
* **`controllers/`** – `authController.js` (register, login by username **or** email) and `recipeController.js` (validation, visibility rules, CRUD, sharing, reviews, favorites).
* **`utils/ingredients.js`** – converts the ingredient text lines of the database to objects and back.
* **`routes/`** – `authRoutes.js`, `recipeRoutes.js`, `uploadRoutes.js` (JPEG upload into `backend/img`).

Visibility rule: a visitor only receives **shared** recipes; a logged-in user also receives **their own private** recipes.
A **premium** video (`isVideoPremium`) is never sent to other users: they only get `hasVideo: true`, the link is returned to the author only.

---

## 🎨 Frontend Architecture (`frontend/src/`)

* **`App.vue`** – Layout (navbar, page, footer) and the windows opened from anywhere (auth, recipe form).
* **`views/HomeView.vue`** – The single page behind the three tabs (`/`, `/my-creations`, `/favorites`): hero search, filters, sorting, pantry toggle, recipe grid, recipe window.
* **`components/`** – `Navbar`, `RecipeCard`, `RecipeCarousel`, `RecipeModal` (detail window), `RecipeFormModal` (create / edit), `AuthModal` (log in / sign up), `PantryPanel`.
* **`composables/`** – shared state: `useAuth` (session), `useUI` (open windows), `useRecipes` (recipes, favorites, reviews, CRUD), `usePantry` (pantry logic), `useImages` (carousel).
* **`utils/`** – `api.js` (fetch wrapper with JWT) and `recipes.js` (constants, formatting, image resizing).
* **`assets/main.css`** – Tailwind + the Ef'Recipe design system (buttons, pills, fields, cards, carousel…).

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new account | Public |
| `POST` | `/api/auth/login` | Log in with `identifier` (username or email) + `password`, returns a JWT | Public |
| `GET` | `/api/recipes` | Shared recipes (+ your private ones when logged in), with author, reviews, favorites | Public / JWT |
| `POST` | `/api/recipes` | Create a recipe (private by default) | JWT |
| `PUT` | `/api/recipes/:id` | Update a recipe | Author only |
| `PATCH` | `/api/recipes/:id/share` | Share with the community / make private | Author only |
| `DELETE` | `/api/recipes/:id` | Delete a recipe | Author only |
| `POST` | `/api/recipes/:id/reviews` | Post a review | JWT |
| `POST` | `/api/recipes/:id/favorite` | Toggle a favorite | JWT |
| `POST` | `/api/upload` | Upload a JPEG image, returns its `/img/...` path | JWT |

---

## 👥 Authors

* **Project Framework:** Web Programming Project – EFREI
