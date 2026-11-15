```markdown
# 🍳 Marmit'Code – Community Recipe Book

**Marmit'Code** is a full-stack web application that allows cooking enthusiasts to explore, share, and manage their own recipes. Users can create an account, publish their culinary creations, filter community recipes by category, and manage their personal recipe book through secure CRUD operations.

---

## 🛠️ Tech Stack

- **Frontend:** Vue.js 3 (Composition API), Vue Router, CSS3
- **Backend:** Node.js, Express.js, Sequelize (ORM)
- **Database:** MySQL
- **Security & Authentication:** Password hashing with `bcrypt`, stateless authentication via `JWT` (JSON Web Tokens), and server-side ownership verification.

---

## 🚀 Prerequisites & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **MySQL Server** (e.g., via MySQL Workbench)

### 2. Database Setup
Open MySQL Workbench (or your MySQL CLI) and create the empty database schema:
```sql
CREATE DATABASE projet_web;

```

*(Note: Sequelize will automatically create and synchronize the `Users` and `Recipes` tables when the backend server starts.)*

### 3. Backend Setup

1. Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install

```


2. Create a `.env` file inside the `backend/` folder and configure your environment variables:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=projet_web
JWT_SECRET=your_super_secret_jwt_key

```


3. Start the backend server:
```bash
npm run dev

```


The API will be running on `http://localhost:3000`.

### 4. Frontend Setup

1. Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install

```


2. Start the Vue development server:
```bash
npm run dev

```


The application will be accessible at `http://localhost:5173`.

---

## ⚙️ Backend Architecture (`backend/`)

* **`server.js`** – **Entry Point:** Configures Express, CORS, JSON parsing, API routes, and synchronizes Sequelize models with MySQL.
* **`config/database.js`** – **Database Connection:** Initializes the Sequelize instance using environment variables.
* **`models/User.js` & `models/Recipe.js**` – **Data Models:** Defines the `Users` and `Recipes` schemas, password-hashing hooks (`beforeCreate`), and the `1-to-Many` relationship (`User` has many `Recipes`).
* **`middleware/authMiddleware.js`** – **JWT Guard:** Intercepts protected requests, verifies the `Bearer` token, and attaches the authenticated user's ID to the request.
* **`controllers/`** – **Business Logic:**
* `authController.js`: Handles user registration (`register`) and login with JWT generation (`login`).
* `recipeController.js`: Handles full CRUD operations (`createRecipe`, `getAllRecipes`, `updateRecipe`, `deleteRecipe`) with strict server-side ownership checks (`recipe.userId === req.user.id`).


* **`routes/`** – **API Endpoints:** Maps HTTP requests (`authRoutes.js` and `recipeRoutes.js`) to their respective controllers.

---

## 🎨 Frontend Architecture (`frontend/`)

### Root & Components (`src/` & `src/components/`)

* **`App.vue`** – **Global Layout:** Displays the navigation bar at the top and renders the active page content below it.
* **`Navbar.vue`** – **Navigation Bar:** Manages navigation links between the home page, personal dashboard, and login/logout actions.
* **`RecipeCard.vue`** – **Recipe Preview Card:** Displays a recipe summary, its category, preparation time, a favorite toggle button, and a link to view full details.
* **`RecipeForm.vue`** – **Create & Edit Form:** Handles both recipe creation (**Create**) and editing (**Update**) depending on whether existing recipe data is passed to it.
* **`CommentSection.vue`** – **Ratings & Comments:** Allows users to rate and leave comments on a recipe.

### Views (`src/views/`)

* **`HomeView.vue`** – **Home & Explore Page:** Displays all community recipes with quick filtering options (by category or favorites).
* **`DashboardView.vue`** – **Personal Recipe Book (Full CRUD):** Allows users to manage their own recipes: create a new one, edit an existing one, or delete one.
* **`RecipeDetailView.vue`** – **Recipe Details & Reviews:** Displays the full recipe (ingredients and instructions) along with its comment section when clicking "View Recipe" from the home page.
* **`LoginView.vue`** – **User Login:** Authentication form that stores the user's JWT token to secure CRUD operations.
* **`RegisterView.vue`** – **User Registration:** Sign-up form allowing new users to create an account.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user and return a JWT token | Public |
| `GET` | `/api/recipes` | Retrieve all recipes along with author details | Public |
| `POST` | `/api/recipes` | Create a new recipe | Authenticated (JWT) |
| `PUT` | `/api/recipes/:id` | Update an existing recipe | Author only |
| `DELETE` | `/api/recipes/:id` | Delete a recipe | Author only |

---

## 👥 Authors

* **Project Framework:** Web Programming Project – EFREI

```

```