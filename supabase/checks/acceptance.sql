-- Read-only final inventory; does not expose personal records or credentials.
begin read only;
select jsonb_build_object(
  'migration_applied', exists(select 1 from supabase_migrations.schema_migrations where version = '202610100001'),
  'business_tables', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('spaces','space_members','photos','letters','wishes','gifts')),
  'all_rls_enabled', (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('spaces','space_members','photos','letters','wishes','gifts')),
  'photo_bucket_private', (select not public from storage.buckets where id = 'loveapp-photos'),
  'realtime_tables', (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('spaces','space_members','photos','letters','wishes','gifts')),
  'remaining_qa_accounts', (select count(*) from auth.users where coalesce(raw_app_meta_data->>'loveapp_qa_run', raw_user_meta_data->>'loveapp_qa_run', '') like 'loveapp-qa-%'),
  'spaces', (select count(*) from public.spaces),
  'photos', (select count(*) from public.photos),
  'letters', (select count(*) from public.letters),
  'wishes', (select count(*) from public.wishes),
  'gifts', (select count(*) from public.gifts),
  'stored_photos', (select count(*) from storage.objects where bucket_id = 'loveapp-photos')
) as acceptance;
commit;
