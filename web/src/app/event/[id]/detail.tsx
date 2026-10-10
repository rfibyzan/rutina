"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, LoadingSkeleton, PriorityChip, RsvpSegment, StatusChip, PrioritySegment } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import type { Priority } from "@/lib/data";

export default function EventDetail({ id }: { id: string }) {
  const { ready, loadError, events, reload, setRsvp, markAttendance, toggleCheck, addChecklist, updateEvent, deleteEvent, duplicateEvent } = useStore();
  const { say } = useToast();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  const beginEdit = () => {
    if (!event || !event.startAt || !event.endAt) return;
    setTitle(event.title);
    setNote(event.note);
    setLocation(event.location ?? "");
    setPriority(event.priority);
    setDate(event.startAt.slice(0, 10));
    setStart(event.start);
    setEnd(event.end);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!event) return;
    if (title.trim().length < 3) {
      say("Judul minimal 3 huruf");
      return;
    }
    if (!date || start >= end) {
      say("Tanggal dan jam tidak valid");
      return;
    }
    setSaving(true);
    const ok = await updateEvent(event.id, {
      title: title.trim(),
      note: note.trim(),
      location: location.trim(),
      priority,
      startAt: new Date(`${date}T${start}:00`).toISOString(),
      endAt: new Date(`${date}T${end}:00`).toISOString(),
    });
    setSaving(false);
    if (ok) {
      setEditing(false);
      say("Perubahan tersimpan");
    }
  };

  const content = !ready ? (
    <LoadingSkeleton />
  ) : loadError ? (
    <ErrorState text={loadError} onRetry={reload} />
  ) : !event ? (
    <EmptyState text="Event tidak ditemukan." />
  ) : editing ? (
    <>
      <h2>Edit Event</h2>
      <div className="x-field">
        <label htmlFor="e-judul">Judul</label>
        <input id="e-judul" className="x-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="x-field">
        <label htmlFor="e-tgl">Tanggal</label>
        <input id="e-tgl" className="x-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="x-field">
        <span>Mulai–Selesai</span>
        <div className="x-two">
          <input className="x-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Jam mulai" />
          <input className="x-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Jam selesai" />
        </div>
      </div>
      <div className="x-field">
        <label htmlFor="e-lokasi">Lokasi</label>
        <input id="e-lokasi" className="x-input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="x-field">
        <span>Prioritas</span>
        <PrioritySegment value={priority} onChange={setPriority} />
      </div>
      <div className="x-field">
        <label htmlFor="e-cat">Catatan</label>
        <textarea id="e-cat" className="x-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="x-btns" style={{ marginTop: 16 }}>
        <button type="button" className="x-btn" onClick={saveEdit} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" className="x-btn x-btn--ghost" onClick={() => setEditing(false)}>
          Batal
        </button>
      </div>
    </>
  ) : (
    <>
      <h2>{event.title}</h2>
      <p className="x-sub">
        {event.dateLabel} · {event.start}-{event.end} · {event.group}
      </p>
      {event.location && <p className="x-sub">Lokasi: {event.location}</p>}
      <div className="x-chips">
        <PriorityChip value={event.priority} />
        <StatusChip status={event.status} />
        {event.attendance === "done" && <span className="x-chip x-chip--ok">Selesai</span>}
        {event.attendance === "absent" && <span className="x-chip x-chip--p4">Tidak hadir</span>}
      </div>
      {event.note && <p className="x-sub" style={{ marginTop: 8 }}>{event.note}</p>}
      <p className="x-sec">Kehadiran</p>
      <RsvpSegment
        value={event.rsvp}
        onChange={(v) => {
          setRsvp(event.id, v);
          say(`RSVP ${event.title}: ${v}`);
        }}
      />
      <p className="x-sec">Peserta</p>
      <div className="x-people">
        {event.attendees.map((a) => (
          <span key={a}>{a}</span>
        ))}
        {event.extraAttendees > 0 && <span>+{event.extraAttendees}</span>}
      </div>
      <p className="x-sec">Checklist</p>
      {event.checklist.length === 0 ? (
        <EmptyState text="Belum ada checklist untuk event ini." />
      ) : (
        event.checklist.map((c, i) => (
          <label key={c.label} className="x-check">
            <input type="checkbox" checked={c.done} onChange={() => toggleCheck(event.id, i)} />
            <span>{c.label}</span>
          </label>
        ))
      )}
      <div className="x-field">
        <label htmlFor="e-tambah">Tambah item checklist</label>
        <div className="x-btns">
          <input
            id="e-tambah"
            className="x-input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Mis. Siapkan laptop"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="x-btn"
            style={{ width: "auto" }}
            onClick={() => {
              if (newItem.trim()) {
                addChecklist(event.id, newItem);
                setNewItem("");
              }
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="x-stack" style={{ marginTop: 20 }}>
        <button type="button" className={`x-btn${event.attendance === "done" ? " is-done" : ""}`} onClick={() => { markAttendance(event.id, "done"); say(`${event.title} ditandai selesai`); }}>
          Tandai Selesai
        </button>
        <button type="button" className="x-btn x-btn--outline" onClick={() => { markAttendance(event.id, "absent"); say(`Ketidakhadiran ${event.title} dicatat`); }}>
          Tidak Hadir
        </button>
      </div>
      <div className="x-btns" style={{ marginTop: 12 }}>
        <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={beginEdit}>
          Edit
        </button>
        <button
          type="button"
          className="x-btn x-btn--outline x-btn--sm"
          onClick={() => {
            duplicateEvent(event.id).then(() => say("Event diduplikat"));
          }}
        >
          Duplikat
        </button>
        <button
          type="button"
          className="x-btn x-btn--ghost x-btn--sm"
          onClick={() => {
            if (window.confirm(`Hapus ${event.title}?`)) {
              deleteEvent(event.id).then((ok) => {
                if (ok) {
                  say("Event dihapus");
                  router.back();
                }
              });
            }
          }}
        >
          Hapus
        </button>
      </div>
    </>
  );

  const back = (
    <p className="x-sub">
      <button type="button" onClick={() => router.back()} style={{ background: "none", border: 0, padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer" }}>
        ‹ Kembali
      </button>
    </p>
  );

  return (
    <>
      <MobileShell>
        <div className="r-screen x-detail">
          {back}
          {content}
        </div>
      </MobileShell>
      <DesktopShell>
        <div className="r-dcenter">
          {back}
          <div className="x-detail">{content}</div>
        </div>
      </DesktopShell>
    </>
  );
}
