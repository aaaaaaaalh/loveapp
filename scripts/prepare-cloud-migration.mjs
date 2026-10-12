import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// Generates reviewable CLI query files only; never connects to a database.
// Used when db push cannot reach Postgres TCP. Run the rollback file first,
// verify an empty inventory, then apply through the official db query CLI.
const root = resolve(import.meta.dirname, '..')
const migration = process.argv[2] ?? '202610100001_private_space'
if (!/^\d{12}_[a-z_]+$/.test(migration)) throw new Error('Expected a migration name without a path or extension.')
const separator = migration.indexOf('_')
const version = migration.slice(0, separator)
const name = migration.slice(separator + 1)
const source = await readFile(resolve(root, `supabase/migrations/${version}_${name}.sql`), 'utf8')
if (!/\bbegin;/.test(source) || !/commit;\s*$/.test(source)) throw new Error('Expected one explicit migration transaction.')
const body = source.replace(/\bbegin;/, '').replace(/commit;\s*$/, '')
if (body.includes('$love_migration_source$')) throw new Error('SQL delimiter conflict.')
const ledger = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations(version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;
insert into supabase_migrations.schema_migrations(version, name, statements)
values ('${version}', '${name}', array[$love_migration_source$${body}$love_migration_source$]);
select '${version}' as migration_version,
 (select count(*)::int from pg_tables where schemaname='public' and tablename in ('spaces','space_members','photos','letters','wishes','gifts')) as business_tables,
 (select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('spaces','space_members','photos','letters','wishes','gifts')) as all_rls_enabled,
 (select not public from storage.buckets where id='loveapp-photos') as private_photo_bucket;
`
await mkdir(resolve(root, '.tmp'), { recursive: true })
for (const [mode, ending] of [['plan', 'rollback'], ['apply', 'commit']]) {
  await writeFile(resolve(root, `.tmp/migration-${mode}.sql`), `begin;\nset local lock_timeout = '5s';\nset local statement_timeout = '30s';\n${body}\n${ledger}\n${ending};\n`, 'utf8')
}
await writeFile(resolve(root, '.tmp/cloud-migration-source.sha256'), createHash('sha256').update(source).digest('hex'), 'utf8')
console.log('Generated .tmp/migration-plan.sql (ROLLBACK) and migration-apply.sql (COMMIT + migration history). No database changes were made.')
