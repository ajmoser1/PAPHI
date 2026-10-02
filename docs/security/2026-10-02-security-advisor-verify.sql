-- Post-migration verification for 20261002000000_security_advisor_warnings.sql
-- READ-ONLY. Paste into the Supabase SQL Editor and run. Every row should say PASS.
-- Checks 1-4 mirror the Security Advisor lints 0014, 0024, 0028 and 0029
-- (github.com/supabase/splinter), so a PASS here predicts a clean advisor run.
with
exposed_schemas as (
  select trim(s) as nspname
  from unnest(string_to_array(coalesce(
    (select split_part(c, '=', 2) from pg_db_role_setting r cross join lateral unnest(r.setconfig) c
      where c like 'pgrst.db_schemas=%' limit 1),
    'public'), ',')) s
),
definer_exposed as (
  select n.nspname, p.oid, p.proname,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname in (select nspname from exposed_schemas)
    and n.nspname not in ('auth','extensions','graphql','graphql_public','pg_catalog','realtime','storage','vault','information_schema')
),
checks(n, check_name, expected, actual) as (
  select 1, 'pg_trgm not in public (lint 0014)', 'extensions or not installed',
    coalesce((select case when extnamespace::regnamespace::text = 'public' then 'public' else 'extensions or not installed' end
              from pg_extension where extname = 'pg_trgm'), 'extensions or not installed')
  union all
  select 2, 'No always-true INSERT/UPDATE/DELETE policy for client roles (lint 0024)', 'none',
    coalesce((select string_agg(schemaname || '.' || tablename || '.' || policyname, ', ') from pg_policies
              where permissive = 'PERMISSIVE'
                and cmd in ('INSERT','UPDATE','DELETE','ALL')
                and roles && array['public'::name, 'anon'::name, 'authenticated'::name]
                and (
                  regexp_replace(lower(coalesce(qual, '')), '[\s()]', '', 'g') in ('true','1=1')
                  or regexp_replace(lower(coalesce(with_check, '')), '[\s()]', '', 'g') in ('true','1=1')
                )), 'none')
  union all
  select 3, 'No SECURITY DEFINER function in an exposed schema executable by anon (lint 0028)', 'none',
    coalesce((select string_agg(nspname || '.' || proname || '(' || args || ')', ', ') from definer_exposed
              where has_function_privilege('anon', oid, 'EXECUTE')), 'none')
  union all
  select 4, 'No SECURITY DEFINER function in an exposed schema executable by authenticated (lint 0029)', 'none',
    coalesce((select string_agg(nspname || '.' || proname || '(' || args || ')', ', ') from definer_exposed
              where has_function_privilege('authenticated', oid, 'EXECUTE')), 'none')
  union all
  select 5, 'RLS helpers live in private', 'can_message, can_view_profile, viewer_chapter_id, viewer_is_active',
    coalesce((select string_agg(proname, ', ' order by proname) from pg_proc
              where pronamespace = to_regnamespace('private')
                and proname in ('viewer_chapter_id','viewer_is_active','can_view_profile','can_message')), 'none')
  union all
  select 6, 'RLS helpers no longer in public', 'none',
    coalesce((select string_agg(proname, ', ' order by proname) from pg_proc
              where pronamespace = 'public'::regnamespace
                and proname in ('viewer_chapter_id','viewer_is_active','can_view_profile','can_message')), 'none')
  union all
  select 7, 'authenticated can still run the RLS helpers', 'true',
    (select bool_and(has_function_privilege('authenticated', oid, 'EXECUTE'))::text from pg_proc
      where pronamespace = to_regnamespace('private')
        and proname in ('viewer_chapter_id','viewer_is_active','can_view_profile','can_message'))
  union all
  select 8, 'private is not an exposed API schema', 'not exposed',
    case when exists (select 1 from exposed_schemas where nspname = 'private') then 'EXPOSED' else 'not exposed' end
  union all
  select 9, 'Policies still reference the helpers (by OID, now rendered as private.*)', '> 0',
    case when (select count(*) from pg_policies
               where coalesce(qual, '') ~ 'private\.(can_view_profile|can_message|viewer_chapter_id|viewer_is_active)'
                  or coalesce(with_check, '') ~ 'private\.(can_view_profile|can_message|viewer_chapter_id|viewer_is_active)') > 0
         then '> 0' else '0' end
  union all
  select 10, 'No function body still names a helper via public.*', 'none',
    coalesce((select string_agg(oid::regprocedure::text, ', ') from pg_proc
              where pronamespace not in ('pg_catalog'::regnamespace, 'information_schema'::regnamespace)
                and prosrc ~ '\mpublic\.(viewer_chapter_id|viewer_is_active|can_view_profile|can_message)\s*\('), 'none')
  union all
  select 11, 'chapter_requests: no client-role privileges, no policies', 'none',
    coalesce((select string_agg(x, ', ') from (
      select r || ' ' || p as x
      from (values ('anon'), ('authenticated')) roles(r),
           (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) privs(p)
      where has_table_privilege(r, 'public.chapter_requests', p)
      union all
      select 'policy ' || policyname from pg_policies where schemaname = 'public' and tablename = 'chapter_requests'
    ) s), 'none')
  union all
  select 12, 'chapter_requests RLS enabled', 'true',
    (select relrowsecurity::text from pg_class where oid = 'public.chapter_requests'::regclass)
  union all
  select 13, 'get_platform_stats: service_role only', 'service_role only',
    case when has_function_privilege('service_role', 'public.get_platform_stats()', 'EXECUTE')
          and not has_function_privilege('anon', 'public.get_platform_stats()', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.get_platform_stats()', 'EXECUTE')
         then 'service_role only' else 'wrong grants' end
  union all
  select 14, 'handle_new_user: not executable by client roles', 'true',
    (not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
     and not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'))::text
  union all
  select 15, 'handle_new_user trigger still attached', 'attached',
    coalesce((select 'attached' from pg_trigger where tgfoid = 'public.handle_new_user()'::regprocedure limit 1), 'MISSING')
  union all
  select 16, 'search_members uses private helpers and keeps its grants', 'ok',
    case when (select prosrc from pg_proc where oid = 'public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure)
              ~ 'private\.viewer_chapter_id\(\)'
          and has_function_privilege('authenticated', 'public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)', 'EXECUTE')
         then 'ok' else 'wrong' end
)
select n, case when actual = expected then 'PASS' else 'FAIL' end as result, check_name, expected, actual
from checks order by n;
