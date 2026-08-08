-- CreateTable
CREATE TABLE "role_permission_override" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "role_permission_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_override_role_permission_key" ON "role_permission_override"("role", "permission");

-- CreateIndex
CREATE INDEX "role_permission_override_role_idx" ON "role_permission_override"("role");
