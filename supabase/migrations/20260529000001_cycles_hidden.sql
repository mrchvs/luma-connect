-- Add hidden flag to accountability_cycles
ALTER TABLE accountability_cycles ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
