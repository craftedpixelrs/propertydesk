-- Faza 8.1 (A5) — Cost tracking + net margin per project.
--
-- All four cost buckets are optional so the operator only fills in
-- what they know. `computeProjectPnl` sums whatever is non-NULL and
-- subtracts it from `SUM(sale.finalPrice)` to produce the marža panel.

ALTER TABLE "project"
    ADD COLUMN "landCost"         DECIMAL(14, 2),
    ADD COLUMN "constructionCost" DECIMAL(14, 2),
    ADD COLUMN "marketingCost"    DECIMAL(14, 2),
    ADD COLUMN "otherCost"        DECIMAL(14, 2),
    ADD COLUMN "budgetNote"       TEXT;
