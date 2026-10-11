-- Read-only inventory before linking/applying migrations. Never reads life records.
begin read only;
select jsonb_build_object(
  'database_name', current_database(),
  'postgres_version', current_setting('server_version'),
  'tables', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select schemaname, tablename from pg_tables
    where schemaname in ('public', 'private', 'supabase_migrations') order by 1, 2
  ) t),
  'functions', (select coalesce(jsonb_agg(f), '[]'::jsonb) from (
    select n.nspname as schema_name, p.proname as function_name
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') order by 1, 2
  ) f),
  'photo_bucket', (select coalesce(jsonb_agg(b), '[]'::jsonb) from (
    select id, public, file_size_limit, allowed_mime_types
    from storage.buckets where id = 'loveapp-photos'
  ) b),
  'policies', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
    select schemaname, tablename, policyname from pg_policies
    where schemaname in ('public', 'private') or (schemaname = 'storage' and policyname like 'loveapp_%')
    order by 1, 2, 3
  ) p)
) as inventory;
commit;
