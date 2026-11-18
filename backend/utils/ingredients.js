// ---------------------------------------------------------------------------
// Les ingrédients sont stockés dans la base sous forme de TEXTE, une ligne par
// ingrédient (c'est le format de gourmetcraft_data.sql) :
//     150 g sugar        quantité + unité (g, ml, tbsp, tsp) + nom
//     6 apples           quantité sans unité (pièces)
//     Black pepper (to taste)   sans quantité
// L'API, elle, manipule des objets { name, quantity, unit } (unit '' = "to taste").
// ---------------------------------------------------------------------------
const UNIT_LINE = /^(\d+(?:[.,]\d+)?)\s*(g|ml|tbsp|tsp)\s+(.+)$/i;
const PIECES_LINE = /^(\d+(?:[.,]\d+)?)\s+(.+)$/;
const TO_TASTE_LINE = /^(.+?)\s*\(to taste\)\s*$/i;

const toNumber = (text) => Number(text.replace(',', '.'));
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function parseLine(line) {
  let m;
  if ((m = line.match(UNIT_LINE))) {
    return { name: m[3].trim().toLowerCase(), quantity: toNumber(m[1]), unit: m[2].toLowerCase() };
  }
  if ((m = line.match(TO_TASTE_LINE))) {
    return { name: m[1].trim().toLowerCase(), quantity: null, unit: '' };
  }
  if ((m = line.match(PIECES_LINE))) {
    return { name: m[2].trim().toLowerCase(), quantity: toNumber(m[1]), unit: 'pcs' };
  }
  return { name: line.trim().toLowerCase(), quantity: null, unit: '' };   // pas de quantité : "to taste"
}

// Texte de la base -> tableau d'objets (accepte aussi l'ancien format JSON)
function parseIngredients(raw) {
  if (!raw) return [];
  const text = String(raw).trim();
  if (text.startsWith('[')) {
    try { return JSON.parse(text); } catch { /* ce n'était pas du JSON : on lit les lignes */ }
  }
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(parseLine);
}

// Tableau d'objets -> texte de la base
function serializeIngredients(list) {
  return (list || []).map(({ name, quantity, unit }) => {
    if (!unit) return `${capitalize(name)} (to taste)`;
    if (unit === 'pcs') return `${quantity} ${name}`;
    return `${quantity} ${unit} ${name}`;
  }).join('\n');
}

module.exports = { parseIngredients, serializeIngredients };
