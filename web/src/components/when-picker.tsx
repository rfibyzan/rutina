"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/date-picker";

const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DOW_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtShort(d: Date): string {
  const dow = DOW_SHORT[d.getDay()];
  return `${dow} ${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
}

function fmtLong(d: Date): string {
  const dow = DOW_SHORT[d.getDay()];
  return `${dow}, ${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function toMin(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function addMin(hm: string, mins: number): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return hm;
  let t = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + mins;
  if (t < 0) t = 0;
  if (t > 23 * 60 + 59) t = 23 * 60 + 59;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

function diffMin(a: string, b: string): number | null {
  const ma = /^(\d{2}):(\d{2})$/.exec(a);
  const mb = /^(\d{2}):(\d{2})$/.exec(b);
  if (!ma || !mb) return null;
  return parseInt(mb[1], 10) * 60 + parseInt(mb[2], 10) - (parseInt(ma[1], 10) * 60 + parseInt(ma[2], 10));
}

function fmtDur(mins: number): string {
  if (mins <= 0) return "";
  if (mins < 60) return `${mins} mnt`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  if (r === 0) return `${h} jam`;
  if (r === 30) return mins === 90 ? "1,5 jam" : `${h},5 jam`;
  return `${h} jam ${r} mnt`;
}

export function normalizeHM(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[.,]/g, ":").replace(/\s+/g, "");
  s = s.replace(/[^\d:]/g, "");
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length > 2) return null;
    const hStr = parts[0] ?? "";
    const mStr = parts[1] ?? "";
    if (hStr.length === 0 || hStr.length > 2) return null;
    if (mStr.length > 2) return null;
    const h = parseInt(hStr, 10);
    const m = mStr === "" ? 0 : parseInt(mStr, 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h > 23 || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  }
  if (!/^\d+$/.test(s)) return null;
  if (s.length <= 2) {
    const h = parseInt(s, 10);
    if (h > 23) return null;
    return `${pad(h)}:00`;
  }
  if (s.length === 3) {
    const h = parseInt(s.slice(0, 1), 10);
    const m = parseInt(s.slice(1), 10);
    if (h > 23 || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  }
  if (s.length === 4) {
    const h = parseInt(s.slice(0, 2), 10);
    const m = parseInt(s.slice(2), 10);
    if (h > 23 || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  }
  return null;
}

function TimeField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
    setErr("");
  }, [value]);

  const commit = (raw: string) => {
    if (disabled) return;
    if (raw.trim() === "") {
      setErr("");
      if (value !== "") onChange("");
      setDraft("");
      return;
    }
    const n = normalizeHM(raw);
    if (n) {
      setErr("");
      if (n !== value) onChange(n);
      setDraft(n);
    } else {
      setErr("Format jam tidak valid (HH:MM, 00:00–23:59).");
      setDraft(value);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <input
        id={id}
        className="x-input x-when-time"
        style={{ width: "100%", boxSizing: "border-box" }}
        inputMode="numeric"
        placeholder="HH:MM"
        autoComplete="off"
        value={draft}
        disabled={disabled}
        maxLength={5}
        aria-label={label}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${id}-err` : undefined}
        onChange={(e) => {
          if (disabled) return;
          let v = e.target.value.replace(/[^\d:.]/g, "").replace(/\./g, ":").slice(0, 5);
          const firstColon = v.indexOf(":");
          if (firstColon !== -1) {
            v = v.slice(0, firstColon + 1) + v.slice(firstColon + 1).replace(/:/g, "");
          }
          setDraft(v);
          if (err) setErr("");
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const base = normalizeHM(draft) ?? normalizeHM(value) ?? "09:00";
            const next = addMin(base, e.key === "ArrowUp" ? 15 : -15);
            setErr("");
            onChange(next);
            setDraft(next);
          } else if (e.key === "Enter") {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
          } else if (e.key === "Escape") {
            setDraft(value);
            setErr("");
          }
        }}
      />
      {err && (
        <p id={`${id}-err`} className="x-when-err" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

function DateField({
  date,
  onDateChange,
  disabled,
}: {
  date: string;
  onDateChange: (d: string) => void;
  disabled?: boolean;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const cur = parseYMD(date);
  const base = cur ?? new Date();
  return (
    <div>
      <DatePicker
        title={cur ? fmtLong(cur) : "Pilih tanggal"}
        titleLabel="Tanggal"
        open={calOpen}
        onOpenChange={(v) => {
          if (!disabled) setCalOpen(v);
        }}
        baseYear={base.getFullYear()}
        baseMonth={base.getMonth()}
        weekStart={cur ?? new Date()}
        agendaKeys={new Set<string>()}
        variant="field"
        disabled={disabled}
        onPick={(d) => {
          onDateChange(toYMD(d));
          setCalOpen(false);
        }}
        onToday={() => {
          const t = new Date();
          onDateChange(toYMD(t));
          setCalOpen(false);
        }}
      />
    </div>
  );
}

export function EventWhenPicker({
  idPrefix,
  date,
  start,
  end,
  onDateChange,
  onStartChange,
  onEndChange,
}: {
  idPrefix: string;
  date: string;
  start: string;
  end: string;
  onDateChange: (d: string) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const cur = parseYMD(date);
  const dur = diffMin(start, end);
  const summary =
    cur && start && end && start < end
      ? `${fmtShort(cur)} · ${start}–${end}${dur !== null && dur > 0 ? ` (${fmtDur(dur)})` : ""}`
      : "Isi tanggal dan jam.";

  const handleStart = (v: string) => {
    const d = diffMin(start, end);
    onStartChange(v);
    if (v) {
      if (d !== null && d > 0) {
        onEndChange(addMin(v, d));
      } else if (!end || end <= v) {
        onEndChange(addMin(v, 60));
      }
    }
  };

  return (
    <div className="x-when">
      <span id={`${idPrefix}-waktu-label`} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
        Waktu
      </span>
      <div className="x-when-event" aria-labelledby={`${idPrefix}-waktu-label`} style={{ display: "grid", gap: 8 }}>
        <div className="x-when-event-date" style={{ minWidth: 0 }}>
          <DateField date={date} onDateChange={onDateChange} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "center", gap: 8 }}>
          <TimeField id={`${idPrefix}-mulai`} label="Jam mulai" value={start} onChange={handleStart} />
          <span aria-hidden="true" style={{ color: "var(--ink-2)" }}>–</span>
          <TimeField id={`${idPrefix}-selesai`} label="Jam selesai" value={end} onChange={onEndChange} />
        </div>
      </div>
      <p className="x-when-summary" role="status">
        {summary}
      </p>
    </div>
  );
}

export function TaskWhenPicker({
  idPrefix,
  date,
  time,
  noDeadline,
  onDateChange,
  onTimeChange,
  onNoDeadlineChange,
}: {
  idPrefix: string;
  date: string;
  time: string;
  noDeadline: boolean;
  onDateChange: (d: string) => void;
  onTimeChange: (v: string) => void;
  onNoDeadlineChange: (v: boolean) => void;
}) {
  const cur = parseYMD(date);
  const summary = noDeadline
    ? "Tanpa tenggat."
    : cur && time
      ? `${fmtShort(cur)} · ${time}`
      : "Isi tanggal dan jam tenggat.";
  return (
    <div className="x-when">
      <div className="x-when-tenggat">
        <span id={`${idPrefix}-tenggat-label`} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
          Tenggat
        </span>
        <label className="x-when-nodeadline">
          <input
            type="checkbox"
            checked={noDeadline}
            onChange={(e) => onNoDeadlineChange(e.target.checked)}
            aria-labelledby={`${idPrefix}-tenggat-label`}
          />
          <span>Tanpa tenggat</span>
        </label>
      </div>
      <div
        className="x-when-taskrow"
                style={{ display: "flex", gap: 8, opacity: noDeadline ? 0.45 : 1, pointerEvents: noDeadline ? "none" : "auto" }}
        aria-disabled={noDeadline}
      >
        <div className="x-when-taskrow-date" style={{ flex: "1 1 60%", minWidth: 0 }}>
          <DateField date={date} onDateChange={onDateChange} disabled={noDeadline} />
        </div>
        <div className="x-when-taskrow-time" style={{ flex: "1 1 40%", minWidth: 0 }}>
          <TimeField id={`${idPrefix}-jam`} label="Jam tenggat" value={time} onChange={onTimeChange} disabled={noDeadline} />
        </div>
      </div>
      <p className="x-when-summary" role="status">
        {summary}
      </p>
    </div>
  );
}
