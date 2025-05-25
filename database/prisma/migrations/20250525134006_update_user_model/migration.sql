-- Update User model to remove email/password and add steamId
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" ADD COLUMN "steamId" TEXT;

