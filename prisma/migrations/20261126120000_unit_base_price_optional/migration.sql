-- Units can be imported before a price is known.
ALTER TABLE "unit" ALTER COLUMN "basePrice" DROP NOT NULL;

-- Price history must record a change that starts from, or stays at, an empty price.
ALTER TABLE "unit_price_history" ALTER COLUMN "previousBasePrice" DROP NOT NULL;
ALTER TABLE "unit_price_history" ALTER COLUMN "newBasePrice" DROP NOT NULL;
