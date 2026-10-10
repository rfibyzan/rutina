-- RUTINA Supabase migration 6: subtugas untuk Tugas.
-- Jalankan di Supabase Dashboard > SQL Editor (aman dijalankan ulang).
--
-- Aturan status tugas induk:
--   * Tugas tanpa subtugas: selesai/tidak selesai diatur manual seperti biasa.
--   * Tugas dengan subtugas: otomatis selesai saat SEMUA subtugas selesai,
--     dan otomatis tidak selesai jika masih ada subtugas yang belum selesai
--     (termasuk saat subtugas baru ditambahkan ke tugas yang sudah selesai).
--   * Jika semua subtugas dihapus, status tugas dibiarkan apa adanya.
-- Aturan dijaga oleh trigger di database, jadi web dan Android konsisten.

CREATE TABLE IF NOT EXISTS public.task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON public.task_subtasks (task_id, position);

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_subtasks_via_task" ON public.task_subtasks;
-- Mengikuti akses ke tugas induk (RLS tasks_own berlaku di subquery).
CREATE POLICY "task_subtasks_via_task" ON public.task_subtasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

CREATE OR REPLACE FUNCTION public.sync_task_done_from_subtasks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  tid UUID;
  total INT;
  open_count INT;
BEGIN
  tid := COALESCE(NEW.task_id, OLD.task_id);
  SELECT count(*), count(*) FILTER (WHERE NOT done)
    INTO total, open_count
    FROM public.task_subtasks WHERE task_id = tid;
  IF total > 0 THEN
    UPDATE public.tasks SET done = (open_count = 0)
     WHERE id = tid AND done IS DISTINCT FROM (open_count = 0);
  END IF;
  -- Subtugas dipindah ke tugas lain: rapikan juga tugas lamanya.
  IF TG_OP = 'UPDATE' AND OLD.task_id IS DISTINCT FROM NEW.task_id THEN
    SELECT count(*), count(*) FILTER (WHERE NOT done)
      INTO total, open_count
      FROM public.task_subtasks WHERE task_id = OLD.task_id;
    IF total > 0 THEN
      UPDATE public.tasks SET done = (open_count = 0)
       WHERE id = OLD.task_id AND done IS DISTINCT FROM (open_count = 0);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_subtasks_sync ON public.task_subtasks;
CREATE TRIGGER trg_task_subtasks_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.task_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_done_from_subtasks();
