"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const SLOTS_30 = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`);

function TimeField({
  id,
  label,
  value,
  onChange,
  from,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  from?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const measuredH = listRef.current?.getBoundingClientRect().height;
    const popH = measuredH && measuredH > 0 ? measuredH : 208;
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const isUp = below < popH + 4 && above > below;
    let top = isUp ? r.top - popH - 4 : r.bottom + 4;
    if (popH >= window.innerHeight - 16) {
      top = 8;
    } else {
      top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));
    }
    const width = Math.max(160, r.width);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ left, top, width });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
    setErr("");
  }, [value]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(null);
      return;
    }
    updatePos();
    const raf = window.requestAnimationFrame(() => updatePos());
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(() => {
      const el = listRef.current?.querySelector("[data-cur='1']");
      el?.scrollIntoView({ block: "center" });
    }, 30);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [open, updatePos]);

  const suggestions = useMemo(() => {
    const fromN = from ? (normalizeHM(from) ?? (/^\d{2}:\d{2}$/.test(from) ? from : null)) : null;
    const fromM = fromN ? toMin(fromN) : null;
    if (fromM !== null && fromM !== undefined) {
      const out: { value: string; label: string }[] = [];
      for (const s of SLOTS_30) {
        const m = toMin(s);
        if (m === null || m <= (fromM as number)) continue;
        const d = m - (fromM as number);
        const dur = fmtDur(d);
        out.push({ value: s, label: dur ? `${s} (${dur})` : s });
      }
      return out;
    }
    return SLOTS_30.map((s) => ({ value: s, label: s }));
  }, [from]);

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

  const dropNode = (
    <div
      className="x-when-drop"
      role="listbox"
      aria-label={`Pilih ${label}`}
      ref={listRef}
      style={{
        position: "fixed",
        left: pos?.left ?? 8,
        top: pos?.top ?? 8,
        width: pos?.width ?? 200,
        zIndex: 100,
      }}
    >
      {suggestions.map((s) => (
        <button
          key={s.value}
          type="button"
          role="option"
          aria-selected={s.value === value}
          data-cur={s.value === value ? "1" : "0"}
          className={s.value === value ? "is-on" : ""}
          onMouseDown={(e) => {
            e.preventDefault();
            setErr("");
            onChange(s.value);
            setDraft(s.value);
            setOpen(false);
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="x-when-timewrap" ref={wrapRef}>
        <input
          id={id}
          className="x-input x-when-time"
          inputMode="numeric"
          placeholder="HH:MM"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          maxLength={5}
          aria-label={label}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          aria-autocomplete="list"
          onChange={(e) => {
            if (disabled) return;
            let v = e.target.value.replace(/[^\d:]/g, "").slice(0, 5);
            const firstColon = v.indexOf(":");
            if (firstColon !== -1) {
              v = v.slice(0, firstColon + 1) + v.slice(firstColon + 1).replace(/:/g, "");
            }
            if (/^\d{2}$/.test(v) && !draft.includes(":") && v.length > draft.length) {
              const h = parseInt(v, 10);
              if (h <= 23) v = `${v}:`;
            }
            setDraft(v);
            if (err) setErr("");
            setOpen(true);
          }}
          onBlur={() => {
            commit(draft);
            setOpen(false);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const base = normalizeHM(draft) ?? (/^\d{2}:\d{2}$/.test(value) ? value : null) ?? normalizeHM(value) ?? "09:00";
              const next = addMin(base, e.key === "ArrowUp" ? 15 : -15);
              setErr("");
              onChange(next);
              setDraft(next);
              setOpen(false);
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
              setOpen(false);
            } else if (e.key === "Escape") {
              setDraft(value);
              setErr("");
              setOpen(false);
            }
          }}
        />
        {open && !disabled && mounted && typeof document !== "undefined" ? createPortal(dropNode, document.body) : null}
      </div>
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
      <div className="x-when-event" aria-labelledby={`${idPrefix}-waktu-label`}>
        <div className="x-when-event-date">
          <DateField date={date} onDateChange={onDateChange} />
        </div>
        <TimeField id={`${idPrefix}-mulai`} label="Jam mulai" value={start} onChange={handleStart} />
        <TimeField id={`${idPrefix}-selesai`} label="Jam selesai" value={end} onChange={onEndChange} from={start} />
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
        style={{ opacity: noDeadline ? 0.45 : 1, pointerEvents: noDeadline ? "none" : "auto" }}
        aria-disabled={noDeadline}
      >
        <div className="x-when-taskrow-date">
          <DateField date={date} onDateChange={onDateChange} disabled={noDeadline} />
        </div>
        <div className="x-when-taskrow-time">
          <TimeField id={`${idPrefix}-jam`} label="Jam tenggat" value={time} onChange={onTimeChange} disabled={noDeadline} />
        </div>
      </div>
      <p className="x-when-summary" role="status">
        {summary}
      </p>
    </div>
  );
}
