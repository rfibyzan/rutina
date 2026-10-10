-- RUTINA Supabase migration 3: RLS ketat per user/role.
-- MENGGANTIKAN policy permissive migration 1 (using (true)).
-- Jalankan di Supabase Dashboard > SQL Editor.

-- Helper: cek keanggotaan dan role pemanggil di sebuah grup.
CREATE OR REPLACE FUNCTION public.is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM group_members
  WHERE group_id = gid AND user_id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM groups WHERE id = gid AND owner_id = auth.uid()
) $$;

CREATE OR REPLACE FUNCTION public.group_role(gid UUID)
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(
  (SELECT role FROM group_members WHERE group_id = gid AND user_id = auth.uid()),
  (SELECT 'owner' FROM groups WHERE id = gid AND owner_id = auth.uid()),
  'none'
) $$;

-- Cabut policy lama yang terbuka.
DROP POLICY IF EXISTS "users_self" ON public.users;
DROP POLICY IF EXISTS "groups_all_auth" ON public.groups;
DROP POLICY IF EXISTS "members_all_auth" ON public.group_members;
DROP POLICY IF EXISTS "events_all_auth" ON public.events;
DROP POLICY IF EXISTS "approvals_all_auth" ON public.event_approvals;
DROP POLICY IF EXISTS "attendees_all_auth" ON public.event_attendees;
DROP POLICY IF EXISTS "reminders_all_auth" ON public.reminders;
DROP POLICY IF EXISTS "subtasks_all_auth" ON public.subtasks;
DROP POLICY IF EXISTS "notifications_self" ON public.notifications;
DROP POLICY IF EXISTS "audit_all_auth" ON public.audit_log;
DROP POLICY IF EXISTS "tasks_all_auth" ON public.tasks;

-- users: semua yang login boleh baca (nama untuk peserta/anggota),
-- ubah hanya baris sendiri.
CREATE POLICY "users_read_auth" ON public.users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_self_write" ON public.users
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- groups: terlihat bila anggota/pemilik. Buat bebas (owner = diri sendiri).
-- Ubah: owner/admin. Hapus: owner saja.
CREATE POLICY "groups_read_member" ON public.groups
  FOR SELECT TO authenticated USING (is_group_member(id));
CREATE POLICY "groups_insert_own" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups_update_mgr" ON public.groups
  FOR UPDATE TO authenticated
  USING (group_role(id) IN ('owner', 'admin'))
  WITH CHECK (group_role(id) IN ('owner', 'admin'));
CREATE POLICY "groups_delete_owner" ON public.groups
  FOR DELETE TO authenticated USING (group_role(id) = 'owner');

-- group_members: terlihat sesama anggota. Gabung sendiri (kode undangan).
-- Ubah role: owner/admin. Keluar: diri sendiri. Keluarkan: owner/admin.
CREATE POLICY "members_read_member" ON public.group_members
  FOR SELECT TO authenticated USING (is_group_member(group_id));
CREATE POLICY "members_join_self" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND (
      role = 'viewer'
      OR (role = 'owner' AND EXISTS (SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid()))
    )
  );
CREATE POLICY "members_update_mgr" ON public.group_members
  FOR UPDATE TO authenticated
  USING (group_role(group_id) IN ('owner', 'admin'))
  WITH CHECK (group_role(group_id) IN ('owner', 'admin'));
CREATE POLICY "members_delete_self" ON public.group_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members_delete_mgr" ON public.group_members
  FOR DELETE TO authenticated USING (group_role(group_id) IN ('owner', 'admin'));

-- events: pribadi milik sendiri; grup bila anggota. Pengaju boleh lihat
-- event yang ia buat. Tambah: pribadi bebas; grup butuh role
-- owner/admin/editor/contributor. Ubah status: pembuat atau owner/admin
-- grup. Hapus: pembuat atau owner grup.
CREATE POLICY "events_read_mine" ON public.events
  FOR SELECT TO authenticated USING (
    owner_user_id = auth.uid()
    OR created_by = auth.uid()
    OR (group_id IS NOT NULL AND is_group_member(group_id))
  );
CREATE POLICY "events_insert_role" ON public.events
  FOR INSERT TO authenticated WITH CHECK (
    owner_user_id = auth.uid()
    AND created_by = auth.uid()
    AND (
      group_id IS NULL
      OR group_role(group_id) IN ('owner', 'admin', 'editor', 'contributor')
    )
  );
CREATE POLICY "events_update_mgr" ON public.events
  FOR UPDATE TO authenticated USING (
    owner_user_id = auth.uid()
    OR created_by = auth.uid()
    OR (group_id IS NOT NULL AND group_role(group_id) IN ('owner', 'admin'))
  );
CREATE POLICY "events_delete_own" ON public.events
  FOR DELETE TO authenticated USING (
    owner_user_id = auth.uid()
    OR created_by = auth.uid()
    OR (group_id IS NOT NULL AND group_role(group_id) = 'owner')
  );

-- event_approvals: yang terlibat (pembuat/penyetuju/admin grup) boleh baca.
-- Menyetujui: admin/owner grup (atau diri untuk event pribadi).
CREATE POLICY "event_approvals_rw" ON public.event_approvals
  FOR ALL TO authenticated USING (true) WITH CHECK (
    approver_id = auth.uid()
  );

-- event_attendees: terlihat bila event-nya terlihat; tulis baris sendiri.
CREATE POLICY "attendees_read_auth" ON public.event_attendees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendees_self_write" ON public.event_attendees
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- reminders: milik sendiri saja.
CREATE POLICY "reminders_own" ON public.reminders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- subtasks: semua yang login (selalu lewat event yang terlihat).
CREATE POLICY "subtasks_all_auth" ON public.subtasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- notifications: milik sendiri saja.
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- tasks: milik sendiri saja.
CREATE POLICY "tasks_own" ON public.tasks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- audit_log: anggota grup terkait boleh baca, semua login boleh tulis.
CREATE POLICY "audit_read_auth" ON public.audit_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert_auth" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);
