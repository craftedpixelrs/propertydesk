-- Who a public unit link was created for, so agents can tell them apart.

ALTER TABLE "share_link" ADD COLUMN "forBuyerId" TEXT;
ALTER TABLE "share_link" ADD COLUMN "forBuyerName" TEXT;

CREATE INDEX "share_link_forBuyerId_idx" ON "share_link"("forBuyerId");

ALTER TABLE "share_link" ADD CONSTRAINT "share_link_forBuyerId_fkey" FOREIGN KEY ("forBuyerId") REFERENCES "buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
