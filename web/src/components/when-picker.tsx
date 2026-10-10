"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";

const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DOW_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
// Senin=0..Minggu=6 untuk label Indonesia
const DOW_MON0 = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

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

function normalizeHM(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return null;
  const hh = parseInt(digits.slice(0, digits.length - 2), 10);
  const mm = parseInt(digits.slice(-2), 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh > 23 || mm > 59) return null;
  return `${pad(hh)}:${pad(mm)}`;
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
}

const SLOTS_30 = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`);

function TimeField({
  id,
  label,
  value,
  onChange,
  quicks,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  quicks: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    // Scroll ke jam terdekat
    const t = window.setTimeout(() => {
      const el = listRef.current?.querySelector("[data-cur='1']");
      el?.scrollIntoView({ block: "center" });
    }, 30);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const commit = (raw: string) => {
    const n = normalizeHM(raw);
    if (n) onChange(n);
    else setDraft(value);
  };

  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
        {label}
      </label>
      <div className="x-when-timewrap" ref={wrapRef}>
        <input
          id={id}
          className="x-input x-when-time"
          inputMode="numeric"
          placeholder="HH:MM"
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            const f = autoFormat(e.target.value);
            setDraft(f);
            const n = normalizeHM(f);
            if (n) onChange(n);
          }}
          onBlur={() => commit(draft)}
          onFocus={() => setOpen(true)}
          aria-autocomplete="list"
          maxLength={5}
        />
        {open && (
          <div className="x-when-drop" role="listbox" aria-label={`Pilih ${label}`} ref={listRef}>
            {SLOTS_30.map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={s === value}
                data-cur={s === value ? "1" : "0"}
                className={s === value ? "is-on" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                  setDraft(s);
                  setOpen(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {quicks.length > 0 && (
        <div className="x-when-quicks" role="group" aria-label={`Jam cepat ${label}`}>
          {quicks.map((q) => (
            <button
              key={q.label + q.value}
              type="button"
              className={`x-chip${q.value === value ? " is-on" : ""}`}
              aria-pressed={q.value === value}
              onClick={() => {
                onChange(q.value);
                setDraft(q.value);
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useDateChips() {
  return useMemo(() => {
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const plus = (n: number) => {
      const d = new Date(t0);
      d.setDate(d.getDate() + n);
      return d;
    };
    const dToday = plus(0);
    const dBesok = plus(1);
    const dLusa = plus(2);
    // Chip dinamis: Sen–Jum -> "Sabtu ini", Sab–Min -> "Senin depan"
    const mon0 = (t0.getDay() + 6) % 7; // Senin=0
    let dFlex: Date;
    let flexLabel: string;
    if (mon0 <= 4) {
      dFlex = plus(5 - mon0); // Sabtu minggu ini
      flexLabel = "Sabtu ini";
    } else {
      const delta = (7 - mon0) % 7 || 7; // Senin depan
      dFlex = plus(delta === 0 ? 7 : delta);
      flexLabel = "Senin depan";
    }
    void DOW_MON0;
    return [
      { label: "Hari ini", date: toYMD(dToday), sub: fmtShort(dToday) },
      { label: "Besok", date: toYMD(dBesok), sub: fmtShort(dBesok) },
      { label: "Lusa", date: toYMD(dLusa), sub: fmtShort(dLusa) },
      { label: flexLabel, date: toYMD(dFlex), sub: fmtShort(dFlex) },
    ];
  }, []);
}

function DateChips({
  idPrefix,
  date,
  onDateChange,
}: {
  idPrefix: string;
  date: string;
  onDateChange: (d: string) => void;
}) {
  const chips = useDateChips();
  const [calOpen, setCalOpen] = useState(false);
  const cur = parseYMD(date);
  const base = cur ?? new Date();
  return (
    <div>
      <span id={`${idPrefix}-tgl-label`} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
        Tanggal{cur ? `: ${fmtShort(cur)}` : ""}
      </span>
      <div className="x-when-quicks x-when-dates" role="group" aria-labelledby={`${idPrefix}-tgl-label`}>
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            className={`x-chip${c.date === date ? " is-on" : ""}`}
            aria-pressed={c.date === date}
            title={c.sub}
            onClick={() => onDateChange(c.date)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className={`x-chip${calOpen ? " is-on" : ""}`}
          aria-expanded={calOpen}
          onClick={() => setCalOpen((v) => !v)}
        >
          Pilih tanggal
        </button>
      </div>
      {calOpen && (
        <div className="x-when-cal">
          <DatePicker
            title={cur ? fmtShort(cur) : "Pilih tanggal"}
            titleLabel="Tanggal"
            open
            onOpenChange={() => setCalOpen(false)}
            baseYear={base.getFullYear()}
            baseMonth={base.getMonth()}
            weekStart={cur ?? new Date()}
            agendaKeys={new Set<string>()}
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
      )}
    </div>
  );
}

const EVENT_QUICKS = [
  { label: "08:00", value: "08:00" },
  { label: "12:00", value: "12:00" },
  { label: "15:00", value: "15:00" },
  { label: "19:00", value: "19:00" },
];

const TASK_QUICKS = [
  { label: "08:00", value: "08:00" },
  { label: "12:00", value: "12:00" },
  { label: "15:00", value: "15:00" },
  { label: "19:00", value: "19:00" },
  { label: "Akhir hari", value: "23:59" },
];

const DURATIONS = [
  { label: "30 mnt", mins: 30 },
  { label: "1 jam", mins: 60 },
  { label: "1,5 jam", mins: 90 },
  { label: "2 jam", mins: 120 },
];

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
  return (
    <div className="x-when">
      <DateChips idPrefix={idPrefix} date={date} onDateChange={onDateChange} />
      <div className="x-when-times">
        <TimeField id={`${idPrefix}-mulai`} label="Mulai" value={start} onChange={onStartChange} quicks={[]} />
        <TimeField id={`${idPrefix}-selesai`} label="Selesai" value={end} onChange={onEndChange} quicks={[]} />
      </div>
      <div className="x-when-quicks x-when-combo" role="group" aria-label="Jam cepat dan durasi">
        {EVENT_QUICKS.map((q) => (
          <button
            key={q.label + q.value}
            type="button"
            className={`x-chip${q.value === start ? " is-on" : ""}`}
            aria-pressed={q.value === start}
            onClick={() => onStartChange(q.value)}
          >
            {q.label}
          </button>
        ))}
        {DURATIONS.map((d) => {
          const active = dur === d.mins;
          return (
            <button
              key={d.label}
              type="button"
              className={`x-chip${active ? " is-on" : ""}`}
              aria-pressed={active}
              onClick={() => {
                if (start) onEndChange(addMin(start, d.mins));
              }}
            >
              {d.label}
            </button>
          );
        })}
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
      <label className="x-fcheck" style={{ marginBottom: 4 }}>
        <input
          type="checkbox"
          checked={noDeadline}
          onChange={(e) => onNoDeadlineChange(e.target.checked)}
        />
        <span>Tanpa tenggat</span>
      </label>
      <div style={{ opacity: noDeadline ? 0.45 : 1, pointerEvents: noDeadline ? "none" : "auto" }} aria-disabled={noDeadline}>
        <DateChips idPrefix={idPrefix} date={date} onDateChange={onDateChange} />
        <div style={{ marginTop: 8 }}>
          <TimeField id={`${idPrefix}-jam`} label="Jam tenggat" value={time} onChange={onTimeChange} quicks={TASK_QUICKS} />
        </div>
      </div>
      <p className="x-when-summary" role="status">
        {summary}
      </p>
    </div>
  );
}
