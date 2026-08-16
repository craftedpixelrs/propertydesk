-- Per-user UI language. Existing accounts keep Serbian.
ALTER TABLE "user" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'sr-Latn';
