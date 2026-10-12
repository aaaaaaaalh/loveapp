begin;

-- Keep memberships and their records intact. Only the selected space changes.
alter table public.space_members add column is_active boolean not null default true;
alter table public.space_members drop constraint space_members_user_id_key;
create unique index space_members_one_active on public.space_members(user_id) where is_active;

create or replace function public.join_space(p_code text, p_nickname text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_hash text; v_old uuid;
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if length(btrim(p_nickname)) not between 1 and 20 then raise exception '昵称需要 1 到 20 个字。'; end if;
  v_hash := encode(sha256(convert_to(btrim(p_code), 'UTF8')), 'hex');
  select space_id into v_id from private.space_invites where token_hash = v_hash;
  if v_id is null then raise exception '邀请码无效或已经使用，请让对方重新生成。'; end if;
  select space_id into v_old from public.space_members where user_id = auth.uid() and is_active;
  -- Stable lock order also protects simultaneous reciprocal invitations.
  perform 1 from public.spaces where id in (v_id, v_old) order by id for update;
  if exists(select 1 from public.space_members where space_id = v_id and user_id = auth.uid()) then raise exception '你已经加入这个空间，请直接切换空间。'; end if;
  if exists(select 1 from public.space_members where user_id = auth.uid() and slot = 1)
    or exists(select 1 from public.space_members m where m.user_id = auth.uid() and (select count(*) from public.space_members peers where peers.space_id = m.space_id) > 1)
    then raise exception '你已经有双人空间，请切换到已有空间。'; end if;
  if not exists(select 1 from private.space_invites where token_hash = v_hash and space_id = v_id and expires_at > now()) then raise exception '邀请码已失效，请让对方重新生成。'; end if;
  if (select count(*) from public.space_members where space_id = v_id) >= 2 then raise exception '这个空间已经有两个人了。'; end if;
  if not exists(select 1 from public.space_members where space_id = v_id and slot = 0 and is_active) then raise exception '对方已经切换空间，请让对方重新生成邀请码。'; end if;
  update public.space_members set is_active = false where user_id = auth.uid() and is_active;
  insert into public.space_members(space_id,user_id,slot,is_active) values(v_id,auth.uid(),1,true);
  update public.spaces set name_b = btrim(p_nickname), updated_at = now() where id = v_id;
  delete from private.space_invites where space_id in (v_id, v_old);
  return v_id;
end;
$$;

create function public.switch_space(p_space_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not exists(select 1 from public.space_members where user_id = auth.uid() and space_id = p_space_id) then raise exception '你还没有加入这个空间。'; end if;
  update public.space_members set is_active = false where user_id = auth.uid() and is_active;
  update public.space_members set is_active = true where user_id = auth.uid() and space_id = p_space_id;
end;
$$;

create function public.my_spaces() returns table(space_id uuid, name_a text, name_b text, is_active boolean)
language sql stable security definer set search_path = '' as $$
  select s.id,s.name_a,s.name_b,m.is_active from public.space_members m join public.spaces s on s.id=m.space_id where m.user_id=auth.uid() order by m.joined_at,s.id;
$$;

-- A preserved original space cannot invite another partner after joining a pair.
create or replace function public.create_space_invite(p_space_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  perform 1 from public.spaces where id=p_space_id for update;
  if not exists(select 1 from public.space_members where space_id=p_space_id and user_id=auth.uid() and slot=0 and is_active) then raise exception '只有当前空间的创建者可以生成邀请码。'; end if;
  if (select count(*) from public.space_members where space_id=p_space_id)>=2 then raise exception '你们已经在同一个空间了。'; end if;
  if exists(select 1 from public.space_members where user_id=auth.uid() and slot=1) then raise exception '你已经有双人空间，请切换到已有空间。'; end if;
  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from private.space_invites where space_id=p_space_id;
  insert into private.space_invites(token_hash,space_id,expires_at) values(encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_space_id,now()+interval '7 days');
  return v_token;
end;
$$;
revoke all on function public.switch_space(uuid), public.my_spaces() from public,anon;
grant execute on function public.switch_space(uuid), public.my_spaces() to authenticated;
commit;
