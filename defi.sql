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