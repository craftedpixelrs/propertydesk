-- GDPR anonymisation marker. Personal fields are wiped in the
-- application; this timestamp is the proof the wipe already ran.
ALTER TABLE "buyer" ADD COLUMN "anonymizedAt" TIMESTAMP(3);
