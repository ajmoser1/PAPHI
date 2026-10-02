-- Post-migration verification for 20261001000000_security_audit_fixes.sql
-- READ-ONLY. Paste into the Supabase SQL Editor and run. Every row should say PASS.
-- Any FAIL row shows what was found in the "actual" column.
with
known_messaging(tablename, policyname, cmd) as (values
  ('conversations', 'Authenticated users can create conversations', 'INSERT'),
  ('conversations', 'Participants can view their conversations',    'SELECT'),
  ('messages',      'Participants can send messages',               'INSERT'),
  ('messages',      'Participants can view messages',               'SELECT'),
  ('messages',      'Senders can soft-delete own messages',         'UPDATE')
),
priv(p) as (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')),
unexpected_privs as (
  select r.role || ' ' || priv.p || ' ' || a.attrelid::regclass::text || '.' || a.attname as item
  from (values ('anon'), ('authenticated')) r(role)
  cross join priv
  join pg_attribute a
    on a.attrelid in ('public.chapters'::regclass, 'public.messages'::regclass, 'public.conversations'::regclass)
   and a.attnum > 0 and not a.attisdropped
  where has_column_privilege(r.role, a.attrelid, a.attname, priv.p)
    and not (
         (a.attrelid = 'public.chapters'::regclass and priv.p = 'SELECT' and a.attname in
           ('id','fraternity_id','slug','name','school_name','status','display_title','tagline',
            'logo_url','crest_url','primary_color','accent_color','created_at'))
      or (a.attrelid in ('public.messages'::regclass, 'public.conversations'::regclass)
          and r.role = 'authenticated' and priv.p = 'SELECT')
      or (a.attrelid = 'public.messages'::regclass and r.role = 'authenticated' and priv.p = 'INSERT'
          and a.attname in ('conversation_id','sender_id','body'))
      or (a.attrelid = 'public.conversations'::regclass and r.role = 'authenticated' and priv.p = 'INSERT'
          and a.attname in ('participant_a','participant_b'))
      or (a.attrelid = 'public.messages'::regclass and r.role = 'authenticated' and priv.p = 'UPDATE'
          and a.attname = 'is_deleted')
    )
),
checks(n, check_name, expected, actual) as (
  select 1, 'No policies use is_admin()', 'none',
    coalesce((select string_agg(tablename || '.' || policyname, ', ') from pg_policies
              where qual ilike '%is_admin%' or with_check ilike '%is_admin%'), 'none')
  union all
  select 2, 'Legacy permissive policies gone', 'none',
    coalesce((select string_agg(policyname, ', ') from pg_policies where policyname in
              ('profiles_select_active','positions_select_active_profiles',
               'Active users can view active profiles','Authenticated users can view positions')), 'none')
  union all
  select 3, 'Messaging policies are exactly the 5 expected', 'none unexpected, none missing',
    coalesce((
      select string_agg(x, '; ') from (
        select 'unexpected: ' || p.tablename || '.' || p.policyname || ' (' || p.cmd || ')' as x
        from pg_policies p
        where p.schemaname = 'public' and p.tablename in ('conversations','messages') and p.permissive = 'PERMISSIVE'
          and (p.tablename, p.policyname, p.cmd) not in (select * from known_messaging)
        union all
        select 'missing: ' || k.tablename || '.' || k.policyname
        from known_messaging k
        where not exists (select 1 from pg_policies p where p.schemaname = 'public'
                          and p.tablename = k.tablename and p.policyname = k.policyname and p.cmd = k.cmd)
      ) s), 'none unexpected, none missing')
  union all
  select 4, 'RLS enabled on all affected tables', 'none disabled',
    coalesce((select string_agg(relname, ', ') from pg_class
              where relnamespace = 'public'::regnamespace and not relrowsecurity
                and relname in ('profiles','positions','alumni_contact','chapters','companies',
                                'industries','conversations','messages')), 'none disabled')
  union all
  select 5, 'No unexpected client privileges (chapters/messages/conversations)', 'none',
    coalesce((select string_agg(item, ', ') from unexpected_privs), 'none')
  union all
  select 6, 'No client DELETE/TRUNCATE/UPDATE/REFERENCES/TRIGGER at table level', 'none',
    coalesce((select string_agg(r || ' ' || p || ' ' || t, ', ') from
      (values ('anon'), ('authenticated')) roles(r),
      (values ('messages'), ('conversations'), ('chapters')) tbls(t),
      (values ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('UPDATE')) privs(p)
      where has_table_privilege(r, 'public.' || t, p)
        and not (t = 'messages' and p = 'UPDATE')), 'none')
  union all
  select 7, 'chapters.contact_email / invite_token hidden', 'none readable',
    coalesce((select string_agg(r || '.' || c, ', ') from (values ('anon'), ('authenticated')) r(r),
              (values ('contact_email'), ('invite_token')) c(c)
              where has_column_privilege(r, 'public.chapters', c, 'SELECT')), 'none readable')
  union all
  select 8, 'last_message_at trigger runs as owner', 'true',
    (select prosecdef::text from pg_proc where oid = 'public.update_conversation_last_message()'::regprocedure)
  union all
  select 9, 'Conversations with messages but no last_message_at', '0',
    (select count(*)::text from public.conversations c
     where c.last_message_at is null and exists (select 1 from public.messages m where m.conversation_id = c.id))
  union all
  select 10, 'search_members search_path pinned', 'search_path=public, pg_temp',
    (select array_to_string(proconfig, ',') from pg_proc
     where oid = 'public.search_members(text, uuid, uuid, boolean, uuid, uuid, uuid, integer, integer, text)'::regprocedure)
  union all
  select 11, 'Visibility helpers exist', 'viewer_is_active, can_message',
    -- 20261002000000 moved these from public to private; either location passes.
    (select string_agg(proname, ', ' order by proname desc) from pg_proc
     where pronamespace in ('public'::regnamespace, to_regnamespace('private'))
       and proname in ('viewer_is_active','can_message'))
  union all
  select 12, 'Message length cap installed', 'present',
    coalesce((select 'present' from pg_constraint
              where conrelid = 'public.messages'::regclass and conname = 'messages_body_length'), 'missing')
)
select n, case when actual = expected then 'PASS' else 'FAIL' end as result, check_name, expected, actual
from checks order by n;
