-- Expand allowed source values to include admin_adjustment
ALTER TABLE public.points_ledger DROP CONSTRAINT points_ledger_source_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_source_check CHECK (source = ANY (ARRAY['attendance'::text, 'manual'::text, 'event'::text, 'admin_adjustment'::text]));
