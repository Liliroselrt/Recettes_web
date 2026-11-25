-- ==========================================================================
-- Ef'Recipe - Carnet de recettes communautaire
-- Script MySQL (2/2) : DONNÉES DE DÉPART (Seed Data)
--
-- Prérequis   : avoir exécuté `efrecipe_schema.sql` au préalable.
-- Utilisation : mysql -u root -p < database/efrecipe_data.sql
--
-- Source des données : recipes-data.js (26 recettes, 30 avis, 10 comptes de démo),
-- mises à jour à partir du dump du 2026-11-19 (ajout des comptes Recipe_web et Cyp).
-- Comptes de démonstration (ids 1 à 10) : mot de passe identique = Password123!
-- Comptes ajoutés (ids 11 et 12) : mots de passe propres à chaque compte (hash du dump).
-- Rôles : Recipe_web = admin, Cyp = moderator, tous les autres = user.
-- ==========================================================================

USE `projet_web`;

-- --------------------------------------------------------------------------
-- 1. Utilisateurs & Staff (Recipe_web = admin, Cyp = modérateur, les autres = user)
-- --------------------------------------------------------------------------

INSERT INTO `Users` (`id`, `username`, `email`, `password`, `role`, `bio`, `avatarUrl`, `location`, `specialty`, `websiteUrl`, `isBanned`, `bannedReason`, `createdAt`, `updatedAt`) VALUES
  (1, 'Chef_Lucas', 'chef_lucas@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'French pastry & bistro classics enthusiast. Sharing step-by-step video masterclasses.', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80', 'Lyon, France', 'French Pastry & Bistro', 'https://cheflucas.example.com', FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (2, 'Marco_Pasta', 'marco_pasta@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Born in Bologna. No cream in carbonara, ever!', 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=400&q=80', 'Bologna, Italy', 'Handmade Pasta & Risotto', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (3, 'Awa_Cuisine', 'awa_cuisine@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'West African spices and comforting family dishes.', 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=400&q=80', 'Dakar, Senegal', 'West African & Fusion', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (4, 'Tom_Grill', 'tom_grill@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Quick weeknight meals, burgers and backyard BBQ.', NULL, 'Austin, USA', 'Grill & Comfort Food', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (5, 'Pierre_Cuisine', 'pierre_cuisine@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Traditional Mediterranean and Provençal home cooking.', NULL, 'Marseille, France', 'Provençal & Seafood', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (6, 'Julie_Bakes', 'julie_bakes@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Sweet treats, Sunday brunch pancakes and chocolate.', NULL, 'Paris, France', 'Baking & Desserts', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (7, 'Nina_Veggie', 'nina_veggie@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Colorful, fresh and plant-forward recipes in under 20 minutes.', NULL, 'Montreal, Canada', 'Vegetarian & Fresh', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (8, 'Sophie', 'sophie@example.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Home cook testing recipes from around the world.', NULL, 'Brussels, Belgium', 'Home Cooking', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (9, 'Admin_Gourmet', 'admin@efrecipe.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Ef''Recipe Platform Administrator.', NULL, 'Paris, France', 'Platform Administration', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (10, 'Mod_Claire', 'mod.claire@efrecipe.com', '$2b$10$J1CSCmM9W0QfmHw4uVYaKes2JcdR0FPslj2p5r.ohLGkniTWkI5zK', 'user', 'Community Moderator — here to keep Ef''Recipe friendly and helpful!', NULL, 'Nantes, France', 'Community Moderation', NULL, FALSE, NULL, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (11, 'Recipe_web', 'Recipe@web.com', '$2b$10$5E.akxBhAcHAACsaTsYVueiJt/Cw.lbQe60zTFNsKryQ0JJBapd/e', 'admin', NULL, NULL, NULL, NULL, NULL, FALSE, NULL, '2026-11-19 13:23:46', '2026-11-19 13:23:46'),
  (12, 'Cyp', 'cyprien.donne@efrei.net', '$2b$10$EvbYAIXN1kTNeBC0CG0pTuy/R2O5iG3ChF3Cow2gB57HXGPpZoVni', 'moderator', NULL, NULL, NULL, NULL, NULL, FALSE, NULL, '2026-11-19 13:26:12', '2026-11-19 13:26:12');

-- --------------------------------------------------------------------------
-- 2. Recettes (avec liens images & vidéos YouTube)
-- --------------------------------------------------------------------------
INSERT INTO `Recipes` (`id`, `title`, `ingredients`, `instructions`, `prepTime`, `category`, `imageUrl`, `videoUrl`, `isVideoPremium`, `videoUnlockPrice`, `createdAt`, `updatedAt`, `userId`) VALUES
  (1, 'Traditional Tarte Tatin', '6 apples\n150 g sugar\n80 g butter\n1 puff pastry sheet', 'Peel the golden apples and cut them into large wedges.\nMake an amber caramel in a tatin pan with the butter and sugar.\nArrange the apples neatly on top of the caramel.\nCover with the puff pastry and tuck in the edges.\nBake for 35 minutes at 180°C (350°F), then unmold while still warm.', 45, 'Dessert', 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=800&q=80', 'https://www.youtube.com/watch?v=Al7W2wpNyb4&pp=ygUXVHJhZGl0aW9uYWwgVGFydGUgVGF0aW4%3D', TRUE, 2.99, '2026-10-05 09:14:00', '2026-10-05 09:14:00', 1),
  (2, 'Authentic Pasta Carbonara', '400 g spaghetti\n150 g guanciale\n4 egg yolks\n100 g pecorino romano\nBlack pepper (to taste)', 'Fry the guanciale until crisp.\nCook the pasta al dente.\nMix the egg yolks with the pecorino and plenty of black pepper.\nToss the pasta off the heat with the guanciale fat and the egg sauce, adding a ladle of pasta water.', 15, 'Plat', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80', 'https://www.youtube.com/watch?v=3AAdKl1UYZs&pp=ygUZQXV0aGVudGljIFBhc3RhIENhcmJvbmFyYQ%3D%3D', TRUE, 2.49, '2026-10-19 17:32:00', '2026-10-19 17:32:00', 2),
  (3, 'Senegalese Chicken Yassa', '1 whole chicken\n6 onions\n4 limes\n3 garlic cloves\n2 tbsp dijon mustard\n1 chili pepper\n300 g white rice', 'Cut the chicken into pieces.\nMarinate the chicken and the sliced onions in the lime juice, mustard, garlic and chili for 2 hours.\nGrill the chicken in the oven or on the barbecue.\nSlowly cook the onions in a pan, then add the chicken back in.\nServe piping hot with white rice.', 60, 'Plat', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80', 'https://www.youtube.com/watch?v=yT1mdPyiqdo&pp=ygUYU2VuZWdhbGVzZSBDaGlja2VuIFlhc3Nh', TRUE, 3.49, '2026-09-28 12:05:00', '2026-09-28 12:05:00', 3),
  (4, 'Grilled Chicken Caesar Salad', '1 romaine lettuce\n2 chicken breasts\n80 g croutons\n50 g parmesan\n4 anchovy fillets\n3 tbsp mayonnaise\n1 lemons', 'Make the dressing: mash the anchovies and mix them with the mayonnaise and the lemon juice.\nGrill the chicken breasts, then slice them.\nWash and chop the lettuce.\nAssemble the salad with the croutons, chicken and shaved parmesan.\nDrizzle generously with the Caesar dressing.', 20, 'Entrée', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80', 'https://www.youtube.com/watch?v=sSxx64Ku-5c&pp=ygUcR3JpbGxlZCBDaGlja2VuIENhZXNhciBTYWxhZA%3D%3D', TRUE, NULL, '2026-10-27 11:20:00', '2026-10-27 11:20:00', 1),
  (5, 'Classic French Omelette', '3 eggs\n15 g butter\nSalt (to taste)\nBlack pepper (to taste)', 'Beat the eggs with a pinch of salt and pepper.\nMelt the butter in a non-stick pan over medium heat.\nPour in the eggs and stir gently while they set.\nFold the omelette in three and slide it onto a plate.', 10, 'Plat', 'https://plus.unsplash.com/premium_photo-1667807521536-bc35c8d8b64b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=_Wb5Crj917I&pp=ygUXQ2xhc3NpYyBGcmVuY2ggT21lbGV0dGU%3D', TRUE, NULL, '2026-11-09 07:45:00', '2026-11-09 07:45:00', 4),
  (6, 'Garlic Butter Shrimp', '300 g shrimp\n40 g butter\n4 garlic cloves\n1 lemons\n10 g fresh parsley\nSalt (to taste)', 'Melt the butter in a large skillet over medium heat.\nAdd the minced garlic and cook for 30 seconds.\nAdd the shrimp and cook 2 to 3 minutes per side until pink.\nSqueeze the lemon over the shrimp and season with salt.\nSprinkle with chopped parsley and serve immediately.', 15, 'Plat', 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?q=80&w=1045&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=JS12i22tk7A&pp=ygUUR2FybGljIEJ1dHRlciBTaHJpbXA%3D', TRUE, NULL, '2026-11-03 19:10:00', '2026-11-03 19:10:00', 5),
  (7, 'Tomato Basil Bruschetta', '1 baguette\n4 tomatoes\n2 garlic cloves\n10 g fresh basil\n3 tbsp olive oil\nSalt (to taste)', 'Dice the tomatoes and mix them with the chopped basil, olive oil and salt.\nSlice the baguette and toast the slices.\nRub each warm slice with a garlic clove.\nTop with the tomato mixture and serve right away.', 15, 'Entrée', 'https://images.unsplash.com/photo-1630230596557-ad07b433f5c0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=Q3xg35pcLyo&t=89s&pp=ygUXVG9tYXRvIEJhc2lsIEJydXNjaGV0dGE%3D', TRUE, NULL, '2026-10-12 13:00:00', '2026-10-12 13:00:00', 2),
  (8, 'French Onion Soup', '6 onions\n50 g butter\n1000 ml beef broth\n4 bread slices\n150 g gruyere\nBlack pepper (to taste)', 'Slice the onions thinly.\nCook them in the butter over low heat for about 40 minutes until deep golden.\nAdd the beef broth and simmer for 15 minutes.\nLadle into oven-safe bowls and top with the bread and grated gruyere.\nGrill until the cheese is bubbling and golden.', 60, 'Entrée', 'https://images.unsplash.com/photo-1549203438-a7696aed4dac?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=cYY6mBu-UQ0&pp=ygURRnJlbmNoIE9uaW9uIFNvdXA%3D', TRUE, 1.99, '2026-10-30 18:25:00', '2026-10-30 18:25:00', 5),
  (9, 'Fluffy Pancakes', '250 g flour\n500 ml milk\n3 eggs\n2 tbsp sugar\n30 g butter\nSalt (to taste)', 'Whisk the flour, sugar and a pinch of salt in a large bowl.\nAdd the eggs, then pour in the milk little by little to get a smooth batter.\nStir in the melted butter and let the batter rest for 10 minutes.\nCook ladles of batter in a hot pan, about 2 minutes per side.', 15, 'Plat', 'https://plus.unsplash.com/premium_photo-1663854478296-dd00b6257021?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=9zCVCL4V8JQ&pp=ygUPRmx1ZmZ5IFBhbmNha2Vz', TRUE, NULL, '2026-11-08 08:30:00', '2026-11-08 08:30:00', 6),
  (10, 'Dark Chocolate Mousse', '200 g dark chocolate\n4 eggs\n30 g sugar\nSalt (to taste)', 'Melt the chocolate in a bain-marie and let it cool slightly.\nSeparate the eggs and stir the yolks into the chocolate.\nWhisk the whites with a pinch of salt into stiff peaks, adding the sugar at the end.\nFold the whites into the chocolate gently, in two batches.\nChill for at least 3 hours before serving.', 30, 'Dessert', 'https://images.unsplash.com/photo-1603032305813-be7441bc1037?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=YO74CgACqEY&pp=ygUVRGFyayBDaG9jb2xhdGUgTW91c3Nl0gcJCcgHAYcqIYzv', TRUE, 2.49, '2026-10-22 20:15:00', '2026-10-22 20:15:00', 6),
  (11, 'Spaghetti Bolognese', '400 g spaghetti\n500 g ground beef\n1 onions\n2 carrots\n2 garlic cloves\n400 g canned tomatoes\n2 tbsp tomato paste\n2 tbsp olive oil\nSalt (to taste)\nBlack pepper (to taste)', 'Finely chop the onion, carrots and garlic.\nSoften them in the olive oil, then add the ground beef and brown it.\nStir in the tomato paste and the canned tomatoes, then season.\nSimmer gently for 1 hour, stirring from time to time.\nCook the spaghetti al dente and serve with the sauce.', 90, 'Plat', 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=v2WqcHH65NQ&pp=ygUTU3BhZ2hldHRpIEJvbG9nbmVzZdIHCQnIBwGHKiGM7w%3D%3D', TRUE, NULL, '2026-10-08 12:40:00', '2026-10-08 12:40:00', 2),
  (12, 'Colorful Vegetable Stir-Fry', '2 bell peppers\n2 carrots\n200 g broccoli\n3 tbsp soy sauce\n2 garlic cloves\n1 tbsp vegetable oil\n200 g white rice', 'Cook the rice according to the package instructions.\nCut the peppers, carrots and broccoli into bite-size pieces.\nHeat the oil in a wok and fry the garlic for 30 seconds.\nAdd the vegetables and stir-fry over high heat for 6 to 8 minutes.\nPour in the soy sauce, toss and serve over the rice.', 18, 'Plat', 'https://plus.unsplash.com/premium_photo-1705609329676-8585fbd02163?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=xgVQ8WHkaR0&pp=ygUbQ29sb3JmdWwgVmVnZXRhYmxlIFN0aXItRnJ5', TRUE, NULL, '2026-11-05 18:50:00', '2026-11-05 18:50:00', 7),
  (13, 'Creamy Chicken Curry', '3 chicken breasts\n1 onions\n3 garlic cloves\n400 ml coconut milk\n2 tbsp curry powder\n200 g canned tomatoes\n1 tbsp vegetable oil\n300 g white rice\nSalt (to taste)', 'Cut the chicken into cubes.\nCook the chopped onion and garlic in the oil until soft.\nAdd the chicken and the curry powder and brown for 5 minutes.\nPour in the tomatoes and the coconut milk and simmer for 25 minutes.\nSeason with salt and serve with the rice.', 45, 'Plat', 'https://plus.unsplash.com/premium_photo-1719908121468-eb177d387b10?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=gXpiGKf7ixA&pp=ygUUQ3JlYW15IENoaWNrZW4gQ3Vycnk%3D', TRUE, NULL, '2026-10-15 19:30:00', '2026-10-15 19:30:00', 3),
  (14, 'Homemade Cheeseburger', '500 g ground beef\n4 burger buns\n4 cheddar slices\n1 tomatoes\n4 lettuce leaves\n1 onions\nSalt (to taste)\nBlack pepper (to taste)', 'Shape the beef into 4 patties and season them with salt and pepper.\nGrill the patties for 3 to 4 minutes per side.\nAdd a slice of cheddar on each patty during the last minute.\nToast the buns and slice the tomato and onion.\nAssemble the burgers with the lettuce, tomato, onion and patty.', 30, 'Plat', 'https://images.unsplash.com/photo-1667329829058-ac191ba4a905?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=BIG1h2vG-Qg&pp=ygUVSG9tZW1hZGUgQ2hlZXNlYnVyZ2Vy', TRUE, NULL, '2026-11-01 12:10:00', '2026-11-01 12:10:00', 4),
  (15, 'Margherita Pizza', '300 g flour\n190 ml water\n7 g dry yeast\nSalt (to taste)\n200 g canned tomatoes\n125 g mozzarella\n10 g fresh basil\n2 tbsp olive oil', 'Mix the flour, yeast, a pinch of salt and the water, then knead for 10 minutes.\nLet the dough rise for 1 hour in a warm place.\nCrush the tomatoes with a little salt and olive oil.\nRoll out the dough, spread the tomato sauce and add the torn mozzarella.\nBake at the highest temperature of your oven for 8 to 10 minutes.\nFinish with fresh basil leaves.', 40, 'Plat', 'https://plus.unsplash.com/premium_photo-1673439304183-8840bd0dc1bf?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=vcfNpDtVqOw&pp=ygUQTWFyZ2hlcml0YSBQaXp6YQ%3D%3D', TRUE, 2.99, '2026-10-25 17:45:00', '2026-10-25 17:45:00', 2),
  (16, 'Provencal Ratatouille', '2 zucchinis\n1 eggplants\n2 bell peppers\n4 tomatoes\n1 onions\n2 garlic cloves\n3 tbsp olive oil\nSalt (to taste)\nBlack pepper (to taste)', 'Dice all the vegetables into similar-sized cubes.\nFry the onion and garlic in the olive oil.\nAdd the eggplant, peppers and zucchini and cook for 10 minutes.\nAdd the tomatoes, season, cover and simmer for 40 minutes.\nServe hot, warm or cold.', 75, 'Plat', 'https://plus.unsplash.com/premium_photo-1713635953474-b74990274152?q=80&w=1184&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=1cHP_-AMquQ&pp=ygUVUHJvdmVuY2FsIFJhdGF0b3VpbGxl', TRUE, NULL, '2026-10-02 14:20:00', '2026-10-02 14:20:00', 5),
  (17, 'Lemon Garlic Roast Potatoes', '800 g potatoes\n3 tbsp olive oil\n4 garlic cloves\n1 lemons\nSalt (to taste)\nBlack pepper (to taste)', 'Preheat the oven to 200°C (400°F).\nCut the potatoes into wedges and toss them with the olive oil, salt and pepper.\nRoast for 35 minutes, turning once.\nAdd the crushed garlic and the lemon juice and roast for 10 more minutes.', 50, 'Plat', 'https://plus.unsplash.com/premium_photo-1695224545124-3ef48642ec92?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=argKpeiKFfo&t=143s&pp=ygUbbGVtb24gZ2FybGljIHJvYXN0IHBvdGF0b2Vz', TRUE, NULL, '2026-11-10 16:05:00', '2026-11-10 16:05:00', 1),
  (18, 'Greek Salad', '4 tomatoes\n1 cucumbers\n1 onions\n150 g feta\n80 g black olives\n3 tbsp olive oil\nSalt (to taste)', 'Cut the tomatoes and the cucumber into chunks and slice the onion.\nCombine them in a bowl with the olives.\nTop with the feta in a large piece or crumbled.\nDrizzle with olive oil and season with salt.', 15, 'Entrée', 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=dDhOpHcAJGo&pp=ygULR3JlZWsgU2FsYWTSBwkJyAcBhyohjO8%3D', TRUE, NULL, '2026-10-17 11:55:00', '2026-10-17 11:55:00', 7),
  (19, 'Fresh Guacamole', '3 avocados\n1 limes\n1 tomatoes\n1 onions\nSalt (to taste)', 'Mash the avocados with a fork, leaving some small chunks.\nFinely dice the onion and the tomato.\nMix everything with the lime juice and salt.\nServe immediately with tortilla chips.', 10, 'Plat', 'https://images.unsplash.com/photo-1680992071073-cb1696ba8d3e?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=tHVzFLtvbGQ&pp=ygUPRnJlc2ggR3VhY2Ftb2xl', TRUE, NULL, '2026-11-07 15:35:00', '2026-11-07 15:35:00', 7),
  (20, 'Moist Banana Bread', '3 bananas\n250 g flour\n150 g sugar\n100 g butter\n2 eggs\n2 tsp baking powder\nSalt (to taste)', 'Preheat the oven to 175°C (350°F) and grease a loaf pan.\nMash the very ripe bananas and mix them with the melted butter, sugar and eggs.\nFold in the flour, baking powder and a pinch of salt.\nPour into the pan and bake for 50 to 55 minutes.\nLet cool before slicing.', 70, 'Dessert', 'https://images.unsplash.com/photo-1569762404472-026308ba6b64?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=qUmDpPfY_h0&pp=ygUSTW9pc3QgQmFuYW5hIEJyZWFk', TRUE, NULL, '2026-11-11 09:05:00', '2026-11-11 09:05:00', 6),
  (21, 'Cinnamon Apple Crumble', '5 apples\n150 g flour\n100 g butter\n100 g sugar\n1 tsp cinnamon', 'Peel and slice the apples, then arrange them in a baking dish with the cinnamon.\nRub the cold butter into the flour and sugar until you get coarse crumbs.\nSpread the crumble over the apples.\nBake for 35 minutes at 180°C (350°F) until golden.', 50, 'Dessert', 'https://images.unsplash.com/photo-1506127946181-abb01a32593c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=n-iaYRd9Arw&pp=ygUWQ2lubmFtb24gQXBwbGUgQ3J1bWJsZQ%3D%3D', TRUE, NULL, '2026-10-20 16:00:00', '2026-10-20 16:00:00', 6),
  (22, 'Caprese Salad', '3 tomatoes\n125 g mozzarella\n10 g fresh basil\n2 tbsp olive oil\nSalt (to taste)', 'Slice the tomatoes and the mozzarella.\nAlternate the slices on a plate and add the basil leaves.\nDrizzle with olive oil and sprinkle with salt.', 10, 'Entrée', 'https://images.unsplash.com/photo-1769458313937-b5ad8f84942e?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=gOcfUgd4ekA&pp=ygUNQ2FwcmVzZSBTYWxhZA%3D%3D', TRUE, NULL, '2026-10-10 10:25:00', '2026-10-10 10:25:00', 2),
  (23, 'Creamy Mushroom Risotto', '300 g arborio rice\n250 g mushrooms\n1 onions\n30 g butter\n1000 ml vegetable broth\n60 g parmesan\nBlack pepper (to taste)', 'Keep the vegetable broth hot in a saucepan.\nCook the sliced mushrooms in a pan until golden, then set them aside.\nSoften the chopped onion in the butter, add the rice and stir for 2 minutes.\nAdd the broth one ladle at a time, stirring, until the rice is creamy (about 18 minutes).\nStir in the mushrooms, the grated parmesan and black pepper.', 45, 'Plat', 'https://images.unsplash.com/photo-1609770424775-39ec362f2d94?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=NKtR3KpS83w&pp=ygUXQ3JlYW15IE11c2hyb29tIFJpc290dG8%3D', TRUE, 2.99, '2026-11-02 18:00:00', '2026-11-02 18:00:00', 2),
  (24, 'Hearty Lentil Soup', '250 g lentils\n2 carrots\n1 onions\n2 garlic cloves\n200 g canned tomatoes\n1000 ml vegetable broth\n2 tbsp olive oil\n1 tsp cumin\nSalt (to taste)', 'Soften the chopped onion, carrots and garlic in the olive oil.\nAdd the cumin, the rinsed lentils, the tomatoes and the broth.\nSimmer for 25 to 30 minutes until the lentils are tender.\nSeason with salt and serve hot.', 40, 'Plat', 'https://plus.unsplash.com/premium_photo-1712678665743-15e3833da37e?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=mdT3tFEug00&pp=ygUSSGVhcnR5IExlbnRpbCBTb3Vw', TRUE, NULL, '2026-10-29 12:30:00', '2026-10-29 12:30:00', 3),
  (25, 'Tuna Mayo Sandwich', '160 g canned tuna\n2 tbsp mayonnaise\n4 bread slices\n2 lettuce leaves', 'Drain the tuna and mix it with the mayonnaise.\nToast the bread slices.\nSpread the tuna mixture on two slices, add the lettuce and close the sandwiches.', 10, 'Plat', 'https://images.unsplash.com/photo-1754652327590-634bfebc7cf0?w=1000&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=JA-930RFSSE&pp=ygUSVHVuYSBNYXlvIFNhbmR3aWNo', TRUE, NULL, '2026-11-06 12:15:00', '2026-11-06 12:15:00', 4),
  (26, 'Cinnamon French Toast', '4 bread slices\n2 eggs\n100 ml milk\n1 tbsp sugar\n20 g butter\n1 tsp cinnamon', 'Whisk the eggs with the milk, sugar and cinnamon in a shallow dish.\nSoak each bread slice for 30 seconds on each side.\nFry the slices in the butter until golden on both sides.', 15, 'Plat', 'https://images.unsplash.com/photo-1595044643502-616eeebbdff3?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D', 'https://www.youtube.com/watch?v=njuQDii24Dk&pp=ygUVQ2lubmFtb24gRnJlbmNoIFRvYXN0', TRUE, NULL, '2026-11-10 08:20:00', '2026-11-10 08:20:00', 6);

-- --------------------------------------------------------------------------
-- 3. Avis & Likes
-- --------------------------------------------------------------------------

INSERT INTO `Reviews` (`id`, `rating`, `comment`, `createdAt`, `updatedAt`, `recipeId`, `userId`) VALUES
  (1, 5, 'A real treat, perfect caramel!', '2026-10-05 14:14:00', '2026-10-05 14:14:00', 1, 8),
  (2, 5, 'Thank you for leaving out the cream!', '2026-10-19 22:32:00', '2026-10-19 22:32:00', 2, 1),
  (3, 4, 'Silky and rich. Watch the heat or the eggs scramble.', '2026-10-20 03:32:00', '2026-10-20 03:32:00', 2, 6),
  (4, 4, 'Simple and perfect for a quick breakfast.', '2026-11-09 12:45:00', '2026-11-09 12:45:00', 5, 8),
  (5, 5, 'Ready in no time, amazing with fresh bread.', '2026-11-04 00:10:00', '2026-11-04 00:10:00', 6, 2),
  (6, 5, 'Garlic lovers, this one is for you.', '2026-11-04 05:10:00', '2026-11-04 05:10:00', 6, 3),
  (7, 4, 'Fresh and easy. Use very ripe tomatoes.', '2026-10-12 18:00:00', '2026-10-12 18:00:00', 7, 7),
  (8, 5, 'Patience is the secret ingredient. Worth every minute.', '2026-10-30 23:25:00', '2026-10-30 23:25:00', 8, 1),
  (9, 4, 'Delicious, I used a bit less cheese.', '2026-10-31 04:25:00', '2026-10-31 04:25:00', 8, 4),
  (10, 5, 'The whole family loved them.', '2026-11-08 13:30:00', '2026-11-08 13:30:00', 9, 8),
  (11, 4, 'Great with maple syrup.', '2026-11-08 18:30:00', '2026-11-08 18:30:00', 9, 4),
  (12, 5, 'Light and fluffy, exactly as promised.', '2026-11-08 23:30:00', '2026-11-08 23:30:00', 9, 2),
  (13, 5, 'Restaurant quality with three ingredients.', '2026-10-23 01:15:00', '2026-10-23 01:15:00', 10, 1),
  (14, 5, 'Intense and airy at the same time.', '2026-10-23 06:15:00', '2026-10-23 06:15:00', 10, 5),
  (15, 5, 'Even better the next day.', '2026-10-08 17:40:00', '2026-10-08 17:40:00', 11, 8),
  (16, 5, 'My go-to Sunday dinner.', '2026-10-08 22:40:00', '2026-10-08 22:40:00', 11, 4),
  (17, 4, 'Great base, I swapped the beef for lentils.', '2026-10-09 03:40:00', '2026-10-09 03:40:00', 11, 7),
  (18, 4, 'Mild and creamy. I added a pinch of chili.', '2026-10-16 00:30:00', '2026-10-16 00:30:00', 13, 5),
  (19, 5, 'Perfect comfort food.', '2026-10-16 05:30:00', '2026-10-16 05:30:00', 13, 8),
  (20, 4, 'Juicy! Better than the fast-food version.', '2026-11-01 17:10:00', '2026-11-01 17:10:00', 14, 6),
  (21, 5, 'Crispy edges, soft center.', '2026-10-25 22:45:00', '2026-10-25 22:45:00', 15, 1),
  (22, 5, 'Simple ingredients, great result.', '2026-10-26 03:45:00', '2026-10-26 03:45:00', 15, 7),
  (23, 4, 'Tastes like summer.', '2026-10-02 19:20:00', '2026-10-02 19:20:00', 16, 3),
  (24, 4, 'Fresh and ready in 10 minutes.', '2026-10-17 16:55:00', '2026-10-17 16:55:00', 18, 6),
  (25, 5, 'Gone in five minutes at our party.', '2026-11-07 20:35:00', '2026-11-07 20:35:00', 19, 4),
  (26, 4, 'Warm with vanilla ice cream, perfect.', '2026-10-20 21:00:00', '2026-10-20 21:00:00', 21, 1),
  (27, 3, 'Good, but a little too sweet for me.', '2026-10-21 02:00:00', '2026-10-21 02:00:00', 21, 8),
  (28, 5, 'Creamy without any cream.', '2026-11-02 23:00:00', '2026-11-02 23:00:00', 23, 7),
  (29, 4, 'Cheap, filling and tasty.', '2026-10-29 17:30:00', '2026-10-29 17:30:00', 24, 5),
  (30, 5, 'A great use for stale bread.', '2026-11-10 13:20:00', '2026-11-10 13:20:00', 26, 8);

INSERT INTO `RecipeLikes` (`recipeId`, `likes`) VALUES
  (1, 34), (2, 41), (3, 18), (4, 12), (5, 6), (6, 22), (7, 9), (8, 27),
  (9, 31), (10, 37), (11, 45), (12, 8), (13, 29), (14, 15), (15, 33), (16, 11),
  (17, 0), (18, 7), (19, 14), (20, 4), (21, 19), (22, 5), (23, 16), (24, 10),
  (25, 3), (26, 7);

-- --------------------------------------------------------------------------
-- 4. Monétisation (Abonnements, Déblocages Vidéos, Demandes Payantes, Paiements)
-- --------------------------------------------------------------------------

INSERT INTO `SubscriptionPlans` (`id`, `name`, `slug`, `description`, `priceMonthly`, `features`, `isActive`, `createdAt`, `updatedAt`) VALUES
  (1, 'Gourmet Free', 'free', 'Accès gratuit aux recettes communautaires et au chat public.', 0.00, 'Accès aux recettes standard\nCommentaires et likes\nChat communautaire', TRUE, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (2, 'Gourmet Plus', 'gourmet-plus', 'Regardez toutes les vidéos des recettes + badge Plus sur votre profil.', 30.00, 'Toutes les vidéos des recettes\nBadge Gourmet Plus\nVos propres vidéos restent toujours gratuites pour vous', TRUE, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (3, 'Chef VIP', 'chef-vip', 'Accès illimité aux vidéos + 1 demande de recette personnalisée offerte par mois.', 12.99, 'Toutes les vidéos premium débloquées\n1 demande de recette sur-mesure/mois\nAccès direct aux salons privés des chefs', FALSE, '2026-09-01 08:00:00', '2026-09-01 08:00:00');

INSERT INTO `UserSubscriptions` (`id`, `userId`, `planId`, `status`, `startDate`, `endDate`, `createdAt`, `updatedAt`) VALUES
  (1, 8, 2, 'active', '2026-11-01 10:00:00', '2026-12-01 10:00:00', '2026-11-01 10:00:00', '2026-11-01 10:00:00'),
  (2, 4, 3, 'active', '2026-11-05 14:30:00', '2026-12-05 14:30:00', '2026-11-05 14:30:00', '2026-11-05 14:30:00');

INSERT INTO `VideoUnlocks` (`id`, `userId`, `recipeId`, `amountPaid`, `unlockedAt`) VALUES
  (1, 7, 1, 2.99, '2026-11-02 15:20:00'),
  (2, 5, 2, 2.49, '2026-11-04 19:00:00');

INSERT INTO `RecipeRequests` (`id`, `requesterId`, `targetChefId`, `title`, `description`, `dietaryNotes`, `offeredAmount`, `status`, `fulfilledRecipeId`, `createdAt`, `updatedAt`) VALUES
  (1, 8, 2, 'Gluten-Free Fresh Tagliatelle', 'Could you create a detailed recipe + video for homemade gluten-free tagliatelle that holds its texture?', 'Gluten-free', 15.00, 'accepted', NULL, '2026-11-10 11:00:00', '2026-11-11 09:30:00'),
  (2, 4, NULL, 'Authentic West African Thieboudienne', 'Looking for a step-by-step weekend recipe for traditional red Thieboudienne with stuffed fish.', NULL, 20.00, 'open', NULL, '2026-11-12 16:45:00', '2026-11-12 16:45:00');

INSERT INTO `Payments` (`id`, `userId`, `amount`, `currency`, `paymentType`, `referenceId`, `status`, `createdAt`) VALUES
  (1, 8, 4.99, 'EUR', 'subscription', 1, 'succeeded', '2026-11-01 10:00:00'),
  (2, 4, 12.99, 'EUR', 'subscription', 2, 'succeeded', '2026-11-05 14:30:00'),
  (3, 7, 2.99, 'EUR', 'video_unlock', 1, 'succeeded', '2026-11-02 15:20:00'),
  (4, 5, 2.49, 'EUR', 'video_unlock', 2, 'succeeded', '2026-11-04 19:00:00');

-- --------------------------------------------------------------------------
-- 5. Social, Chat & Modération
-- --------------------------------------------------------------------------

INSERT INTO `UserFollows` (`followerId`, `followingId`, `createdAt`) VALUES
  (8, 1, '2026-10-06 09:00:00'),
  (8, 2, '2026-10-20 10:00:00'),
  (4, 3, '2026-10-15 18:00:00'),
  (6, 1, '2026-10-07 12:00:00');

INSERT INTO `ChatRooms` (`id`, `name`, `type`, `createdAt`, `updatedAt`) VALUES
  (1, 'Ef''Recipe Lounge (General)', 'group', '2026-09-01 08:00:00', '2026-11-12 10:00:00'),
  (2, NULL, 'direct', '2026-11-10 11:05:00', '2026-11-10 11:15:00');

INSERT INTO `ChatParticipants` (`roomId`, `userId`, `joinedAt`, `lastReadAt`) VALUES
  (1, 1, '2026-09-01 08:00:00', '2026-11-12 10:00:00'),
  (1, 2, '2026-09-01 08:00:00', '2026-11-12 09:45:00'),
  (1, 8, '2026-09-02 14:00:00', '2026-11-12 10:00:00'),
  (1, 10, '2026-09-01 08:00:00', '2026-11-12 10:00:00'),
  (2, 8, '2026-11-10 11:05:00', '2026-11-10 11:15:00'),
  (2, 2, '2026-11-10 11:05:00', '2026-11-10 11:15:00');

INSERT INTO `ChatMessages` (`id`, `roomId`, `senderId`, `content`, `isDeleted`, `createdAt`) VALUES
  (1, 1, 1, 'Welcome everyone to the live kitchen chat! What are you cooking this week?', FALSE, '2026-11-12 09:30:00'),
  (2, 1, 8, 'Just tried the Tarte Tatin video tutorial, the caramel tip worked like a charm!', FALSE, '2026-11-12 09:35:00'),
  (3, 2, 8, 'Hi Marco! I just submitted a paid request for gluten-free tagliatelle.', FALSE, '2026-11-10 11:06:00'),
  (4, 2, 2, 'Ciao Sophie! Accepted, I will film the dough kneading process this weekend.', FALSE, '2026-11-10 11:15:00');

INSERT INTO `ModContactTickets` (`id`, `userId`, `assignedModId`, `subject`, `category`, `message`, `status`, `adminReply`, `createdAt`, `updatedAt`) VALUES
  (1, 6, 10, 'Question about creator video payouts', 'billing', 'Hello moderators, how do I set up my payout details for my premium video recipes?', 'resolved', 'Hi Julie! You can configure your creator payout method directly in your Profile Settings tab.', '2026-11-08 14:00:00', '2026-11-08 16:20:00');

INSERT INTO `Reports` (`id`, `reporterId`, `targetType`, `targetId`, `targetOwnerId`, `targetLabel`, `reason`, `details`, `status`, `action`, `reviewedBy`, `moderatorNote`, `createdAt`, `updatedAt`) VALUES
  (1, 2, 'review', 27, 8, 'Review on a recipe: Good, but a little too sweet for me.', 'other', 'Test report example for moderation queue.', 'dismissed', 'none', 10, 'Constructive taste feedback, within community guidelines.', '2026-11-09 09:00:00', '2026-11-09 10:15:00');

INSERT INTO `UserBlocks` (`blockerId`, `blockedId`, `reason`, `createdAt`) VALUES
  (7, 4, 'Prefer not to see meat-heavy BBQ posts in feed', '2026-11-06 18:00:00');

-- --------------------------------------------------------------------------
-- 6. Réinitialisation des compteurs AUTO_INCREMENT
-- --------------------------------------------------------------------------

ALTER TABLE `Users`              AUTO_INCREMENT = 13;
ALTER TABLE `Recipes`            AUTO_INCREMENT = 27;
ALTER TABLE `Reviews`            AUTO_INCREMENT = 31;
ALTER TABLE `SubscriptionPlans`  AUTO_INCREMENT = 4;
ALTER TABLE `UserSubscriptions`  AUTO_INCREMENT = 3;
ALTER TABLE `VideoUnlocks`       AUTO_INCREMENT = 3;
ALTER TABLE `RecipeRequests`     AUTO_INCREMENT = 3;
ALTER TABLE `Payments`           AUTO_INCREMENT = 5;
ALTER TABLE `ChatRooms`          AUTO_INCREMENT = 3;
ALTER TABLE `ChatMessages`       AUTO_INCREMENT = 5;
ALTER TABLE `ModContactTickets`  AUTO_INCREMENT = 2;
ALTER TABLE `Reports`            AUTO_INCREMENT = 2;
