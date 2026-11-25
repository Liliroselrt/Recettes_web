# 🍳 Ef'Recipe – Community Cookbook

**Ef'Recipe** is a full-stack web application where cooking enthusiasts explore, share, rate and manage recipes. Beyond the classic recipe book, it includes a **pantry** ("What can I cook with what I have?") that tells you which recipes you can make with the ingredients you own.

**Stack:** Vue 3 + Vite + Tailwind CSS 4 (frontend) · Express + Sequelize (backend) · MySQL 8 (database)

> 💡 **How to read this page:** every grey box is something to **type or paste**.
> 💻 = a terminal command · 📄 = the content of a file

---

## ✨ Features

- **Three tabs**: *Home* (shared recipes), *My Creations* (your recipes, private until you share them) and *Favorites*.
- **Search & filters**: search by dish or ingredient, category pills (Starter / Main / Dessert / Quick), and 6 sort orders (Most recent, Trending, Top rated, Most reviewed, Quickest, Best pantry match).
- **My Pantry**: tick the ingredients you have (with quantities). Basics (water, salt, pepper, oils) are assumed available. Cards show *"You have everything"* or what is missing, and *"Only recipes I can make"* filters the list. In a recipe window, each ingredient is marked ✓ / missing / not enough and can be added to the pantry in one click.
- **Recipe window** with previous / next navigation (buttons or ← → keys), image carousel (up to 6 pictures), numbered steps, ratings, reviews and PDF export.
- **Create / edit recipes** with structured ingredients (name, quantity, unit), several images (a link, or a file imported from your computer and saved in `backend/img`) and an optional video link (shown as a *Watch the video* button).
- **Share / unshare**: sharing records the exact date and time.
- **Favorites and reviews** saved in MySQL. Visitors can read everything; an account is needed to favorite, review, create and share.

> The pantry is personal to the browser (`localStorage`); everything else is stored in MySQL.

---

## 🚀 Start the project (every time)

**Step 0.** Make sure MySQL is running (it normally starts with Windows).

**Step 1.** In VS Code open a terminal (**Terminal → New Terminal**) and type:

> 💻 **TERMINAL 1 — Backend**
> ```bash
> cd backend
> npm install
> npm run dev
> ```
> ✅ You must see: `Base de données MySQL connectée…` and `Serveur démarré sur http://localhost:3000`

**Step 2.** Open a **second** terminal with the **+** button of the terminal panel and type:

> 💻 **TERMINAL 2 — Frontend**
> ```bash
> cd frontend
> npm install
> npm run dev
> ```
> ✅ You must see: `Local: http://localhost:5173/`

**Step 3.** Open **http://localhost:5173** in your browser and log in with `Chef_Lucas` / `Password123!`

To stop a server: click in its terminal and press `Ctrl + C`.

To build the frontend for production (type-check, compile and minify): `npm run build` in `frontend`.

---

## 🛠️ First-time setup only

### A. Requirements
- **Node.js 22.18 or higher** (check with `node -v`) and **npm**
- **MySQL Server 8** and **MySQL Workbench**

### B. Create the `.env` file
Right-click the **`backend`** folder → **New File** → name it exactly `.env`, then paste:

> 📄 **`backend/.env`**
> ```env
> DB_HOST=localhost
> DB_USER=root
> DB_PASSWORD=YOUR_MYSQL_PASSWORD
> DB_NAME=projet_web
> JWT_SECRET=efrecipe_secret_key_2026
> PORT=3000
> ```

Only replace **`YOUR_MYSQL_PASSWORD`** with your own MySQL password (no quotes, no spaces). Leave the other lines as they are.
After changing `.env`, restart the backend: `Ctrl + C` in Terminal 1, then `npm run dev`.

### C. Create the database
The database is defined by two scripts in `database/`, to run **in this order**. In **MySQL Workbench**, connect to your server, then:

1. **File → Open SQL Script…** → choose `database/efrecipe_schema.sql` → click the ⚡ button. *(drops and recreates `projet_web`, creates the tables)*
2. **File → Open SQL Script…** → choose `database/efrecipe_data.sql` → click the ⚡ button. *(inserts the sample data)*

Done: the database `projet_web` now contains the sample data: 26 recipes, 30 reviews, 10 accounts (8 users, 1 admin, 1 moderator) plus the data of the other tables (subscriptions, chat, reports...).

Log in with a username (e.g. `Chef_Lucas`) or an email (e.g. `chef_lucas@example.com`). **All demo accounts use the password `Password123!`.**

> ⚠️ Step 1 **erases the whole database**, including the recipes and accounts created on the website. To keep them, do the *Save your data* section below **first**.

<details>
<summary>Same thing from the terminal instead of Workbench</summary>

> 💻 **TERMINAL**
> ```bash
> mysql -u root -p --default-character-set=utf8mb4 -e "source database/efrecipe_schema.sql"
> mysql -u root -p --default-character-set=utf8mb4 -e "source database/efrecipe_data.sql"
> ```

Type your MySQL password each time. (Do not use `mysql ... < file.sql` in PowerShell: it does not work there.)
</details>

---

## 💾 Save your data (export)

Use this to turn what is currently in your database (new recipes, accounts, reviews...) into the new `database/efrecipe_data.sql`.

**Step 1 — Export from MySQL Workbench**
1. Menu **Server → Data Export**.
2. Tick the schema **`projet_web`**.
3. In the dropdown under the table list, choose **Dump Data Only**.
4. Choose **Export to Self-Contained File** and set the file to `database/efrecipe_data_raw.sql`.
5. Click **Start Export**.

**Step 2 — Clean the dump.** Open `efrecipe_data_raw.sql` in VS Code and apply these rules to turn it into a clean `efrecipe_data.sql`:

1. Add `SET FOREIGN_KEY_CHECKS = 0;` as the very first line and `SET FOREIGN_KEY_CHECKS = 1;` as the very last line.
2. Delete everything that is not an `INSERT` (comments, `LOCK TABLES`, `UNLOCK TABLES`, `/*!40000 ... */` lines, etc.).
3. Keep every `INSERT INTO` and all its values exactly as they are (accents, `\n`, `NULL`, dates, password hashes).
4. Make sure the table names have the exact same upper/lower case as in `efrecipe_schema.sql` (e.g. `Recipes`, not `recipes`).

**Step 3 — Replace the file.** Save the cleaned content as `database/efrecipe_data.sql` (replace everything), then delete `efrecipe_data_raw.sql`.

**Step 4 — Test it.** Run the two SQL files again (section *Create the database*) and check that your recipes are there.

> Why rules 1 and 4? Without `SET FOREIGN_KEY_CHECKS = 0` the import fails (tables are exported in alphabetical order), and lower-case table names break the import on Mac/Linux.
> 🔒 The file contains the emails and password hashes of all accounts: don't publish it with real users.

---

## 🩺 If something goes wrong

| What you see | What to do |
| --- | --- |
| `Access denied for user` in Terminal 1 | Wrong `DB_USER` / `DB_PASSWORD` in `backend/.env`. Fix it and restart the backend. |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running. Start it (Windows: *Services* → `MySQL80` → Start). |
| `Unknown database` / `Unknown column` / `Table doesn't exist` | The database is out of date: run the two SQL files again. |
| The site says *Cannot reach the server* | The backend is not running: check Terminal 1. |
| `EADDRINUSE: address already in use` | The server is already running in another terminal: close it (`Ctrl + C`) and start again. |
| `cd frontend` says the path does not exist | Your terminal is already inside `backend`: type `cd ../frontend`. |
| *Your account no longer exists* | You re-imported the database while logged in: log in again. |
| Frontend does not start (Node error) | Install Node 22.18+ (`node -v`). |
| Accents look broken (`EntrÃ©e`) | Use Workbench to import, or add `--default-character-set=utf8mb4` in the terminal command. |

---

## 📚 For developers

<details>
<summary><b>Database tables</b></summary>

| Table | Content |
| --- | --- |
| `Users` | username, email, bcrypt password, role, profile |
| `Recipes` | title, `ingredients` (one line per ingredient), `instructions` (one step per line), `prepTime`, `category`, `imageUrl` + `images` (links or `/img/...` paths), `shared`, `sharedAt`, `videoUrl`, `isVideoPremium` / `videoUnlockPrice` (paywall, future), `userId` |
| `Reviews` | rating (1–5), comment, `recipeId`, `userId` |
| `RecipeLikes` | starting community favorites per recipe |
| `Favorites` | one row per (user, recipe) |
| other tables | subscriptions, payments, follows, chat, reports... (future features, not used yet) |

The few additions made for the application are tagged `[APP]` in `efrecipe_schema.sql`:

| Addition | Purpose |
| --- | --- |
| `Recipes.images` | all the pictures of a recipe (JSON). `Recipes.imageUrl` stays the cover and always equals the first picture. |
| `Recipes.shared` | `FALSE` = private recipe (*My Creations*). Default `TRUE`, so recipes inserted by hand are public. |
| `Recipes.sharedAt` | date and time of the sharing (falls back to `createdAt` when empty). |
| `Favorites` table | favorites per user. The application shows `RecipeLikes.likes` + the number of rows in `Favorites`. |

Data conventions read by the backend:
- `Recipes.ingredients`: one line per ingredient (`150 g sugar`, `6 apples`, `Black pepper (to taste)`). Units: `g`, `ml`, `tbsp`, `tsp`. The backend turns these lines into `{ name, quantity, unit }` objects for the pantry (`backend/utils/ingredients.js`).
- `Recipes.category`: `Entrée`, `Plat`, `Dessert` or `Rapide`, displayed as Starter / Main / Dessert / Quick.
</details>

<details>
<summary><b>Backend structure (<code>backend/</code>)</b></summary>

- **`server.js`**: entry point (Express, CORS, JSON parsing, API routes, static `/img` folder, `sequelize.sync()`).
- **`config/database.js`**: Sequelize connection from environment variables.
- **`models/`**: `User`, `Recipe`, `Review`, `Favorite`, `RecipeLike`; `index.js` declares the relationships. `Recipe` exposes `ingredients` and `images` as JavaScript arrays and translates `category` between the database (French) and the API (English).
- **`middleware/`**: `AuthMiddleware.js` (JWT required) and `optionalAuth.js` (identifies the user when a token is present, never blocks). Both go through `authUser.js`, which checks in the database that the account of the token still exists: after re-importing the database, an old token is refused (`401`, "Your account no longer exists") and the site logs the user out.
- **`controllers/`**: `authController.js` (register, login by username **or** email) and `recipeController.js` (validation, visibility rules, CRUD, sharing, reviews, favorites).
- **`routes/`**: `authRoutes.js`, `recipeRoutes.js`, `uploadRoutes.js` (JPEG upload into `backend/img`).
- **`utils/ingredients.js`**: converts the ingredient text lines of the database to objects and back.

**Visibility rule:** a visitor only receives **shared** recipes; a logged-in user also receives **their own private** recipes. A **premium** video (`isVideoPremium`) is never sent to other users: they only get `hasVideo: true`, the link is returned to the author only.

**Security:** password hashing with `bcrypt`, stateless authentication via `JWT`, server-side ownership checks, whitelisted input fields, JPEG signature check on uploads.
</details>

<details>
<summary><b>Frontend structure (<code>frontend/src/</code>)</b></summary>

- **`App.vue`**: layout (navbar, page, footer) and the windows opened from anywhere (auth, recipe form).
- **`views/HomeView.vue`**: the single page behind the three tabs (`/`, `/my-creations`, `/favorites`): hero search, filters, sorting, pantry toggle, recipe grid, recipe window.
- **`components/`**: `Navbar`, `RecipeCard`, `RecipeCarousel`, `RecipeModal` (detail window), `RecipeFormModal` (create / edit), `AuthModal` (log in / sign up), `PantryPanel`.
- **`composables/`**: shared state: `useAuth` (session), `useUI` (open windows), `useRecipes` (recipes, favorites, reviews, CRUD), `usePantry` (pantry logic), `useImages` (carousel).
- **`utils/`**: `api.js` (fetch wrapper with JWT) and `recipes.js` (constants, formatting, image resizing).
- **`assets/main.css`**: Tailwind + the Ef'Recipe design system (buttons, pills, fields, cards, carousel...).

Backend address used by the frontend: `API_ORIGIN` in `frontend/src/utils/recipes.js` (change it if you change `PORT`).
</details>

<details>
<summary><b>API endpoints</b></summary>

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account | Public |
| `POST` | `/api/auth/login` | Log in (`identifier` = username or email, `password`) → JWT | Public |
| `GET` | `/api/recipes` | Shared recipes (+ your private ones when logged in), with author, reviews, favorites | Public / JWT |
| `POST` | `/api/recipes` | Create a recipe (private by default) | JWT |
| `PUT` | `/api/recipes/:id` | Update a recipe | Author only |
| `PATCH` | `/api/recipes/:id/share` | Share with the community / make private | Author only |
| `DELETE` | `/api/recipes/:id` | Delete a recipe | Author only |
| `POST` | `/api/recipes/:id/reviews` | Post a review | JWT |
| `POST` | `/api/recipes/:id/favorite` | Toggle a favorite | JWT |
| `POST` | `/api/upload` | Upload a JPEG image, returns its `/img/...` path | JWT |
</details>

<details>
<summary><b>When you change the database or add a feature (checklist)</b></summary>

1. Edit `database/efrecipe_schema.sql` (the single source of truth for the structure).
2. Create / update the model in `backend/models/` and its relations in `backend/models/index.js`.
3. Update the controller / routes, then the frontend.
4. Update `database/efrecipe_data.sql` so the new data has samples.
5. Test from zero: run the two SQL files, start both servers, try the feature. Run `npm run build` in `frontend`.
6. Update this README and tell the team to re-run the two SQL files.

⚠️ Never put `{ alter: true }` back in `sequelize.sync()` (`backend/server.js`): `sync()` only creates missing tables, and with `alter` Windows adds a foreign key at every start and ends with *"Duplicate foreign key constraint name"*.
</details>

<details>
<summary><b>Git: what to commit, what to do after a pull</b></summary>

- **Never commit:** `backend/.env`, `node_modules/`, `backend/img/*`, `dist/`, `efrecipe_data_raw.sql`.
- After `git pull`: if `package.json` changed → `npm install` in that folder. If `database/*.sql` changed → run the two SQL files again (⚠️ erases local data).
</details>

<details>
<summary><b>Uploaded images</b></summary>

A picture imported from your computer is saved in `backend/img/` and only its path is stored in the database. These files are **not** in Git nor in the SQL files: on another computer the recipe shows the default picture until the file is copied there. For recipes that must travel with the project, use image **links** (e.g. `https://images.unsplash.com/...`).
</details>

---

## 👥 Authors
Raphaël Perricaud - Cyprien Donné - Lily-rose Lauret


**Project framework:** Web Programming Project – EFREI
