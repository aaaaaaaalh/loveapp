-- Apply through Supabase CLI migration history. No sample life records.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name_a text not null check (length(btrim(name_a)) between 1 and 20),
  name_b text not null check (length(btrim(name_b)) between 1 and 20),
  start_date date check (start_date between date '1900-01-01' and current_date),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0, 1)),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  unique (space_id, slot),
  unique (user_id)
);

create table private.space_invites (
  token_hash text primary key,
  space_id uuid not null unique references public.spaces(id) on delete cascade,
  expires_at timestamptz not null
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_id uuid not null,
  storage_path text not null unique,
  description text not null default '' check (length(description) <= 120),
  photo_date date not null check (photo_date <= current_date),
  ratio double precision not null check (ratio > 0 and ratio < 100),
  created_at timestamptz not null default now(),
  unique (space_id, id),
  foreign key (space_id, author_id) references public.space_members(space_id, user_id),
  check (storage_path like space_id::text || '/' || author_id::text || '/%')
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_id uuid not null,
  content text not null check (length(btrim(content)) between 1 and 2000),
  tone text not null default 'cream' check (tone in ('cream', 'rose', 'sage')),
  created_at timestamptz not null default now(),
  foreign key (space_id, author_id) references public.space_members(space_id, user_id)
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 60),
  description text not null default '' check (length(description) <= 500),
  status text not null default 'todo' check (status in ('todo', 'planned', 'done')),
  completed_at date check (completed_at <= current_date),
  completion_photo_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (space_id, author_id) references public.space_members(space_id, user_id),
  foreign key (space_id, completion_photo_id) references public.photos(space_id, id),
  check (status = 'done' or (completed_at is null and completion_photo_id is null))
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null,
  owner_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 60),
  image text not null default '/images/gift-placeholder.svg' check (length(image) <= 2000 and (image = '/images/gift-placeholder.svg' or image ~ '^https?://')),
  price numeric(12, 2) check (price between 0 and 10000000),
  link text not null default '' check (length(link) <= 2000 and (link = '' or link ~ '^https?://')),
  note text not null default '' check (length(note) <= 500),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (space_id, created_by) references public.space_members(space_id, user_id),
  foreign key (space_id, owner_id) references public.space_members(space_id, user_id)
);

create index photos_space_date on public.photos(space_id, photo_date desc);
create index letters_space_date on public.letters(space_id, created_at desc);
create index wishes_space_date on public.wishes(space_id, created_at desc);
create index gifts_space_owner on public.gifts(space_id, owner_id);

create function private.is_member(p_space_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_members where space_id = p_space_id and user_id = (select auth.uid()));
$$;
revoke all on function private.is_member(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;

create function private.can_read_file(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_members where space_id::text = split_part(p_path, '/', 1) and user_id = (select auth.uid()));
$$;
revoke all on function private.can_read_file(text) from public;
grant execute on function private.can_read_file(text) to authenticated;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table private.space_invites enable row level security;
alter table public.photos enable row level security;
alter table public.letters enable row level security;
alter table public.wishes enable row level security;
alter table public.gifts enable row level security;

revoke all on public.spaces, public.space_members, public.photos, public.letters, public.wishes, public.gifts from public, anon, authenticated;
revoke all on private.space_invites from public, anon, authenticated;
grant select on public.spaces, public.space_members, public.photos, public.letters, public.wishes, public.gifts to authenticated;
grant insert (space_id, author_id, storage_path, description, photo_date, ratio) on public.photos to authenticated;
grant insert (space_id, author_id, content, tone) on public.letters to authenticated;
grant insert (space_id, author_id, title, description, status, completed_at, completion_photo_id) on public.wishes to authenticated;
grant insert (space_id, created_by, owner_id, name, image, price, link, note, priority) on public.gifts to authenticated;
grant delete on public.wishes, public.gifts to authenticated;
grant update (title, description, status, completed_at, completion_photo_id, updated_at) on public.wishes to authenticated;
grant update (name, image, price, link, note, owner_id, priority, updated_at) on public.gifts to authenticated;

create policy spaces_read on public.spaces for select to authenticated using (private.is_member(id));
create policy members_read on public.space_members for select to authenticated using (private.is_member(space_id));
create policy photos_read on public.photos for select to authenticated using (private.is_member(space_id));
create policy photos_create on public.photos for insert to authenticated with check (private.is_member(space_id) and author_id = (select auth.uid()));
create policy letters_read on public.letters for select to authenticated using (private.is_member(space_id));
create policy letters_create on public.letters for insert to authenticated with check (private.is_member(space_id) and author_id = (select auth.uid()));
create policy wishes_read on public.wishes for select to authenticated using (private.is_member(space_id));
create policy wishes_create on public.wishes for insert to authenticated with check (private.is_member(space_id) and author_id = (select auth.uid()));
create policy wishes_update on public.wishes for update to authenticated using (private.is_member(space_id)) with check (private.is_member(space_id));
create policy wishes_delete on public.wishes for delete to authenticated using (private.is_member(space_id));
create policy gifts_read on public.gifts for select to authenticated using (private.is_member(space_id));
create policy gifts_create on public.gifts for insert to authenticated with check (private.is_member(space_id) and created_by = (select auth.uid()));
create policy gifts_update on public.gifts for update to authenticated using (private.is_member(space_id)) with check (private.is_member(space_id));
create policy gifts_delete on public.gifts for delete to authenticated using (private.is_member(space_id));

create function public.create_space(p_my_name text, p_partner_name text, p_start_date date default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  if exists (select 1 from public.space_members where user_id = auth.uid()) then raise exception '你已经有一个空间了。'; end if;
  insert into public.spaces(name_a, name_b, start_date, created_by) values (btrim(p_my_name), btrim(p_partner_name), p_start_date, auth.uid()) returning id into v_id;
  insert into public.space_members(space_id, user_id, slot) values (v_id, auth.uid(), 0);
  return v_id;
end;
$$;

create function public.update_space_profile(p_space_id uuid, p_my_name text, p_partner_name text, p_start_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare v_slot smallint;
begin
  select slot into v_slot from public.space_members where space_id = p_space_id and user_id = auth.uid();
  if v_slot is null then raise exception '你还没有加入这个空间。'; end if;
  update public.spaces set name_a = btrim(case when v_slot = 0 then p_my_name else p_partner_name end), name_b = btrim(case when v_slot = 0 then p_partner_name else p_my_name end), start_date = p_start_date, updated_at = now() where id = p_space_id;
end;
$$;

create function public.create_space_invite(p_space_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  perform 1 from public.spaces where id = p_space_id for update;
  if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid() and slot = 0) then raise exception '只有创建空间的人可以生成邀请码。'; end if;
  if (select count(*) from public.space_members where space_id = p_space_id) >= 2 then raise exception '你们已经在同一个空间了。'; end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  delete from private.space_invites where space_id = p_space_id;
  insert into private.space_invites(token_hash, space_id, expires_at) values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_space_id, now() + interval '7 days');
  return v_token;
end;
$$;

create function public.join_space(p_code text, p_nickname text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_hash text;
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  if exists (select 1 from public.space_members where user_id = auth.uid()) then raise exception '你已经有一个空间了。'; end if;
  v_hash := encode(sha256(convert_to(btrim(p_code), 'UTF8')), 'hex');
  select space_id into v_id from private.space_invites where token_hash = v_hash;
  if v_id is null then raise exception '邀请码无效或已经使用，请让对方重新生成。'; end if;
  perform 1 from public.spaces where id = v_id for update;
  if not exists (select 1 from private.space_invites where token_hash = v_hash and space_id = v_id and expires_at > now()) then raise exception '邀请码已失效，请让对方重新生成。'; end if;
  if (select count(*) from public.space_members where space_id = v_id) >= 2 then raise exception '这个空间已经有两个人了。'; end if;
  insert into public.space_members(space_id, user_id, slot) values (v_id, auth.uid(), 1);
  update public.spaces set name_b = btrim(p_nickname), updated_at = now() where id = v_id;
  delete from private.space_invites where space_id = v_id;
  return v_id;
end;
$$;

revoke all on function public.create_space(text, text, date), public.update_space_profile(uuid, text, text, date), public.create_space_invite(uuid), public.join_space(text, text) from public, anon;
grant execute on function public.create_space(text, text, date), public.update_space_profile(uuid, text, text, date), public.create_space_invite(uuid), public.join_space(text, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('loveapp-photos', 'loveapp-photos', false, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

create policy loveapp_photo_read on storage.objects for select to authenticated
using (bucket_id = 'loveapp-photos' and private.can_read_file(name));
create policy loveapp_photo_upload on storage.objects for insert to authenticated
with check (bucket_id = 'loveapp-photos' and private.can_read_file(name) and split_part(name, '/', 2) = (select auth.uid())::text);
-- Roll back an uploaded file only when no saved photo record references it.
create policy loveapp_photo_cleanup on storage.objects for delete to authenticated
using (bucket_id = 'loveapp-photos' and private.can_read_file(name) and split_part(name, '/', 2) = (select auth.uid())::text and not exists (select 1 from public.photos where storage_path = name));

do $$
declare v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach v_table in array array['spaces', 'space_members', 'photos', 'letters', 'wishes', 'gifts'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

commit;
