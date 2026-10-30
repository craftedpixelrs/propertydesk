-- Faza 11 — resident-shared documents.
-- Adds RESIDENT_SHARED to DocumentVisibility so operators can mark a
-- document as readable through the resident (stanar) portal. All existing
-- rows stay at their current visibility.

ALTER TYPE "DocumentVisibility" ADD VALUE IF NOT EXISTS 'RESIDENT_SHARED';
