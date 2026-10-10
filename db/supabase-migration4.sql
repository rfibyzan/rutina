-- RUTINA migration4: fix Buat Grup, Gabung via Kode, and tables that are still too open

-- 1. Buat Grup: the owner must be able to read their group immediately after insert (.select())
DROP POLICY IF EXISTS "groups_read_member" ON public.groups;
CREATE POLICY "groups_read_member" ON public.groups
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_group_member(id));

-- 2. Join only through a valid code (RPC), never through the gid alone
DROP POLICY IF EXISTS "members_join_self" ON public.group_members;
CREATE POLICY "members_insert_owner" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE gid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO gid FROM groups WHERE invite_code = upper(trim(p_code));
  IF gid IS NULL THEN RETURN NULL; END IF;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (gid, auth.uid(), 'viewer')
  ON CONFLICT (group_id, user_id) DO NOTHING;  -- an owner/admin is never demoted
  RETURN gid;
END $$;
REVOKE ALL ON FUNCTION public.join_group_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;

-- 3. users: only yourself and fellow members of the same group
DROP POLICY IF EXISTS "users_read_auth" ON public.users;
CREATE POLICY "users_read_related" ON public.users
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members m1
      JOIN group_members m2 ON m2.group_id = m1.group_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = users.id
    )
  );

-- 4. subtasks & attendees: follow access to the event (events RLS applies in the subquery)
DROP POLICY IF EXISTS "subtasks_all_auth" ON public.subtasks;
CREATE POLICY "subtasks_via_event" ON public.subtasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id))
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id));

DROP POLICY IF EXISTS "attendees_read_auth" ON public.event_attendees;
CREATE POLICY "attendees_read_via_event" ON public.event_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id));

-- 5. event_approvals: read follows the event; insert works as before; only group admins can change/delete
DROP POLICY IF EXISTS "event_approvals_rw" ON public.event_approvals;
CREATE POLICY "event_approvals_read" ON public.event_approvals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id));
CREATE POLICY "event_approvals_insert" ON public.event_approvals
  FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid());
CREATE POLICY "event_approvals_update_mgr" ON public.event_approvals
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.group_id IS NOT NULL AND group_role(e.group_id) IN ('owner','admin')));
CREATE POLICY "event_approvals_delete_mgr" ON public.event_approvals
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.group_id IS NOT NULL AND group_role(e.group_id) IN ('owner','admin')));

-- 6. events: an update must not move an event into a group the user does not manage
DROP POLICY IF EXISTS "events_update_mgr" ON public.events;
CREATE POLICY "events_update_mgr" ON public.events
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR created_by = auth.uid()
         OR (group_id IS NOT NULL AND group_role(group_id) IN ('owner','admin')))
  WITH CHECK (group_id IS NULL OR group_role(group_id) IN ('owner','admin','editor','contributor'));
