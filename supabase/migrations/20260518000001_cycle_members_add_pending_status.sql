-- Extend the status check constraint to allow 'pending' applications
ALTER TABLE public.accountability_cycle_members
  DROP CONSTRAINT accountability_cycle_members_status_check;

ALTER TABLE public.accountability_cycle_members
  ADD CONSTRAINT accountability_cycle_members_status_check
  CHECK (status IN ('invited', 'joined', 'pending'));
