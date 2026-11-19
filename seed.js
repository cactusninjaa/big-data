/**
 * Seed de la base e-commerce (PostgreSQL)
 *
 * Installation :  npm install pg bcryptjs
 * Utilisation  :  DATABASE_URL=postgres://user:pass@localhost:5432/ma_base node seed.js [--reset]
 *
 *   --reset : vide toutes les tables avant d'insérer (TRUNCATE ... CASCADE)
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// PRNG déterministe : même seed => mêmes données à chaque exécution
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const sample = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

async function insert(client, table, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows.map((row, i) =>
    '(' + cols.map((c, j) => { values.push(row[c]); return `$${i * cols.length + j + 1}`; }).join(', ') + ')'
  );
  await client.query(
    `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES ${placeholders.join(', ')}`,
    values
  );
  console.log(`  ✔ ${table.padEnd(30)} ${rows.length} lignes`);
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

// 1. BRAND
const brands = [
  'Nike', 'Adidas', 'Puma', "Levi's", 'Lacoste', 'The North Face', 'Patagonia', 'Carhartt',
  'New Balance', 'Converse', 'Vans', 'Le Coq Sportif', 'Petit Bateau', 'Armor-Lux', 'Veja',
].map((name) => ({ id: randomUUID(), name }));
const brandId = (name) => brands.find((b) => b.name === name).id;

// 2. CATEGORY (5 racines + 10 sous-catégories)
const categories = [];
const addCat = (name, parent = null) => {
  const c = { id: randomUUID(), name, parent_category_id: parent ? catId(parent) : null };
  categories.push(c);
  return c;
};
const catId = (name) => categories.find((c) => c.name === name).id;

['Homme', 'Femme', 'Enfant', 'Chaussures', 'Accessoires'].forEach((n) => addCat(n));
addCat('T-shirts', 'Homme');
addCat('Jeans', 'Homme');
addCat('Vestes', 'Homme');
addCat('Robes', 'Femme');
addCat('Sweats', 'Femme');
addCat('Pyjamas', 'Enfant');
addCat('Baskets', 'Chaussures');
addCat('Bottes', 'Chaussures');
addCat('Casquettes', 'Accessoires');
addCat('Sacs', 'Accessoires');

// 3. PRODUCT + VARIANT (définis ensemble pour rester cohérents)
const catalog = [
  { ref: 'NK-AF1', name: 'Air Force 1 \'07', brand: 'Nike', cats: ['Chaussures', 'Baskets'], desc: 'La basket iconique au cuir pleine fleur.', base: 119.99,
    variants: [['42', 'Blanc'], ['44', 'Noir'], ['39', 'Blanc']] },
  { ref: 'AD-SMITH', name: 'Stan Smith', brand: 'Adidas', cats: ['Chaussures', 'Baskets'], desc: 'Tennis minimaliste en cuir, talon vert.', base: 99.95,
    variants: [['41', 'Blanc/Vert'], ['43', 'Blanc/Marine']] },
  { ref: 'PU-ESS-TEE', name: 'T-shirt Essentials Logo', brand: 'Puma', cats: ['Homme', 'T-shirts'], desc: 'T-shirt coton bio, coupe régulière.', base: 24.99,
    variants: [['M', 'Gris chiné'], ['L', 'Noir']] },
  { ref: 'LV-501', name: 'Jean 501 Original', brand: "Levi's", cats: ['Homme', 'Jeans'], desc: 'Le jean droit à boutons, depuis 1873.', base: 109.0,
    variants: [['W32 L32', 'Brut'], ['W34 L32', 'Stone wash']] },
  { ref: 'LC-POLO-L12', name: 'Polo L.12.12', brand: 'Lacoste', cats: ['Homme', 'T-shirts'], desc: 'Polo en petit piqué de coton.', base: 105.0,
    variants: [['S', 'Marine'], ['M', 'Rouge'], ['XL', 'Vert']] },
  { ref: 'TNF-NUPTSE', name: 'Doudoune 1996 Retro Nuptse', brand: 'The North Face', cats: ['Homme', 'Vestes'], desc: 'Doudoune en duvet 700 cuin, col montant.', base: 330.0,
    variants: [['L', 'Noir'], ['M', 'Jaune']] },
  { ref: 'PT-BETTER-SW', name: 'Polaire Better Sweater', brand: 'Patagonia', cats: ['Femme', 'Sweats'], desc: 'Polaire en polyester recyclé.', base: 150.0,
    variants: [['S', 'Écru'], ['M', 'Bleu nuit']] },
  { ref: 'CH-DETROIT', name: 'Veste Detroit', brand: 'Carhartt', cats: ['Homme', 'Vestes'], desc: 'Veste de travail en canvas, doublure couverture.', base: 199.0,
    variants: [['L', 'Hamilton Brown']] },
  { ref: 'NB-574', name: '574 Core', brand: 'New Balance', cats: ['Chaussures', 'Baskets'], desc: 'Running rétro en daim et mesh.', base: 94.99,
    variants: [['40', 'Gris'], ['42', 'Marine']] },
  { ref: 'CV-CHUCK70', name: 'Chuck 70 High', brand: 'Converse', cats: ['Chaussures', 'Baskets'], desc: 'Toile épaisse, semelle vintage.', base: 89.99,
    variants: [['38', 'Noir'], ['41', 'Parchment']] },
  { ref: 'VN-CAP-CLASS', name: 'Casquette Classic Patch', brand: 'Vans', cats: ['Accessoires', 'Casquettes'], desc: 'Casquette 6 panneaux réglable.', base: 29.99,
    variants: [['Unique', 'Noir'], ['Unique', 'Bordeaux']] },
  { ref: 'LCS-BAG-ESS', name: 'Sac à dos Essentiels', brand: 'Le Coq Sportif', cats: ['Accessoires', 'Sacs'], desc: 'Sac à dos 20 L, compartiment ordinateur.', base: 45.0,
    variants: [['Unique', 'Bleu']] },
  { ref: 'PB-PYJ-RAY', name: 'Pyjama rayé coton', brand: 'Petit Bateau', cats: ['Enfant', 'Pyjamas'], desc: 'Pyjama 2 pièces en jersey de coton.', base: 39.9,
    variants: [['4 ans', 'Marine/Blanc'], ['6 ans', 'Rose/Blanc'], ['8 ans', 'Marine/Blanc']] },
  { ref: 'AL-ROBE-MAR', name: 'Robe marinière', brand: 'Armor-Lux', cats: ['Femme', 'Robes'], desc: 'Robe rayée en coton épais, fabriquée en France.', base: 89.0,
    variants: [['36', 'Blanc/Marine'], ['40', 'Écru/Rouge']] },
  { ref: 'VJ-CAMPO', name: 'Campo Chromefree', brand: 'Veja', cats: ['Chaussures', 'Baskets', 'Femme'], desc: 'Basket en cuir tanné sans chrome.', base: 150.0,
    variants: [['37', 'Blanc/Nautico'], ['39', 'Extra-white']] },
  // Nouveautés jamais commandées (exclues des commandes, peuvent être dans des paniers)
  { ref: 'AD-SAMBA', name: 'Samba OG', brand: 'Adidas', cats: ['Chaussures', 'Baskets'], desc: 'Basket terrace en cuir et daim, semelle gomme.', base: 120.0, neverOrdered: true,
    variants: [['42', 'Noir/Blanc'], ['44', 'Blanc/Vert']] },
  { ref: 'PT-TORRENT', name: 'Veste Torrentshell 3L', brand: 'Patagonia', cats: ['Homme', 'Vestes'], desc: 'Veste imperméable 3 couches en nylon recyclé.', base: 180.0, neverOrdered: true,
    variants: [['M', 'Vert forêt'], ['L', 'Noir']] },
];

const products = [];
const productCategories = [];
const variants = [];
const prices = [];

for (const p of catalog) {
  const product = { id: randomUUID(), reference: p.ref, name: p.name, description: p.desc, brand_id: brandId(p.brand) };
  products.push(product);
  p.cats.forEach((c) => productCategories.push({ product_id: product.id, category_id: catId(c) }));

  p.variants.forEach(([size, color]) => {
    const variant = {
      id: randomUUID(),
      reference: `${p.ref}-${size.replace(/\s+/g, '')}-${color.slice(0, 3).toUpperCase()}`.replace(/[^A-Z0-9-]/gi, ''),
      size,
      color,
      product_id: product.id,
      quantity: pick([0, 3, 8, 12, 25, 40, 60, 120]),
      name: `${p.name} - ${color} - ${size}`,
      _base: p.base,
      _cat: p.cats,
      _neverOrdered: !!p.neverOrdered,
    };
    variants.push(variant);

    // Historique : parfois un ancien prix inactif, puis le prix actif
    if (rand() < 0.5) {
      prices.push({ id: randomUUID(), value: +(p.base * 0.9).toFixed(2), variant_id: variant.id, is_active: false, created_at: daysAgo(int(200, 400)), currency: 'EUR' });
    }
    prices.push({ id: randomUUID(), value: p.base, variant_id: variant.id, is_active: true, created_at: daysAgo(int(10, 120)), currency: 'EUR' });
    // Quelques prix en devises étrangères
    if (rand() < 0.25) {
      prices.push({ id: randomUUID(), value: +(p.base * 1.08).toFixed(2), variant_id: variant.id, is_active: true, created_at: daysAgo(int(5, 60)), currency: pick(['USD', 'GBP']) });
    }
  });
}

// 6. USER — 20 villes, 3 clients par ville (le 1er client des 15 premières villes est un "personnage" fixe)
const cities = [
  // [ville, code postal, rue, pays]
  ['Paris', '75011', 'rue Oberkampf', 'France'],
  ['Lyon', '69002', 'rue de la République', 'France'],
  ['Marseille', '13001', 'La Canebière', 'France'],
  ['Bordeaux', '33000', 'cours de l\'Intendance', 'France'],
  ['Lille', '59000', 'rue Faidherbe', 'France'],
  ['Nantes', '44000', 'rue Crébillon', 'France'],
  ['Toulouse', '31000', 'rue d\'Alsace-Lorraine', 'France'],
  ['Strasbourg', '67000', 'rue des Grandes Arcades', 'France'],
  ['Montpellier', '34000', 'rue de la Loge', 'France'],
  ['Bruxelles', '1000', 'rue Neuve', 'Belgique'],
  ['Genève', '1204', 'rue du Rhône', 'Suisse'],
  ['Rennes', '35000', 'rue Le Bastard', 'France'],
  ['Nice', '06000', 'avenue Jean Médecin', 'France'],
  ['Luxembourg', 'L-1660', 'Grand-Rue', 'Luxembourg'],
  ['Grenoble', '38000', 'rue Félix Poulat', 'France'],
  ['Dijon', '21000', 'rue de la Liberté', 'France'],
  ['Reims', '51100', 'place Drouet-d\'Erlon', 'France'],
  ['Boulogne-Billancourt', '92100', 'rue de Paris', 'France'],
  ['Tours', '37000', 'rue Nationale', 'France'],
  ['Clermont-Ferrand', '63000', 'rue du Port', 'France'],
];

const people = [
  ['Camille', 'Martin'], ['Lucas', 'Bernard'], ['Léa', 'Dubois'], ['Hugo', 'Thomas'], ['Chloé', 'Robert'],
  ['Nathan', 'Richard'], ['Inès', 'Petit'], ['Théo', 'Durand'], ['Manon', 'Leroy'], ['Yanis', 'Moreau'],
  ['Sarah', 'Simon'], ['Louis', 'Laurent'], ['Jade', 'Lefebvre'], ['Adam', 'Michel'], ['Emma', 'Garcia'],
];
const firstnames = [
  'Alice', 'Gabriel', 'Louise', 'Raphaël', 'Ambre', 'Arthur', 'Rose', 'Jules', 'Anna', 'Maël',
  'Lina', 'Noah', 'Mia', 'Tom', 'Julia', 'Sacha', 'Zoé', 'Paul', 'Lou', 'Malik', 'Eva', 'Nolan',
];
const lastnames = [
  'Fontaine', 'Mercier', 'Benali', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Faure', 'Rousseau',
  'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clement',
];

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const emailCount = new Map();
const makeEmail = (firstname, lastname) => {
  const base = `${strip(firstname)}.${strip(lastname)}`.replace(/[^a-z.]/g, '');
  const n = (emailCount.get(base) || 0) + 1;
  emailCount.set(base, n);
  return `${base}${n > 1 ? n : ''}@${pick(['gmail.com', 'outlook.fr', 'yahoo.fr', 'proton.me', 'free.fr'])}`;
};
const makePhone = () => `+33 6 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`;

const USERS_PER_CITY = 3;
const users = [];
const addresses = [];
const usersByCity = new Map(cities.map(([city]) => [city, []]));

cities.forEach(([city, zip, street, country], c) => {
  for (let k = 0; k < USERS_PER_CITY; k++) {
    const i = users.length;
    const [firstname, lastname] = k === 0 && people[c] ? people[c] : [pick(firstnames), pick(lastnames)];
    const user = {
      id: randomUUID(),
      firstname,
      lastname,
      phone: makePhone(),
      email: makeEmail(firstname, lastname),
      password: '', // hashé plus bas
      is_active: i !== 13, // un compte désactivé
      default_address_id: null,
      created_at: daysAgo(int(200, 700)),
      updated_at: rand() < 0.6 ? daysAgo(int(1, 29)) : null,
    };
    users.push(user);
    usersByCity.get(city).push(user);

    // 7. ADDRESS : adresse principale + parfois une adresse "Travail" (même ville)
    addresses.push({ id: randomUUID(), user_id: user.id, name: 'Domicile', zip_code: zip, street_name: street, number: String(int(1, 150)), city, country });
    if (i % 3 === 0) {
      addresses.push({ id: randomUUID(), user_id: user.id, name: 'Travail', zip_code: zip, street_name: 'boulevard Haussmann', number: String(int(1, 80)), city, country });
    }
  }
});

// 8. DISCOUNT : remises variante / catégorie / panier, certaines expirées
const discountDefs = [
  { pct: 10, cat: null, variant: null, cart: true, end: 30 },
  { pct: 15, cat: 'Baskets', variant: null, cart: false, end: 14 },
  { pct: 20, cat: 'Vestes', variant: null, cart: false, end: 45 },
  { pct: 5, cat: null, variant: null, cart: true, end: 365 },
  { pct: 30, cat: null, variant: 0, cart: false, end: 7 },
  { pct: 25, cat: 'Enfant', variant: null, cart: false, end: 60 },
  { pct: 50, cat: null, variant: 5, cart: false, end: -10 }, // expirée
  { pct: 12, cat: 'Accessoires', variant: null, cart: true, end: 20 },
  { pct: 40, cat: 'Robes', variant: null, cart: false, end: -30 }, // expirée
  { pct: 8, cat: null, variant: null, cart: true, end: 90 },
  { pct: 35, cat: null, variant: 12, cart: false, end: 3 },
  { pct: 18, cat: 'Femme', variant: null, cart: true, end: 120 },
  { pct: 100, cat: null, variant: 18, cart: false, end: 2 }, // produit offert
  { pct: 22, cat: 'T-shirts', variant: null, cart: false, end: 15 },
  { pct: 15, cat: null, variant: null, cart: true, end: -1 }, // expirée hier
];
const discounts = discountDefs.map((d) => ({
  id: randomUUID(),
  discount_percent: d.pct,
  created_at: daysAgo(int(20, 90)),
  end_date: daysFromNow(d.end),
  variant_allowed_id: d.variant !== null ? variants[d.variant % variants.length].id : null,
  category_allowed_id: d.cat ? catId(d.cat) : null,
  is_cart_available: d.cart,
}));

// 9. PROMO_CODE (un code par remise)
const codeNames = [
  ['Bienvenue', 'BIENVENUE10'], ['Sneakers Week', 'SNEAK15'], ['Hiver au chaud', 'HIVER20'],
  ['Fidélité', 'FIDELE5'], ['Flash AF1', 'FLASH30'], ['Rentrée des petits', 'KIDS25'],
  ['Soldes été', 'SOLDES50'], ['Accessoirise-toi', 'ACC12'], ['Printemps', 'ROBE40'],
  ['Newsletter', 'NEWS8'], ['Black Friday', 'BLACKFRIDAY35'], ['Journée de la femme', 'FEMME18'],
  ['Cadeau influenceur', 'GIFT100'], ['Summer Tee', 'TEE22'], ['Anniversaire', 'ANNIV15'],
];
const promoCodes = discounts.map((d, i) => ({
  id: randomUUID(),
  name: codeNames[i][0],
  code: codeNames[i][1],
  discount_id: d.id,
  max_usage: pick([null, 1, 50, 100, 500, 1000]),
  usage_counter: 0, // recalculé après les commandes
}));
const promoByCode = (code) => promoCodes.find((p) => p.code === code);

// Codes réservés à certains clients / interdits à d'autres
const promoRestricted = [
  ...sample(users, 3).map((u) => ({ promo_code_id: promoByCode('GIFT100').id, user_id: u.id })),
  ...sample(users, 5).map((u) => ({ promo_code_id: promoByCode('FIDELE5').id, user_id: u.id })),
  ...sample(users, 4).map((u) => ({ promo_code_id: promoByCode('ANNIV15').id, user_id: u.id })),
  ...sample(users, 3).map((u) => ({ promo_code_id: promoByCode('FLASH30').id, user_id: u.id })),
];
const promoExcluded = [
  ...sample(users, 5).map((u) => ({ promo_code_id: promoByCode('BIENVENUE10').id, user_id: u.id })),
  ...sample(users, 4).map((u) => ({ promo_code_id: promoByCode('NEWS8').id, user_id: u.id })),
  ...sample(users, 3).map((u) => ({ promo_code_id: promoByCode('SNEAK15').id, user_id: u.id })),
  ...sample(users, 3).map((u) => ({ promo_code_id: promoByCode('BLACKFRIDAY35').id, user_id: u.id })),
];

// 10. CART (un panier par client, client_id UNIQUE)
const carts = users.map((u) => ({ id: randomUUID(), client_id: u.id }));


// 11 & 12. ADDRESS_ORDER + ORDER : 30 à 45 commandes par ville (=> 20 villes avec >= 30 commandes)
const MIN_ORDERS_PER_CITY = 30;
const MAX_ORDERS_PER_CITY = 45;
const states = ['pending', 'paid', 'shipped', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled'];
const usablePromos = ['BIENVENUE10', 'SNEAK15', 'HIVER20', 'NEWS8', 'BLACKFRIDAY35', 'TEE22', 'ACC12', 'FEMME18'];
const isExcluded = (promo, user) => promoExcluded.some((e) => e.promo_code_id === promo.id && e.user_id === user.id);
const addressOrders = [];
const orders = [];
const userPromoUsed = [];
const usedPairs = new Set();

for (const [city, zip, street, country] of cities) {
  const cityUsers = usersByCity.get(city);
  const nOrders = int(MIN_ORDERS_PER_CITY, MAX_ORDERS_PER_CITY);

  for (let n = 0; n < nOrders; n++) {
    const isGuest = rand() < 0.15; // ~15 % de commandes invitées
    const user = isGuest ? null : pick(cityUsers);
    const guest = isGuest
      ? (() => {
          const [firstname, lastname] = [pick(firstnames), pick(lastnames)];
          return { firstname, lastname, email: `${strip(firstname)}.${strip(lastname)}.${int(1, 999)}@gmail.com`, phone: `+33 7 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}` };
        })()
      : null;

    // Snapshot d'adresse (copie d'une adresse du client, ou adresse invitée dans la même ville)
    const src = user ? pick(addresses.filter((a) => a.user_id === user.id)) : null;
    const ao = src
      ? { id: randomUUID(), name: src.name, zip_code: src.zip_code, street_name: src.street_name, number: src.number, city: src.city, country: src.country }
      : { id: randomUUID(), name: 'Livraison', zip_code: zip, street_name: street, number: String(int(1, 60)), city, country };
    addressOrders.push(ao);

    // Code promo sur ~1 commande sur 3 : pas de réutilisation par le même client, respect de max_usage et des exclusions
    let promo = null;
    if (rand() < 0.35) {
      const candidate = promoByCode(pick(usablePromos));
      const key = `${user?.id}-${candidate.id}`;
      const underLimit = candidate.max_usage === null || candidate.usage_counter < candidate.max_usage;
      if (underLimit && (!user || (!usedPairs.has(key) && !isExcluded(candidate, user)))) {
        promo = candidate;
        if (user) usedPairs.add(key);
      }
    }

    const orderAt = daysAgo(int(1, 180));
    const order = {
      id: randomUUID(),
      order_at: orderAt,
      state: pick(states),
      client_id: user ? user.id : null,
      email: user ? user.email : guest.email,
      phone: user ? user.phone : guest.phone,
      firstname: user ? user.firstname : guest.firstname,
      lastname: user ? user.lastname : guest.lastname,
      address_order_id: ao.id,
      promo_code_id: promo ? promo.id : null,
    };
    orders.push(order);

    if (promo) {
      promo.usage_counter++;
      if (user) userPromoUsed.push({ user_id: user.id, promo_code_id: promo.id, used_at: orderAt });
    }
  }
}

// Garantie : au moins MIN_PAID_CLIENTS clients avec une commande à l'état 'paid'
// (on passe à 'paid' une commande des clients qui n'en ont pas, jusqu'à atteindre le seuil)
const MIN_PAID_CLIENTS = 55;
const paidClients = new Set(orders.filter((o) => o.client_id && o.state === 'paid').map((o) => o.client_id));
for (const user of users) {
  if (paidClients.size >= MIN_PAID_CLIENTS) break;
  if (paidClients.has(user.id)) continue;
  const order = orders.find((o) => o.client_id === user.id);
  if (!order) continue;
  order.state = 'paid';
  paidClients.add(user.id);
}

// 13. CART_VARIANT : lignes de paniers en cours + lignes de commandes
const cartVariants = [];
// Paniers : ~40 % de paniers non vides
for (const cart of carts.filter(() => rand() < 0.4)) {
  sample(variants, int(1, 2)).forEach((v) =>
    cartVariants.push({ id: randomUUID(), cart_id: cart.id, order_id: null, variant_id: v.id, quantity: int(1, 3) })
  );
}
// Commandes : 1 à 3 articles chacune (hors variantes jamais commandées)
const orderableVariants = variants.filter((v) => !v._neverOrdered);
for (const order of orders) {
  sample(orderableVariants, int(1, 3)).forEach((v) =>
    cartVariants.push({ id: randomUUID(), cart_id: null, order_id: order.id, variant_id: v.id, quantity: int(1, 2) })
  );
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

const clean = (rows) => rows.map(({ _base, _cat, _neverOrdered, ...r }) => r);

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Mot de passe commun pour tous les comptes de test : "Password123!"
  const hash = await bcrypt.hash('Password123!', 10);
  users.forEach((u) => (u.password = hash));

  try {
    await client.query('BEGIN');

    if (process.argv.includes('--reset')) {
      await client.query(`
        TRUNCATE "cart_variant", "order", "address_order", "cart", "user_promo_used",
                 "promo_code_excluded_client", "promo_code_restricted_client", "promo_code",
                 "discount", "address", "user", "price", "variant", "product_category",
                 "product", "category", "brand" CASCADE
      `);
      console.log('🧹 Tables vidées');
    }

    console.log('🌱 Insertion des données...');
    await insert(client, 'brand', brands);
    // Racines d'abord puis sous-catégories (auto-référence)
    await insert(client, 'category', categories);
    await insert(client, 'product', products);
    await insert(client, 'product_category', productCategories);
    await insert(client, 'variant', clean(variants));
    await insert(client, 'price', prices);
    await insert(client, 'user', users);
    await insert(client, 'address', addresses);

    // default_address_id une fois les adresses créées (1 client sans adresse par défaut)
    for (const [i, u] of users.entries()) {
      if (i === 7) continue;
      const addr = addresses.filter((a) => a.user_id === u.id);
      const chosen = addr.length > 1 && i % 2 === 0 ? addr[1] : addr[0];
      await client.query('UPDATE "user" SET "default_address_id" = $1 WHERE "id" = $2', [chosen.id, u.id]);
    }
    console.log(`  ✔ ${'user.default_address_id'.padEnd(30)} mis à jour`);

    await insert(client, 'discount', discounts);
    await insert(client, 'promo_code', promoCodes);
    await insert(client, 'promo_code_restricted_client', promoRestricted);
    await insert(client, 'promo_code_excluded_client', promoExcluded);
    await insert(client, 'cart', carts);
    await insert(client, 'address_order', addressOrders);
    await insert(client, 'order', orders);
    await insert(client, 'user_promo_used', userPromoUsed);
    await insert(client, 'cart_variant', cartVariants);

    await client.query('COMMIT');
    console.log('✅ Seed terminé (mot de passe des comptes : Password123!)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur, rollback effectué :', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
