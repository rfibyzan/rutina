-- RUTINA Supabase follow-up migration.
-- Jalankan di Supabase Dashboard > SQL Editor SETELAH schema.sql lama.
-- Alasan: schema.sql self-host belum kenal auth.users, belum ada trigger profil, belum ada RLS.

-- 1. Profil otomatis saat signup Email / Google
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Pengguna'),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Invite code default agar insert grup dari web tidak gagal
create or replace function public.generate_invite_code()
returns text
language sql
as $$ select upper(substr(md5(random()::text), 1, 6)) $$;

alter table public.groups alter column invite_code set default public.generate_invite_code();

-- 3. RLS: aktifkan + kebijakan permissive untuk authenticated (agar web langsung jalan).
-- Ketatkan nanti per matriks role di db/README.md bila perlu.
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_approvals enable row level security;
alter table public.event_attendees enable row level security;
alter table public.reminders enable row level security;
alter table public.subtasks enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Bersihkan policy lama bila migrasi dijalankan ulang
drop policy if exists "users_self" on public.users;
drop policy if exists "groups_all_auth" on public.groups;
drop policy if exists "members_all_auth" on public.group_members;
drop policy if exists "events_all_auth" on public.events;
drop policy if exists "approvals_all_auth" on public.event_approvals;
drop policy if exists "attendees_all_auth" on public.event_attendees;
drop policy if exists "reminders_all_auth" on public.reminders;
drop policy if exists "subtasks_all_auth" on public.subtasks;
drop policy if exists "notifications_self" on public.notifications;
drop policy if exists "audit_all_auth" on public.audit_log;

create policy "users_self" on public.users
  for all to authenticated using (true) with check (true);

create policy "groups_all_auth" on public.groups
  for all to authenticated using (true) with check (true);

create policy "members_all_auth" on public.group_members
  for all to authenticated using (true) with check (true);

create policy "events_all_auth" on public.events
  for all to authenticated using (true) with check (true);

create policy "approvals_all_auth" on public.event_approvals
  for all to authenticated using (true) with check (true);

create policy "attendees_all_auth" on public.event_attendees
  for all to authenticated using (true) with check (true);

create policy "reminders_all_auth" on public.reminders
  for all to authenticated using (true) with check (true);

create policy "subtasks_all_auth" on public.subtasks
  for all to authenticated using (true) with check (true);

create policy "notifications_self" on public.notifications
  for all to authenticated using (true) with check (true);

create policy "audit_all_auth" on public.audit_log
  for all to authenticated using (true) with check (true);
