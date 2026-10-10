"use client";

import { useState } from "react";
import { PrioritySegment } from "@/components/ui";
import { EventWhenPicker } from "@/components/when-picker";
import { useStore, useToast } from "@/lib/store";
import type { EventItem, Priority } from "@/lib/data";

export function EventEditForm({
  event,
  onDone,
  idPrefix = "ee",
}: {
  event: EventItem;
  onDone?: () => void;
  idPrefix?: string;
}) {
  const { updateEvent } = useStore();
  const { say } = useToast();
  const [title, setTitle] = useState(event.title);
  const [note, setNote] = useState(event.note ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [priority, setPriority] = useState<Priority>(event.priority);
  const [date, setDate] = useState(event.startAt ? event.startAt.slice(0, 10) : "");
  const [start, setStart] = useState(event.start ?? "");
  const [end, setEnd] = useState(event.end ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
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
      say("Perubahan tersimpan");
      onDone?.();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2>Edit Event</h2>
      <div className="x-field">
        <label htmlFor={`${idPrefix}-judul`}>Judul</label>
        <input id={`${idPrefix}-judul`} className="x-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="x-field">
        <span>Waktu</span>
        <EventWhenPicker
          idPrefix={idPrefix}
          date={date}
          start={start}
          end={end}
          onDateChange={setDate}
          onStartChange={setStart}
          onEndChange={setEnd}
        />
      </div>
      <div className="x-field">
        <label htmlFor={`${idPrefix}-lokasi`}>Lokasi</label>
        <input id={`${idPrefix}-lokasi`} className="x-input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="x-field">
        <span>Prioritas</span>
        <PrioritySegment value={priority} onChange={setPriority} />
      </div>
      <div className="x-field">
        <label htmlFor={`${idPrefix}-cat`}>Catatan</label>
        <textarea id={`${idPrefix}-cat`} className="x-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="x-btns" style={{ marginTop: 16 }}>
        <button type="submit" className="x-btn" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" className="x-btn x-btn--ghost" onClick={() => onDone?.()}>
          Batal
        </button>
      </div>
    </form>
  );
}
