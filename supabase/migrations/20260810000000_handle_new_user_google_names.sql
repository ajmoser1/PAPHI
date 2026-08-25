-- Auth trigger creates a stub profile on every signup. Google metadata uses
-- given_name / family_name / name rather than first_name / last_name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name text := COALESCE(meta->>'full_name', meta->>'name', '');
  given_name text := COALESCE(meta->>'given_name', meta->>'first_name', '');
  family_name text := COALESCE(meta->>'family_name', meta->>'last_name', '');
  first_name text;
  last_name text;
BEGIN
  IF given_name <> '' OR family_name <> '' THEN
    first_name := given_name;
    last_name := family_name;
  ELSIF full_name <> '' THEN
    first_name := split_part(full_name, ' ', 1);
    last_name := NULLIF(btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '');
    last_name := COALESCE(last_name, '');
  ELSE
    first_name := '';
    last_name := '';
  END IF;

  -- Never take role from auth metadata (client-controlled).
  INSERT INTO public.profiles (id, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    first_name,
    last_name,
    'pending',
    'pending_approval'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;
