-- Follow-up to 20261001000000_security_audit_fixes.sql (2026-10-01).
-- Report: docs/security/2026-10-01-security-audit.md (post-migration verification, check 5/6)
--
-- Supabase's default grants give authenticated ALL privileges on new tables,
-- including REFERENCES and TRIGGER, which the main migration did not revoke on the
-- messaging tables. Neither is usable through the Supabase API (both need DDL, and
-- client roles can't log in to Postgres), but clients need neither.
-- (The main migration file now includes this too, for environments built from scratch.)
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. Single transaction,
-- idempotent, privileges only (no data changes). Then re-run
-- docs/security/2026-10-01-post-migration-verify.sql; every row should be PASS.

BEGIN;
REVOKE REFERENCES, TRIGGER ON TABLE public.messages, public.conversations FROM PUBLIC, anon, authenticated;
DO $$
DECLARE col record;
BEGIN
  FOR col IN
    SELECT a.attrelid::regclass AS tbl, a.attname FROM pg_attribute a
    WHERE a.attrelid IN ('public.messages'::regclass, 'public.conversations'::regclass)
      AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('REVOKE REFERENCES (%I) ON TABLE %s FROM PUBLIC, anon, authenticated', col.attname, col.tbl);
  END LOOP;
END $$;
COMMIT;
