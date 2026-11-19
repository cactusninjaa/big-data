-- 1. BRAND
CREATE TABLE "brand" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL UNIQUE
);

-- 2. CATEGORY (avec auto-référence propre pour les sous-catégories)
CREATE TABLE "category" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "parent_category_id" UUID NULL REFERENCES "category"("id") ON DELETE SET NULL
);

-- 3. PRODUCT
CREATE TABLE "product" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reference" VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "brand_id" UUID NOT NULL REFERENCES "brand"("id") ON DELETE RESTRICT
);

-- Table de liaison N-N : Product <-> Category
CREATE TABLE "product_category" (
    "product_id" UUID NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
    "category_id" UUID NOT NULL REFERENCES "category"("id") ON DELETE CASCADE,
    PRIMARY KEY ("product_id", "category_id")
);

-- 4. VARIANT
CREATE TABLE "variant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reference" VARCHAR(255) NOT NULL UNIQUE,
    "size" VARCHAR(255) NOT NULL,
    "color" VARCHAR(255) NOT NULL,
    "product_id" UUID NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(255) NOT NULL
);

-- 5. PRICE (historique des prix + prix actif par variante)
CREATE TABLE "price" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "value" DOUBLE PRECISION NOT NULL,
    "variant_id" UUID NOT NULL REFERENCES "variant"("id") ON DELETE CASCADE,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'EUR' CHECK ("currency" IN ('EUR', 'USD', 'GBP'))
);

-- 6. USER
CREATE TABLE "user" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstname" VARCHAR(255) NOT NULL,
    "lastname" VARCHAR(255) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "default_address_id" UUID NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NULL
);
COMMENT ON COLUMN "user"."password" IS 'hasher le password';

-- 7. ADDRESS
CREATE TABLE "address" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "zip_code" VARCHAR(255) NOT NULL,
    "street_name" VARCHAR(255) NOT NULL,
    "number" VARCHAR(255) NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "country" VARCHAR(255) NOT NULL
);

-- Ajout de la FK default_address_id sur user maintenant que address existe
ALTER TABLE "user"
    ADD CONSTRAINT "user_default_address_foreign"
    FOREIGN KEY ("default_address_id") REFERENCES "address"("id") ON DELETE SET NULL;

-- 8. DISCOUNT
CREATE TABLE "discount" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "discount_percent" INTEGER NOT NULL CHECK ("discount_percent" BETWEEN 1 AND 100),
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "end_date" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "variant_allowed_id" UUID NULL REFERENCES "variant"("id") ON DELETE CASCADE,
    "category_allowed_id" UUID NULL REFERENCES "category"("id") ON DELETE CASCADE,
    "is_cart_available" BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. PROMO_CODE
CREATE TABLE "promo_code" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL UNIQUE,
    "discount_id" UUID NOT NULL REFERENCES "discount"("id") ON DELETE CASCADE,
    "max_usage" INTEGER NULL,
    "usage_counter" INTEGER NOT NULL DEFAULT 0
);

-- Tables de liaison pour les restrictions et utilisations de codes promo
CREATE TABLE "promo_code_restricted_client" (
    "promo_code_id" UUID NOT NULL REFERENCES "promo_code"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    PRIMARY KEY ("promo_code_id", "user_id")
);

CREATE TABLE "promo_code_excluded_client" (
    "promo_code_id" UUID NOT NULL REFERENCES "promo_code"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    PRIMARY KEY ("promo_code_id", "user_id")
);

CREATE TABLE "user_promo_used" (
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "promo_code_id" UUID NOT NULL REFERENCES "promo_code"("id") ON DELETE CASCADE,
    "used_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("user_id", "promo_code_id")
);

-- 10. CART
CREATE TABLE "cart" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE
);

-- 11. ADDRESS_ORDER (snapshot de l'adresse au moment de la commande)
CREATE TABLE "address_order" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "zip_code" VARCHAR(255) NOT NULL,
    "street_name" VARCHAR(255) NOT NULL,
    "number" VARCHAR(255) NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "country" VARCHAR(255) NOT NULL
);

-- 12. ORDER
CREATE TABLE "order" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    "state" VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    "client_id" UUID NULL REFERENCES "user"("id") ON DELETE SET NULL,
    "email" VARCHAR(255) NULL,
    "phone" VARCHAR(255) NULL,
    "firstname" VARCHAR(255) NULL,
    "lastname" VARCHAR(255) NULL,
    "address_order_id" UUID NOT NULL REFERENCES "address_order"("id") ON DELETE RESTRICT,
    "promo_code_id" UUID NULL REFERENCES "promo_code"("id") ON DELETE SET NULL
);

-- 13. CART_VARIANT (lignes d'articles dans un panier ou une commande)
CREATE TABLE "cart_variant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cart_id" UUID NULL REFERENCES "cart"("id") ON DELETE CASCADE,
    "order_id" UUID NULL REFERENCES "order"("id") ON DELETE CASCADE,
    "variant_id" UUID NOT NULL REFERENCES "variant"("id") ON DELETE RESTRICT,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0)
);