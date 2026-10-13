begin;

-- author_id and the Storage path continue to identify the actual uploader.
-- An optional display author supports posting a photo for a space member.
alter table public.photos add column display_author_id uuid;
alter table public.photos add constraint photos_display_author_member
  foreign key (space_id, display_author_id) references public.space_members(space_id, user_id);
grant insert (display_author_id) on public.photos to authenticated;

-- Existing photos_create still requires author_id = auth.uid(); the new
-- foreign key confines display attribution to a member of this same space.
commit;
