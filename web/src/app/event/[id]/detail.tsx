"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, LoadingSkeleton, PriorityChip, RsvpSegment, StatusChip } from "@/components/ui";
import { EventEditForm } from "@/components/event-edit-form";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";

export default function EventDetail({ id }: { id: string }) {
  const { ready, loadError, events, reload, setRsvp, markAttendance, toggleCheck, addChecklist, deleteEvent, duplicateEvent } = useStore();
  const { say } = useToast();
  const router = useRouter();
  const event = events.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
  }, []);

  const started = !!event?.startAt && nowMs !== null ? new Date(event.startAt as string).getTime() <= (nowMs as number) : false;

  const content = !ready ? (
    <LoadingSkeleton />
  ) : loadError ? (
    <ErrorState text={loadError} onRetry={reload} />
  ) : !event ? (
    <EmptyState text="Event tidak ditemukan." />
  ) : editing ? (
    <EventEditForm event={event} onDone={() => setEditing(false)} />
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
      {!started && (
        <p className="x-sub" style={{ marginTop: 8 }}>
          Presensi dibuka saat acara dimulai.
        </p>
      )}
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
      {started && (
        <div className="x-stack" style={{ marginTop: 20 }}>
          <button type="button" className={`x-btn${event.attendance === "done" ? " is-done" : ""}`} onClick={() => { markAttendance(event.id, "done"); say(`${event.title} ditandai selesai`); }}>
            Tandai Selesai
          </button>
          <button type="button" className="x-btn x-btn--outline" onClick={() => { markAttendance(event.id, "absent"); say(`Ketidakhadiran ${event.title} dicatat`); }}>
            Tidak Hadir
          </button>
        </div>
      )}
      <div className="x-btns" style={{ marginTop: 12 }}>
        <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={() => setEditing(true)}>
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
