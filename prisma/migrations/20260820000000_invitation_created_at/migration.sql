-- Better Auth 1.6 createInvitation writes `createdAt`. The original
-- invitation table omitted it, so tenant invites failed with
-- PrismaClientValidationError (Unknown argument `createdAt`).
ALTER TABLE "invitation" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
