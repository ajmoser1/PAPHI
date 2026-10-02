-- Pre-migration snapshot for supabase/migrations/20261001000000_security_audit_fixes.sql
-- READ-ONLY. Run in the Supabase SQL Editor BEFORE the migration, then download
-- the result as CSV and keep it with this report. It records the current
-- definitions of everything the migration replaces or revokes, so any of them
-- can be restored:
--   policy      -> a ready-to-run CREATE POLICY statement
--   function    -> the full CREATE OR REPLACE FUNCTION definition
--   table_acl / column_acl -> current grants (Postgres ACL format)
--   constraint  -> current CHECK constraints on messages
select 'policy' as kind, tablename || '.' || policyname as name,
       format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
              policyname, tablename, permissive, cmd, array_to_string(roles, ', '),
              coalesce(' USING (' || qual || ')', ''),
              coalesce(' WITH CHECK (' || with_check || ')', '')) as definition
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','positions','alumni_contact','companies','industries','conversations','messages','chapters')
union all
select 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid)
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('viewer_is_active','can_view_profile','can_message','search_members','handle_new_user','viewer_chapter_id','is_admin')
union all
select 'table_acl', c.relname, coalesce(c.relacl::text, '(default)')
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relname in ('chapters','messages','conversations')
union all
select 'column_acl', c.relname || '.' || a.attname, a.attacl::text
from pg_attribute a join pg_class c on c.oid = a.attrelid
where c.relnamespace = 'public'::regnamespace and c.relname in ('chapters','messages','conversations')
  and a.attnum > 0 and not a.attisdropped and a.attacl is not null
union all
select 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.messages'::regclass and contype = 'c'
order by 1, 2;
