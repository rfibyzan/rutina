"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrioritySegment } from "@/components/ui";
import { useStore, useToast } from "@/lib/store";
import type { NewPrefill, Priority } from "@/lib/data";

function todayISO(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function toISODate(date: string, hm: string): string {
  const d = new Date(`${date}T00:00:00`);
  const [h, mi] = hm.split(":").map((x) => parseInt(x || "0", 10));
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(mi) ? mi : 0, 0, 0);
  return d.toISOString();
}

const REMINDERS = [
  { label: "Tanpa pengingat", value: null },
  { label: "15 menit sebelumnya", value: 15 },
  { label: "30 menit sebelumnya", value: 30 },
  { label: "1 jam sebelumnya", value: 60 },
] as const;

export function NewEventForm({ prefill, onSaved }: { prefill: NewPrefill; onSaved?: (id: string) => void }) {
  const { myGroups, addEvent, checkConflict } = useStore();
  const { say } = useToast();
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState<string>(prefill.groupId ?? "pribadi");
  const [date, setDate] = useState(prefill.date ?? "");
  const [start, setStart] = useState(prefill.start ?? "");
  const [end, setEnd] = useState(prefill.end ?? "");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [recur, setRecur] = useState("Tidak berulang");
  const [reminder, setReminder] = useState<number | null>(30);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [clash, setClash] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefill.date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(todayISO());
    }
    if (!prefill.start) {
      setStart("19:00");
    }
    if (!prefill.end) {
      setEnd("21:00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = useMemo(() => {
    if (groupId === "pribadi") return "owner" as const;
    return myGroups.find((g) => g.id === groupId)?.role ?? null;
  }, [groupId, myGroups]);

  const doSave = async (force: boolean) => {
    if (title.trim().length < 3) {
      setError("Judul minimal 3 huruf.");
      return;
    }
    if (!date) {
      setError("Isi tanggal.");
      return;
    }
    if (start >= end) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (groupId !== "pribadi" && !role) {
      setError("Grup tidak ditemukan.");
      return;
    }
    if (role === "viewer") {
      setError("Kamu Pengikut di grup ini, tidak bisa menambah event.");
      return;
    }
    const startAt = toISODate(date, start);
    const endAt = toISODate(date, end);
    if (!force) {
      const hit = checkConflict(startAt, endAt);
      if (hit.length > 0) {
        setClash(hit.map((e) => `${e.title} (${e.start}-${e.end})`));
        setError("");
        return;
      }
    }
    setError("");
    setClash(force ? clash : null);
    setSaving(true);
    const emails = guests.split(/[,;\n]/).map((s) => s.trim()).filter((s) => /^\S+@\S+\.\S+$/.test(s));
    const res = await addEvent({
      title: title.trim(),
      groupId: groupId === "pribadi" ? null : groupId,
      startAt,
      endAt,
      priority,
      status: role === "contributor" ? "pending" : "approved",
      note: note.trim(),
      location: location.trim(),
      rrule: recur === "Mingguan" ? "FREQ=WEEKLY" : null,
      reminderMinutes: reminder,
      attendeeEmails: emails,
    });
    setSaving(false);
    if (!res.ok) {
      setError("Gagal menyimpan, coba lagi.");
      return;
    }
    say(role === "contributor" ? "Diajukan ke Admin" : "Tersimpan");
    onSaved?.(res.id ?? "");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSave(false);
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          doSave(false);
        }
      }}
    >
      <div className="x-field" style={{ marginTop: 0 }}>
        <label htmlFor="nm-judul">Judul</label>
        <input id="nm-judul" className="x-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mis. Rapat Evaluasi Piket" autoFocus />
      </div>
      <div className="x-field">
        <label htmlFor="nm-grup">Kalender</label>
        <select id="nm-grup" className="x-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="pribadi">Pribadi</option>
          {myGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="x-field">
        <label htmlFor="nm-tgl">Tanggal</label>
        <input id="nm-tgl" className="x-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="x-field">
        <span>Mulai–Selesai</span>
        <div className="x-two">
          <input className="x-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Jam mulai" />
          <input className="x-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Jam selesai" />
        </div>
      </div>
      <div className="x-field">
        <label htmlFor="nm-lokasi">Lokasi</label>
        <input id="nm-lokasi" className="x-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mis. Sekretariat BEM FT" />
      </div>
      <div className="x-field">
        <button type="button" className="x-btn x-btn--ghost x-btn--sm" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          Opsi lainnya {more ? "▾" : "▸"}
        </button>
      </div>
      {more && (
        <>
          <div className="x-field">
            <label htmlFor="nm-tamu">Undang peserta (email, pisahkan koma)</label>
            <input id="nm-tamu" className="x-input" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="teman@students.undip.ac.id" inputMode="email" />
          </div>
          <div className="x-field">
            <span>Prioritas</span>
            <PrioritySegment value={priority} onChange={setPriority} />
          </div>
          <div className="x-field">
            <span>Ulangi</span>
            <div className="x-chips" role="group" aria-label="Pengulangan">
              {["Tidak berulang", "Mingguan"].map((r) => (
                <button key={r} type="button" className={`x-chip${r === recur ? " is-on" : ""}`} aria-pressed={r === recur} onClick={() => setRecur(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="x-field">
            <label htmlFor="nm-ingat">Pengingat</label>
            <select id="nm-ingat" className="x-input" value={reminder === null ? "" : String(reminder)} onChange={(e) => setReminder(e.target.value === "" ? null : parseInt(e.target.value, 10))}>
              {REMINDERS.map((r) => (
                <option key={r.label} value={r.value === null ? "" : String(r.value)}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="x-field">
            <label htmlFor="nm-cat">Catatan</label>
            <textarea id="nm-cat" className="x-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </>
      )}
      {role === "contributor" && (
        <div className="x-info">
          Kamu Kontributor di grup ini. Event akan diajukan ke Admin untuk disetujui.
        </div>
      )}
      {clash && (
        <div className="x-warn">
          <b>Bentrok dengan:</b>
          {clash.map((c) => (
            <div key={c}>· {c}</div>
          ))}
        </div>
      )}
      {error && (
        <div className="x-err" role="alert">
          {error}
        </div>
      )}
      <div style={{ marginTop: 16 }} className="x-btns">
        <button type="submit" className="x-btn" disabled={saving}>
          {saving ? "Menyimpan..." : clash ? "Simpan juga" : role === "contributor" ? "Ajukan" : "Simpan"}
        </button>
      </div>
    </form>
  );
}

export function NewTaskForm({ prefill, onSaved }: { prefill: NewPrefill; onSaved?: (id: string) => void }) {
  const { myGroups, addTask } = useStore();
  const { say } = useToast();
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState<string>(prefill.groupId ?? "pribadi");
  const [date, setDate] = useState(prefill.date ?? "");
  const [time, setTime] = useState(prefill.start ?? "");
  const [priority, setPriority] = useState<Priority>(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefill.date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(todayISO());
    }
    if (!prefill.start) {
      setTime("23:59");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSave = async () => {
    if (title.trim().length < 3) {
      setError("Judul minimal 3 huruf.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await addTask({
      title: title.trim(),
      groupId: groupId === "pribadi" ? null : groupId,
      dueAt: date ? toISODate(date, time) : null,
      priority,
      note: note.trim(),
    });
    setSaving(false);
    if (!ok) {
      setError("Gagal menyimpan tugas, coba lagi.");
      return;
    }
    say("Tugas tersimpan");
    onSaved?.("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSave();
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          doSave();
        }
      }}
    >
      <div className="x-field" style={{ marginTop: 0 }}>
        <label htmlFor="nt-judul">Tugas</label>
        <input id="nt-judul" className="x-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mis. Finalisasi laporan MPTI" autoFocus />
      </div>
      <div className="x-field">
        <label htmlFor="nt-grup">Kalender</label>
        <select id="nt-grup" className="x-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="pribadi">Pribadi</option>
          {myGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="x-field">
        <span>Tenggat</span>
        <div className="x-two">
          <input className="x-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Tanggal tenggat" />
          <input className="x-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Jam tenggat" />
        </div>
      </div>
      <div className="x-field">
        <span>Prioritas</span>
        <PrioritySegment value={priority} onChange={setPriority} />
      </div>
      <div className="x-field">
        <label htmlFor="nt-cat">Catatan</label>
        <textarea id="nt-cat" className="x-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && (
        <div className="x-err" role="alert">
          {error}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button type="submit" className="x-btn" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Tugas"}
        </button>
      </div>
    </form>
  );
}

export function NewModal({ onClose }: { onClose?: () => void }) {
  const { newOpen, newPrefill, closeNew } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"event" | "task">(newPrefill.tab ?? "event");
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(newPrefill.tab ?? "event");
  }, [newPrefill, newOpen]);

  useEffect(() => {
    if (!newOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (onClose ?? closeNew)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newOpen, closeNew, onClose]);

  if (!newOpen) return null;
  const done = onClose ?? closeNew;
  return (
    <div
      className="x-modal-back"
      ref={backRef}
      onClick={(e) => {
        if (e.target === backRef.current) done();
      }}
    >
      <div className="x-modal" role="dialog" aria-modal="true" aria-label="Baru">
        <div className="x-modal-head">
          <div className="x-tabs" role="group" aria-label="Jenis" style={{ marginTop: 0, flex: 1 }}>
            {(["event", "task"] as const).map((t) => (
              <button key={t} type="button" className={t === tab ? "is-on" : ""} aria-pressed={t === tab} onClick={() => setTab(t)}>
                {t === "event" ? "Event" : "Tugas"}
              </button>
            ))}
          </div>
          <button type="button" className="x-modal-x" aria-label="Tutup" onClick={done}>
            ✕
          </button>
        </div>
        {tab === "event" ? (
          <NewEventForm prefill={newPrefill} onSaved={done} />
        ) : (
          <NewTaskForm prefill={newPrefill} onSaved={done} />
        )}
        <button
          type="button"
          className="x-sub"
          style={{ marginTop: 12, background: "none", border: 0, padding: 0 }}
          onClick={() => {
            done();
            router.push("/tambah");
          }}
        >
          Buka halaman penuh
        </button>
      </div>
    </div>
  );
}
