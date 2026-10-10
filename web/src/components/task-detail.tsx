"use client";

import { useEffect, useRef, useState } from "react";
import { PriorityChip, PrioritySegment } from "@/components/ui";
import { useStore, useToast } from "@/lib/store";
import type { Priority } from "@/lib/data";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toISO(date: string, hm: string): string | null {
  if (!date) return null;
  const t = hm || "23:59";
  const d = new Date(`${date}T${t}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function TaskDetail({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { tasks, toggleTask, updateTask, deleteTask, myGroups } = useStore();
  const { say } = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [note, setNote] = useState("");
  const [groupId, setGroupId] = useState<string>("pribadi");
  const [saving, setSaving] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const task = tasks.find((t) => t.id === taskId);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setEditing(false);
    if (task) {
      setTitle(task.title);
      setNote(task.note ?? "");
      setPriority(task.priority);
      setDate(toDateInput(task.dueAt));
      setTime(toTimeInput(task.dueAt));
      setGroupId(task.groupId ?? "pribadi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, onClose]);

  if (!taskId || !task) return null;

  const overdue = !!task.dueAt && !task.done && nowMs !== null && new Date(task.dueAt).getTime() < (nowMs as number);

  const save = async () => {
    if (title.trim().length < 3) {
      say("Judul minimal 3 huruf");
      return;
    }
    setSaving(true);
    const ok = await updateTask(task.id, {
      title: title.trim(),
      note: note.trim(),
      priority,
      dueAt: toISO(date, time),
      groupId: groupId === "pribadi" ? null : groupId,
    });
    setSaving(false);
    if (ok) {
      say("Tugas diperbarui");
      setEditing(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Hapus tugas "${task.title}"?`)) return;
    const ok = await deleteTask(task.id);
    if (ok) {
      say("Tugas dihapus");
      onClose();
    }
  };

  return (
    <div
      className="x-modal-back"
      ref={backRef}
      onClick={(e) => {
        if (e.target === backRef.current) onClose();
      }}
    >
      <div className="x-modal" role="dialog" aria-modal="true" aria-label={`Detail tugas ${task.title}`}>
        <div className="x-modal-head">
          <h2 className="x-h" style={{ flex: 1, fontSize: 20 }}>
            {editing ? "Edit Tugas" : task.title}
          </h2>
          <button type="button" className="x-modal-x" aria-label="Tutup" onClick={onClose}>
            ✕
          </button>
        </div>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="x-field" style={{ marginTop: 0 }}>
              <label htmlFor="td-judul">Judul</label>
              <input id="td-judul" className="x-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="x-field">
              <span>Tenggat</span>
              <div className="x-two">
                <input className="x-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Tanggal tenggat" />
                <input className="x-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Jam tenggat" />
              </div>
            </div>
            <div className="x-field">
              <label htmlFor="td-grup">Grup</label>
              <select id="td-grup" className="x-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="pribadi">Pribadi</option>
                {myGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="x-field">
              <span>Prioritas</span>
              <PrioritySegment value={priority} onChange={setPriority} />
            </div>
            <div className="x-field">
              <label htmlFor="td-cat">Catatan</label>
              <textarea id="td-cat" className="x-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="x-btns" style={{ marginTop: 16 }}>
              <button type="submit" className="x-btn" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button type="button" className="x-btn x-btn--ghost" onClick={() => setEditing(false)}>
                Batal
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="x-chips" style={{ marginTop: 4 }}>
              <PriorityChip value={task.priority} />
              <span className="x-tag">{task.group}</span>
              {task.done ? (
                <span className="x-chip x-chip--ok">Selesai</span>
              ) : overdue ? (
                <span className="x-chip x-chip--p1">Terlambat</span>
              ) : null}
            </div>
            <p className="x-sub" style={{ marginTop: 10 }}>
              Tenggat: {task.dueLabel}
            </p>
            {task.note ? (
              <p className="x-sub" style={{ marginTop: 8 }}>
                {task.note}
              </p>
            ) : (
              <p className="x-sub" style={{ marginTop: 8, opacity: 0.7 }}>
                Tanpa catatan.
              </p>
            )}
            <div className="x-stack" style={{ marginTop: 16 }}>
              <button
                type="button"
                className={`x-btn${task.done ? " x-btn--outline" : ""}`}
                onClick={() => {
                  toggleTask(task.id);
                  say(task.done ? "Tugas dibuka lagi" : "Tugas selesai");
                }}
              >
                {task.done ? "Batalkan selesai" : "Tandai selesai"}
              </button>
            </div>
            <div className="x-btns" style={{ marginTop: 12 }}>
              <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="x-btn x-btn--ghost x-btn--sm" onClick={remove}>
                Hapus
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
