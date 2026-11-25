# 🍳 Ef'Recipe – Community Cookbook

A recipe-sharing website: browse, rate, favorite and share recipes, and use **My Pantry** to see which recipes you can cook with the ingredients you have.

**Stack:** Vue 3 + Vite (frontend) · Express + Sequelize (backend) · MySQL 8 (database)

> 💡 **How to read this page:** every grey box is something to **type or paste**.
> 💻 = a terminal command · 📄 = the content of a file · 🤖 = a message for an AI

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
> npm install jspdf
> npm run dev
> ```
> ✅ You must see: `Local: http://localhost:5173/`

**Step 3.** Open **http://localhost:5173** in your browser and log in with `Chef_Lucas` / `Password123!`

To stop a server: click in its terminal and press `Ctrl + C`.

---

## 🛠️ First-time setup only

### A. Requirements
- **Node.js 22.18 or higher** (check with `node -v`)
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
In **MySQL Workbench**, connect to your server, then:

1. **File → Open SQL Script…** → choose `database/efrecipe_schema.sql` → click the ⚡ button.
2. **File → Open SQL Script…** → choose `database/efrecipe_data.sql` → click the ⚡ button.

Always in this order (1 then 2). Done: the database `projet_web` now contains the sample recipes and accounts.

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

**Step 2 — Clean it with an AI.** Open an AI chat, attach `efrecipe_data_raw.sql` **and** `efrecipe_schema.sql`, and send:

> 🤖 **MESSAGE FOR THE AI**
> ```text
> Here is a raw MySQL Workbench "Dump Data Only" file of my database `projet_web`,
> 2. Delete everything that is not an INSERT
> 3. Keep every INSERT INTO and all its values exactly as they are
>    (accents, \n, NULL, dates, password hashes).
> > Turn the dump into a clean file named `efrecipe_data.sql`
> ```

**Step 3 — Replace the file.** Paste the AI's answer into `database/efrecipe_data.sql` (replace everything), then delete `efrecipe_data_raw.sql`.

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
<summary><b>Features</b></summary>

- **3 tabs:** Home (shared recipes), My Creations (private until shared), Favorites.
- **Search & filters** by dish or ingredient, category pills, 6 sort orders.
- **My Pantry:** tick what you have; cards show *"You have everything"* or what is missing; *"Only recipes I can make"* filter.
- **Recipe window** with previous/next (← →), image carousel (6 max), steps, ratings, reviews, video link.
- **Create / edit** with structured ingredients, images (link or import), optional video link; **share / unshare**.
- Favorites and reviews are stored in MySQL (an account is required). The pantry stays in the browser (`localStorage`).
</details>

<details>
<summary><b>Database tables</b></summary>

| Table | Content |
| --- | --- |
| `Users` | username, email, bcrypt password, role, profile |
| `Recipes` | title, `ingredients` (one line each: `150 g sugar`), `instructions` (one step per line), `prepTime`, `category`, `imageUrl` + `images`, `shared`, `sharedAt`, `videoUrl`, `isVideoPremium`, `userId` |
| `Reviews` | rating 1–5, comment, `recipeId`, `userId` |
| `RecipeLikes` | starting community favorites per recipe |
| `Favorites` | one row per (user, recipe) |
| other tables | subscriptions, payments, chat, reports... (future features, not used yet) |

Additions made for the app are tagged `[APP]` in `efrecipe_schema.sql`: `Recipes.images`, `Recipes.shared`, `Recipes.sharedAt` and the `Favorites` table.
Categories are `Entrée` / `Plat` / `Dessert` / `Rapide` in the database, shown as Starter / Main / Dessert / Quick.
</details>

<details>
<summary><b>When you change the database or add a feature (checklist)</b></summary>

1. Edit `database/efrecipe_schema.sql` (the single source of truth for the structure).
2. Create / update the model in `backend/models/` and its relations in `backend/models/index.js`.
3. Update the controller / routes, then the frontend.
4. Update `database/efrecipe_data.sql` so the new data has samples.
5. Test from zero: run the two SQL files, start both servers, try the feature. Run `npm run build` in `frontend`.
6. Update this README and tell the team to re-run the two SQL files.

⚠️ Never put `{ alter: true }` back in `sequelize.sync()` (backend/server.js): on Windows it ends with *"Duplicate foreign key constraint name"*.
</details>

<details>
<summary><b>Git: what to commit, what to do after a pull</b></summary>

- **Never commit:** `backend/.env`, `node_modules/`, `backend/img/*`, `dist/`, `efrecipe_data_raw.sql`.
- After `git pull`: if `package.json` changed → `npm install` in that folder (it is already in your routine). If `database/*.sql` changed → run the two SQL files again (⚠️ erases local data).
</details>

<details>
<summary><b>Uploaded images</b></summary>

A picture imported from your computer is saved in `backend/img/` and only its path is stored in the database. These files are **not** in Git nor in the SQL files: on another computer the recipe shows the default picture until the file is copied there. For recipes that must travel with the project, use image **links** (e.g. `https://images.unsplash.com/...`).
</details>

<details>
<summary><b>Backend / frontend structure</b></summary>

**Backend (`backend/`)** — `server.js` (entry point) · `config/database.js` · `models/` (User, Recipe, Review, Favorite, RecipeLike) · `middleware/` (JWT checks, verifies the account still exists) · `controllers/` · `routes/` · `utils/ingredients.js` · `img/` (uploads).

**Frontend (`frontend/src/`)** — `App.vue` · `views/HomeView.vue` (the page behind the 3 tabs) · `components/` (Navbar, RecipeCard, RecipeModal, RecipeFormModal, AuthModal, PantryPanel, RecipeCarousel) · `composables/` (useAuth, useUI, useRecipes, usePantry, useImages) · `utils/` (api.js, recipes.js) · `assets/main.css`.

Backend address used by the frontend: `API_ORIGIN` in `frontend/src/utils/recipes.js` (change it if you change `PORT`).
</details>

<details>
<summary><b>API endpoints</b></summary>

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account | Public |
| `POST` | `/api/auth/login` | Log in (`identifier` = username or email, `password`) → JWT | Public |
| `GET` | `/api/recipes` | Shared recipes (+ yours when logged in) | Public / JWT |
| `POST` | `/api/recipes` | Create a recipe (private by default) | JWT |
| `PUT` | `/api/recipes/:id` | Update a recipe | Author |
| `PATCH` | `/api/recipes/:id/share` | Share / make private | Author |
| `DELETE` | `/api/recipes/:id` | Delete a recipe | Author |
| `POST` | `/api/recipes/:id/reviews` | Post a review | JWT |
| `POST` | `/api/recipes/:id/favorite` | Toggle a favorite | JWT |
| `POST` | `/api/upload` | Upload a JPEG → `/img/...` path | JWT |

A premium video link (`isVideoPremium`) is only returned to the recipe's author.
</details>

---

👥 **Project:** Web Programming – EFREI
