-- Progressive login lockout (3 fails → 30m / 1h / 6h / 12h / 24h / suspend).
ALTER TABLE "user" ADD COLUMN "loginFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "loginLockLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "loginLockedUntil" TIMESTAMP(3);

CREATE INDEX "user_loginLockLevel_idx" ON "user"("loginLockLevel");
