-- Defi 1
SELECT
  ao.country,
  p.currency,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(cv.quantity) AS item_count,
  SUM(cv.quantity * p.value) AS gross_value
FROM public."order" AS o
JOIN public.cart_variant AS cv
  ON o.id = cv.order_id
JOIN public.price AS p
  ON cv.variant_id = p.variant_id
JOIN public.address_order AS ao
  ON o.address_order_id = ao.id
WHERE o.state IN ('paid', 'delivered', 'shipped')
GROUP BY ao.country, p.currency;

-- DEFI 2
SELECT ao.city,
  COUNT(DISTINCT o.id) AS nb_commandes,
  ROUND((SUM(cv.quantity * p.value) / COUNT(DISTINCT o.id))::numeric, 2) AS panier_moyen
FROM "order" o
JOIN address_order ao ON ao.id = o.address_order_id
JOIN cart_variant cv  ON cv.order_id = o.id
JOIN price p          ON p.variant_id = cv.variant_id AND p.is_active AND p.currency = 'EUR'
GROUP BY ao.city
HAVING COUNT(DISTINCT o.id) >= 30
ORDER BY panier_moyen
LIMIT 20;

-- DEFI 3
SELECT 
  client_id,
  COUNT(o.client_id) AS nb_client_order
FROM public.order AS o
WHERE o.state IN ('paid', 'delivered', 'shipped')
AND o.order_at >= NOW() - INTERVAL '12 months'
GROUP BY o.client_id
ORDER BY nb_client_order DESC
LIMIT 50

-- DEFI 4
SELECT v.reference, v.name
FROM variant v
WHERE NOT EXISTS (
    SELECT 1
    FROM cart_variant cv
    WHERE cv.variant_id = v.id
      AND cv.order_id IS NOT NULL
);

-- Defi 5
--- Classez les marques par chiffre d'affaires en tenant compte des quantités et des prix réellement payés
SELECT b.name AS marque,
        SUM(cv.quantity) AS articles_vendus,
        ROUND(SUM(cv.quantity * p.value * (1 - COALESCE(d.discount_percent, 0) / 100.0))::numeric, 2) AS chiffre_affaires
FROM "order" o
JOIN cart_variant cv ON cv.order_id = o.id
JOIN variant v       ON v.id = cv.variant_id
JOIN product pr      ON pr.id = v.product_id
JOIN brand b         ON b.id = pr.brand_id
JOIN price p         ON p.variant_id = v.id AND p.is_active AND p.currency = 'EUR'
LEFT JOIN promo_code pc ON pc.id = o.promo_code_id
LEFT JOIN discount d    ON d.id = pc.discount_id
WHERE o.state IN ('paid', 'shipped', 'delivered')
GROUP BY b.name
ORDER BY chiffre_affaires DESC;

-- Defi 7
-- Quels clients ayant déjà acheté n'ont rien commandé depuis 180 jours ?
SELECT u.firstname, u.lastname, u.email, MAX(o.order_at) AS derniere_commande
FROM "user" u
JOIN "order" o ON o.client_id = u.id
WHERE o.state IN ('paid', 'shipped', 'delivered')
GROUP BY u.id
HAVING MAX(o.order_at) < NOW() - INTERVAL '180 days'
ORDER BY derniere_commande;

-- Defi 8
-- Quelle catégorie réalise le plus de ventes dans chaque pays ? Un produit peut appartenir à plusieurs catégories
SELECT DISTINCT ON (ao.country)
        ao.country, c.name AS categorie, SUM(cv.quantity) AS ventes
FROM "order" o
JOIN address_order ao    ON ao.id = o.address_order_id
JOIN cart_variant cv     ON cv.order_id = o.id
JOIN variant v           ON v.id = cv.variant_id
JOIN product_category pc ON pc.product_id = v.product_id
JOIN category c          ON c.id = pc.category_id
WHERE o.state IN ('paid', 'shipped', 'delivered')
GROUP BY ao.country, c.name
ORDER BY ao.country, ventes DESC;

-- Defi 18 
-- Quelle est la variation en euros et en poucentage du CA par pays par rapport au mois précédent, y compris les mois à zéro
SELECT ao.country AS pays,
        COALESCE(SUM(cv.quantity * p.value) FILTER (WHERE o.order_at >= date_trunc('month', NOW())), 0) AS ca_mois,
        COALESCE(SUM(cv.quantity * p.value) FILTER (WHERE o.order_at <  date_trunc('month', NOW())), 0) AS ca_mois_precedent,
        COALESCE(SUM(cv.quantity * p.value) FILTER (WHERE o.order_at >= date_trunc('month', NOW())), 0)
      - COALESCE(SUM(cv.quantity * p.value) FILTER (WHERE o.order_at <  date_trunc('month', NOW())), 0) AS variation
FROM "order" o
JOIN address_order ao ON ao.id = o.address_order_id
JOIN cart_variant cv  ON cv.order_id = o.id
JOIN price p          ON p.variant_id = cv.variant_id AND p.is_active AND p.currency = 'EUR'
WHERE o.state IN ('paid', 'shipped', 'delivered')
  AND o.order_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
GROUP BY ao.country
ORDER BY pays;

-- Defi 19
-- Quelle proportion des clients repasse commande dans les 30, 60 et 90 jouers après leur premier achat ?
SELECT COUNT(DISTINCT f.client_id) AS clients,
        ROUND(100.0 * COUNT(DISTINCT f.client_id) FILTER (WHERE o.order_at <= f.premier + INTERVAL '30 days') / COUNT(DISTINCT f.client_id), 1) AS
pct_30j,
        ROUND(100.0 * COUNT(DISTINCT f.client_id) FILTER (WHERE o.order_at <= f.premier + INTERVAL '60 days') / COUNT(DISTINCT f.client_id), 1) AS
pct_60j,
        ROUND(100.0 * COUNT(DISTINCT f.client_id) FILTER (WHERE o.order_at <= f.premier + INTERVAL '90 days') / COUNT(DISTINCT f.client_id), 1) AS
pct_90j
FROM (
    -- date du premier achat de chaque client
    SELECT client_id, MIN(order_at) AS premier
    FROM "order"
    WHERE client_id IS NOT NULL AND state IN ('paid', 'shipped', 'delivered')
    GROUP BY client_id
) f
LEFT JOIN "order" o ON o.client_id = f.client_id
                    AND o.order_at > f.premier
                    AND o.state IN ('paid', 'shipped', 'delivered');

-- Defi 20
-- Quelles paires de variantes sont les plus fréquentes dans une même commande ? Comptez chaque paire une fois par commande
SELECT v1.name AS variante_1, v2.name AS variante_2, COUNT(DISTINCT a.order_id) AS nb_commandes
FROM cart_variant a
JOIN cart_variant b ON b.order_id = a.order_id AND a.variant_id < b.variant_id
JOIN variant v1 ON v1.id = a.variant_id
JOIN variant v2 ON v2.id = b.variant_id
GROUP BY v1.name, v2.name
ORDER BY nb_commandes DESC
LIMIT 50;