-- RUTINA migration5: run after migration4.
-- 1. event_approvals: only owner/admin of the event's group can record a decision
--    (before this, a viewer could insert an "approved" row for themselves).
DROP POLICY IF EXISTS "event_approvals_insert" ON public.event_approvals;
CREATE POLICY "event_approvals_insert" ON public.event_approvals
  FOR INSERT TO authenticated WITH CHECK (
    approver_id = auth.uid()
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.group_id IS NOT NULL
                AND group_role(e.group_id) IN ('owner','admin'))
  );

-- 2. audit_log: read only your own group's log; write only as yourself into a group you belong to.
DROP POLICY IF EXISTS "audit_read_auth" ON public.audit_log;
CREATE POLICY "audit_read_member" ON public.audit_log
  FOR SELECT TO authenticated USING (
    actor_id = auth.uid() OR (group_id IS NOT NULL AND is_group_member(group_id))
  );
DROP POLICY IF EXISTS "audit_insert_auth" ON public.audit_log;
CREATE POLICY "audit_insert_self" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (
    actor_id = auth.uid() AND (group_id IS NULL OR is_group_member(group_id))
  );
