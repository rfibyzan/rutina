"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MON_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function dpKey(y: number, m: number, d: number): string {
  return `${y}-${m}-${d}`;
}

interface Props {
  title: string;
  titleLabel: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseYear: number;
  baseMonth: number;
  weekStart: Date;
  agendaKeys: Set<string>;
  onPick: (d: Date) => void;
  onToday: () => void;
}

export function DatePicker({ title, titleLabel, open, onOpenChange, baseYear, baseMonth, weekStart, agendaKeys, onPick, onToday }: Props) {
  const [vy, setVy] = useState(baseYear);
  const [vm, setVm] = useState(baseMonth);
  const [mode, setMode] = useState<"day" | "month" | "year">("day");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVy(baseYear);
      setVm(baseMonth);
      setMode("day");
    }
  }, [open, baseYear, baseMonth]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onOpenChange]);

  const weekKeys = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      s.add(dpKey(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return s;
  }, [weekStart]);

  const [todayK, setTodayK] = useState<string | null>(null);
  useEffect(() => {
    const t = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayK(dpKey(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const blanks = (new Date(vy, vm, 1).getDay() + 6) % 7;

  const yearStart = vy - 6;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div className="x-datepick-wrap" ref={wrapRef}>
      <button
        type="button"
        className="x-datepick-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${titleLabel}: ${title}. Buka pemilih tanggal`}
        onClick={() => onOpenChange(!open)}
      >
        <span>{title}</span>
        <span className="x-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="x-datepick-pop" role="dialog" aria-modal="false" aria-label="Pilih tanggal">
          {mode === "day" && (
            <>
              <div className="x-dp-head">
                <button type="button" aria-label="Tahun sebelumnya" onClick={() => setVy((y) => y - 1)}>«</button>
                <button type="button" aria-label="Bulan sebelumnya" onClick={() => { if (vm === 0) { setVm(11); setVy((y) => y - 1); } else setVm(vm - 1); }}>‹</button>
                <span className="x-dp-title">
                  <button type="button" onClick={() => setMode("month")} aria-label="Pilih bulan">{MON_LONG[vm]}</button>
                  {" "}
                  <button type="button" onClick={() => setMode("year")} aria-label="Pilih tahun">{vy}</button>
                </span>
                <button type="button" aria-label="Bulan berikutnya" onClick={() => { if (vm === 11) { setVm(0); setVy((y) => y + 1); } else setVm(vm + 1); }}>›</button>
                <button type="button" aria-label="Tahun berikutnya" onClick={() => setVy((y) => y + 1)}>»</button>
              </div>
              <div className="x-dp-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
              <div className="x-dp-grid">
                {Array.from({ length: blanks }, (_, i) => <span key={`e${i}`} className="x-dp-empty" />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const k = dpKey(vy, vm, d);
                  const cls = ["x-dp-day"];
                  if (k === todayK) cls.push("is-today");
                  if (weekKeys.has(k)) cls.push("is-inweek");
                  return (
                    <button
                      key={d}
                      type="button"
                      className={cls.join(" ")}
                      aria-label={`${d} ${MON_LONG[vm]} ${vy}`}
                      onClick={() => { onPick(new Date(vy, vm, d)); onOpenChange(false); }}
                    >
                      <span>{d}</span>
                      {agendaKeys.has(k) && <i aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {mode === "month" && (
            <>
              <div className="x-dp-head">
                <button type="button" aria-label="Tahun sebelumnya" onClick={() => setVy((y) => y - 1)}>«</button>
                <span className="x-dp-title"><button type="button" onClick={() => setMode("year")} aria-label="Pilih tahun">{vy}</button></span>
                <button type="button" aria-label="Tahun berikutnya" onClick={() => setVy((y) => y + 1)}>»</button>
              </div>
              <div className="x-dp-months">
                {MON_SHORT.map((m, i) => (
                  <button key={m} type="button" className={`x-dp-m${i === vm ? " is-sel" : ""}`} onClick={() => { setVm(i); setMode("day"); }}>{m}</button>
                ))}
              </div>
            </>
          )}
          {mode === "year" && (
            <>
              <div className="x-dp-head">
                <button type="button" aria-label="Rentang tahun sebelumnya" onClick={() => setVy((y) => y - 12)}>«</button>
                <span className="x-dp-title">{yearStart}–{yearStart + 11}</span>
                <button type="button" aria-label="Rentang tahun berikutnya" onClick={() => setVy((y) => y + 12)}>»</button>
              </div>
              <div className="x-dp-months">
                {years.map((y) => (
                  <button key={y} type="button" className={`x-dp-m${y === vy ? " is-sel" : ""}`} onClick={() => { setVy(y); setMode("day"); }}>{y}</button>
                ))}
              </div>
            </>
          )}
          <div className="x-dp-foot">
            <button type="button" className="x-btn x-btn--outline x-btn--sm" style={{ width: "auto" }} onClick={() => { onToday(); onOpenChange(false); }}>Hari ini</button>
          </div>
        </div>
      )}
    </div>
  );
}
