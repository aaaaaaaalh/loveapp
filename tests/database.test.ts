import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Real PostgreSQL execution in memory, with minimal Supabase auth/storage
// schemas. This tests SQL/RLS, not the hosted Auth or Storage HTTP services.
test('private-space migration and database permissions', async t => {
  const db = new PGlite()
  const a = '11111111-1111-4111-8111-111111111111'
  const b = '22222222-2222-4222-8222-222222222222'
  const c = '33333333-3333-4333-8333-333333333333'
  await db.exec(`
    create role anon; create role authenticated;
    grant usage on schema public to anon, authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${a}'), ('${b}'), ('${c}');
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select on storage.objects to anon;
    grant select, insert, delete on storage.objects to authenticated;
  `)
  await db.exec(await readFile('supabase/migrations/202610100001_private_space.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/202610120001_join_existing_space.sql', 'utf8'))
  const asUser = async (id: string | null) => {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
    await db.exec(`set role ${id ? 'authenticated' : 'anon'}`)
  }
  let space = ''
  let otherSpace = ''
  let code = ''
  let wishId = ''
  let foreignPhoto = ''
  try {
    await t.test('creates an empty space with supplied names and date', async () => {
      await asUser(a)
      const result = await db.query<{ id: string }>("select public.create_space('石若瀚', '张潋镕', '2026-04-20') as id")
      space = result.rows[0].id
      const profile = await db.query<{ name_a: string; name_b: string }>('select name_a,name_b from public.spaces')
      assert.deepEqual(profile.rows, [{ name_a: '石若瀚', name_b: '张潋镕' }])
      for (const table of ['photos', 'letters', 'wishes', 'gifts']) assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0)
      await assert.rejects(() => db.query("select public.create_space('另一个我', '另一个她', null)"), /已经有一个空间/)
    })
    await t.test('anonymous and outsiders cannot read or modify the private space', async () => {
      await asUser(null)
      await assert.rejects(() => db.query('select * from public.spaces'), /permission denied/)
      await assert.rejects(() => db.query("select public.create_space('我', '你', null)"), /permission denied/)
      await asUser(c)
      assert.equal((await db.query('select * from public.spaces')).rows.length, 0)
      assert.equal((await db.query('select * from public.space_members')).rows.length, 0)
      await assert.rejects(() => db.query('select public.update_space_profile($1, $2, $3, null)', [space, '冒充', '入侵']), /没有加入/)
      await assert.rejects(() => db.query('insert into public.space_members(space_id,user_id,slot) values ($1,$2,1)', [space, c]), /permission denied/)
      await assert.rejects(() => db.query('select * from private.space_invites'), /permission denied/)
    })
    await t.test('invites rotate, expire, are single-use and admit only the second member', async () => {
      await asUser(a)
      const old = (await db.query<{ code: string }>('select public.create_space_invite($1) as code', [space])).rows[0].code
      code = (await db.query<{ code: string }>('select public.create_space_invite($1) as code', [space])).rows[0].code
      assert.equal(code.length, 64)
      assert.notEqual(old, code)
      await asUser(b)
      await assert.rejects(() => db.query('select public.join_space($1,$2)', [old, '张潋镕']), /邀请码无效/)
      await db.exec('reset role')
      await db.query("update private.space_invites set expires_at = now() - interval '1 minute' where space_id = $1", [space])
      await asUser(b)
      await assert.rejects(() => db.query('select public.join_space($1,$2)', [code, '张潋镕']), /已失效/)
      await asUser(a)
      code = (await db.query<{ code: string }>('select public.create_space_invite($1) as code', [space])).rows[0].code
      await asUser(b)
      assert.equal((await db.query<{ id: string }>('select public.join_space($1,$2) as id', [code, '张潋镕'])).rows[0].id, space)
      assert.equal((await db.query('select * from public.space_members')).rows.length, 2)
      await asUser(c)
      await assert.rejects(() => db.query('select public.join_space($1,$2)', [code, '第三个人']), /邀请码无效/)
      await asUser(a)
      await assert.rejects(() => db.query('select public.create_space_invite($1)', [space]), /已经在同一个空间/)
    })
    await t.test('members share records while authorship cannot be forged', async () => {
      await asUser(a)
      await db.query('insert into public.letters(space_id,author_id,content) values ($1,$2,$3)', [space, a, '权限测试文字'])
      await assert.rejects(() => db.query('insert into public.letters(space_id,author_id,content) values ($1,$2,$3)', [space, b, '伪造作者']), /row-level security/)
      await assert.rejects(() => db.query('insert into public.letters(space_id,author_id,content,created_at) values ($1,$2,$3,now())', [space, a, '伪造发布时间']), /permission denied/)
      await assert.rejects(() => db.query('insert into public.letters(id,space_id,author_id,content) values ($1,$2,$3,$4)', [c, space, a, '自行指定记录编号']), /permission denied/)
      wishId = (await db.query<{ id: string }>('insert into public.wishes(space_id,author_id,title) values ($1,$2,$3) returning id', [space, a, '测试愿望'])).rows[0].id
      await asUser(b)
      assert.equal((await db.query('select * from public.letters')).rows.length, 1)
      await db.query("update public.wishes set status = 'done', completed_at = current_date where id = $1", [wishId])
      await assert.rejects(() => db.query('update public.wishes set author_id = $1 where id = $2', [b, wishId]), /permission denied/)
      await db.query('insert into public.gifts(space_id,created_by,owner_id,name) values ($1,$2,$3,$4)', [space, b, a, '送给对方的测试心愿'])
    })
    await t.test('foreign space records and completion photos cannot cross space boundaries', async () => {
      await asUser(c)
      otherSpace = (await db.query<{ id: string }>("select public.create_space('外部我', '外部她', null) as id")).rows[0].id
      assert.equal((await db.query('select * from public.letters')).rows.length, 0)
      assert.equal((await db.query('delete from public.wishes where id = $1 returning id', [wishId])).rows.length, 0)
      foreignPhoto = (await db.query<{ id: string }>('insert into public.photos(space_id,author_id,storage_path,photo_date,ratio) values ($1,$2,$3,current_date,1) returning id', [otherSpace, c, `${otherSpace}/${c}/external.jpg`])).rows[0].id
      await asUser(b)
      await assert.rejects(() => db.query('update public.wishes set completion_photo_id = $1 where id = $2', [foreignPhoto, wishId]), /foreign key/)
      await assert.rejects(() => db.query('insert into public.gifts(space_id,created_by,owner_id,name) values ($1,$2,$3,$4)', [space, b, c, '外部主人']), /foreign key/)
    })
    await t.test('private files enforce membership, uploader paths and safe rollback', async () => {
      const savedPath = `${space}/${a}/saved.jpg`
      const pendingPath = `${space}/${a}/pending.jpg`
      await asUser(a)
      await db.query("insert into storage.objects(bucket_id,name) values ('loveapp-photos',$1),('loveapp-photos',$2)", [savedPath, pendingPath])
      await db.query('insert into public.photos(space_id,author_id,storage_path,photo_date,ratio) values ($1,$2,$3,current_date,1)', [space, a, savedPath])
      assert.equal((await db.query('delete from storage.objects where name = $1 returning id', [savedPath])).rows.length, 0)
      assert.equal((await db.query('delete from storage.objects where name = $1 returning id', [pendingPath])).rows.length, 1)
      await asUser(b)
      assert.equal((await db.query('select * from storage.objects')).rows.length, 1)
      assert.equal((await db.query('delete from storage.objects where name = $1 returning id', [savedPath])).rows.length, 0)
      await assert.rejects(() => db.query("insert into storage.objects(bucket_id,name) values ('loveapp-photos',$1)", [`${space}/${a}/forged.jpg`]), /row-level security/)
      await asUser(c)
      assert.equal((await db.query('select * from storage.objects')).rows.length, 0)
      await asUser(null)
      assert.equal((await db.query('select * from storage.objects')).rows.length, 0)
    })
    await t.test('profile mapping respects both members and optional dates', async () => {
      await asUser(b)
      await db.query('select public.update_space_profile($1,$2,$3,null)', [space, '女友更新昵称', '男友更新昵称'])
      const row = (await db.query<{ name_a: string; name_b: string; start_date: null }>('select name_a,name_b,start_date from public.spaces')).rows[0]
      assert.deepEqual(row, { name_a: '男友更新昵称', name_b: '女友更新昵称', start_date: null })
      await assert.rejects(() => db.query('select public.update_space_profile($1,$2,$3,null)', [space, '', '有效']), /check constraint/)
    })
    await t.test('existing solo space is preserved when joining, invalid invites roll back and switching is private', async () => {
      const d = '44444444-4444-4444-8444-444444444444'
      await db.exec('reset role')
      await db.query('insert into auth.users values ($1)', [d])
      await asUser(d)
      const own = (await db.query<{id: string}>("select public.create_space('原来', '空间', null) as id")).rows[0].id
      await db.query("insert into public.letters(space_id,author_id,content) values ($1,$2,'原有记录')", [own,d])
      const ownCode = (await db.query<{code: string}>('select public.create_space_invite($1) as code',[own])).rows[0].code
      await assert.rejects(() => db.query('select public.join_space($1,$2)',[ownCode,'我']), /已经加入/)
      await assert.rejects(() => db.query("select public.join_space('wrong','我')"), /邀请码无效/)
      assert.equal((await db.query<{space_id: string}>('select space_id from public.space_members where user_id=$1 and is_active',[d])).rows[0].space_id,own)
      await asUser(c)
      const invite = (await db.query<{code: string}>('select public.create_space_invite($1) as code',[otherSpace])).rows[0].code
      await asUser(d)
      await db.query('select public.join_space($1,$2)',[invite,'新昵称'])
      assert.equal((await db.query('select * from public.my_spaces()')).rows.length,2)
      assert.equal((await db.query<{space_id: string}>('select space_id from public.space_members where user_id=$1 and is_active',[d])).rows[0].space_id,otherSpace)
      assert.equal((await db.query('select * from public.letters where space_id=$1',[own])).rows.length,1)
      await db.query('select public.switch_space($1)',[own])
      await assert.rejects(() => db.query('select public.create_space_invite($1)',[own]), /已经有双人空间/)
      await assert.rejects(() => db.query('select public.switch_space($1)',[space]), /没有加入/)
      await asUser(c)
      assert.equal((await db.query('select * from public.letters where space_id=$1',[own])).rows.length,0)
      assert.equal((await db.query('select * from public.my_spaces()')).rows.length,1)
      await asUser(null)
      await assert.rejects(() => db.query('select * from public.my_spaces()'), /permission denied/)
      await assert.rejects(() => db.query('select public.switch_space($1)',[own]), /permission denied/)
    })
  } finally { await db.close() }
})
