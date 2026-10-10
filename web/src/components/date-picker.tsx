"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  variant?: "title" | "field";
  disabled?: boolean;
}

export function DatePicker({ title, titleLabel, open, onOpenChange, baseYear, baseMonth, weekStart, agendaKeys, onPick, onToday, variant, disabled }: Props) {
  const [vy, setVy] = useState(baseYear);
  const [vm, setVm] = useState(baseMonth);
  const [mode, setMode] = useState<"day" | "month" | "year">("day");
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const isField = variant === "field";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const popW = Math.min(300, window.innerWidth * 0.82);
    const measuredH = popRef.current?.getBoundingClientRect().height;
    const popH = measuredH && measuredH > 0 ? measuredH : 360;
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const isUp = below < popH && above > below;
    let top = isUp ? r.top - popH - 8 : r.bottom + 8;
    if (popH >= window.innerHeight - 16) {
      top = 8;
    } else {
      top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));
    }
    const left = Math.max(8, Math.min(r.left, window.innerWidth - popW - 8));
    setPos({ left, top, width: popW });
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVy(baseYear);
      setVm(baseMonth);
      setMode("day");
    }
  }, [open, baseYear, baseMonth]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(null);
      return;
    }
    updatePos();
    const raf = window.requestAnimationFrame(() => updatePos());
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onOpenChange, updatePos, mode, vy, vm]);

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

  const popNode = (
    <div
      ref={popRef}
      className="x-datepick-pop"
      data-portal="datepicker"
      role="dialog"
      aria-modal="false"
      aria-label="Pilih tanggal"
      style={{
        position: "fixed",
        fontFamily: "var(--x-font)",
        color: "var(--ink)",
        boxSizing: "border-box",
        left: pos?.left ?? 8,
        top: pos?.top ?? 8,
        width: pos?.width ?? Math.min(300, typeof window !== "undefined" ? window.innerWidth * 0.82 : 300),
        zIndex: 100,
      }}
    >
      {mode === "day" && (
        <>
          <div className="x-dp-head" style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 2 }}>
            <button type="button" aria-label="Tahun sebelumnya" onClick={() => setVy((y) => y - 1)}>«</button>
            <button type="button" aria-label="Bulan sebelumnya" onClick={() => { if (vm === 0) { setVm(11); setVy((y) => y - 1); } else setVm(vm - 1); }}>‹</button>
            <span className="x-dp-title" style={{ flex: 1, minWidth: 0, display: "inline-flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap", gap: 2 }}>
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
          <div className="x-dp-head" style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 2 }}>
            <button type="button" aria-label="Tahun sebelumnya" onClick={() => setVy((y) => y - 1)}>«</button>
            <span className="x-dp-title" style={{ flex: 1, minWidth: 0, display: "inline-flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap", gap: 2 }}><button type="button" onClick={() => setMode("year")} aria-label="Pilih tahun">{vy}</button></span>
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
          <div className="x-dp-head" style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 2 }}>
            <button type="button" aria-label="Rentang tahun sebelumnya" onClick={() => setVy((y) => y - 12)}>«</button>
            <span className="x-dp-title" style={{ flex: 1, minWidth: 0, display: "inline-flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap", gap: 2 }}>{yearStart}–{yearStart + 11}</span>
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
  );

  return (
    <div className={`x-datepick-wrap${isField ? " x-datepick-wrap--field" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className={isField ? "x-datepick-btn x-datepick-btn--field" : "x-datepick-btn"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${titleLabel}: ${title}. Buka pemilih tanggal`}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onOpenChange(!open);
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <span className="x-caret" aria-hidden="true">
          {isField ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="2" />
              <path d="M2 6.5h12" />
              <path d="M5.5 1.8v2.4M10.5 1.8v2.4" />
            </svg>
          ) : (
            "▾"
          )}
        </span>
      </button>
      {open && mounted && typeof document !== "undefined" ? createPortal(popNode, document.body) : null}
    </div>
  );
}
