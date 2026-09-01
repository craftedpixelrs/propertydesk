-- Per-user UI theme. Existing accounts keep light.
ALTER TABLE "user" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
