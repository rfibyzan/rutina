"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PriorityChip,
  RsvpSegment,
  StatusChip,
} from "@/components/ui";
import { EventEditForm } from "@/components/event-edit-form";
import { TaskDetail } from "@/components/task-detail";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import type { EventItem, Priority, TaskItem } from "@/lib/data";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MON_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const FILTER_KEY = "rutina.calFilter";

interface CalFilter {
  groups: string[];
  showEvent: boolean;
  showTask: boolean;
  priorities: Priority[];
  statuses: ("approved" | "pending")[];
  hideDone: boolean;
}

const DEFAULT_FILTER: CalFilter = {
  groups: [],
  showEvent: true,
  showTask: true,
  priorities: [1, 2, 3, 4],
  statuses: ["approved", "pending"],
  hideDone: false,
};

function loadFilter(): CalFilter {
  try {
    const raw = window.localStorage.getItem(FILTER_KEY);
    if (!raw) return DEFAULT_FILTER;
    const p = JSON.parse(raw) as Partial<CalFilter>;
    return {
      groups: Array.isArray(p.groups) ? p.groups.filter((x) => typeof x === "string") : [],
      showEvent: p.showEvent !== false,
      showTask: p.showTask !== false,
      priorities: Array.isArray(p.priorities) && p.priorities.length > 0 ? (p.priorities.filter((x) => [1, 2, 3, 4].includes(x)) as Priority[]) : [1, 2, 3, 4],
      statuses: Array.isArray(p.statuses) && p.statuses.length > 0 ? (p.statuses.filter((x) => x === "approved" || x === "pending") as ("approved" | "pending")[]) : ["approved", "pending"],
      hideDone: !!p.hideDone,
    };
  } catch {
    return DEFAULT_FILTER;
  }
}

function mondayOf(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - shift);
  return c;
}

function isoWeek(d: Date): number {
  const c = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (c.getUTCDay() + 6) % 7;
  c.setUTCDate(c.getUTCDate() - day + 3);
  const jan4 = new Date(Date.UTC(c.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((c.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

function startDate(e: EventItem): Date | null {
  if (!e.startAt) return null;
  const d = new Date(e.startAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function taskDate(t: TaskItem): Date | null {
  if (!t.dueAt) return null;
  const d = new Date(t.dueAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function taskHM(t: TaskItem): string {
  const d = taskDate(t);
  if (!d) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function inMonth(d: Date, y: number, m: number): boolean {
  return d.getFullYear() === y && d.getMonth() === m;
}

function overlaps(a: EventItem, b: EventItem): boolean {
  if (!a.startAt || !a.endAt || !b.startAt || !b.endAt) return false;
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export default function KalenderPage() {
  const { ready, loadError, events, tasks, myGroups, reload, setRsvp, markAttendance, toggleCheck, openNew, deleteEvent, toggleTask } = useStore();
  const { say } = useToast();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(9);
  const [selected, setSelected] = useState(9);
  const [weekStart, setWeekStart] = useState(() => new Date(2026, 9, 5));
  const [weekDir, setWeekDir] = useState<1 | -1>(1);
  const [query, setQuery] = useState("");
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelEditing, setPanelEditing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<CalFilter>(DEFAULT_FILTER);
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const filterLoaded = useRef(false);

  useEffect(() => {
    const t = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelected(t.getDate());
    setWeekStart(mondayOf(t));
    try {
      setFilter(loadFilter());
    } catch {
      // abaikan
    }
    filterLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!filterLoaded.current) return;
    try {
      window.localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
    } catch {
      // abaikan
    }
  }, [filter]);

  // Grid 00:00-24:00: auto-scroll ke jam 07:00 saat pertama dibuka.
  useEffect(() => {
    const el = weekScrollRef.current;
    if (el) el.scrollTop = 7 * 44;
  }, []);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelected(1);
  };

  const shiftWeek = (delta: number) => {
    setWeekDir(delta >= 0 ? 1 : -1);
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const goToday = () => {
    setWeekDir(1);
    const t = new Date();
    setWeekStart(mondayOf(t));
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelected(t.getDate());
    say("Lompat ke minggu ini");
  };

  const allGroups = useMemo(() => {
    const map = new Map<string, string>();
    map.set("Pribadi", "#073693");
    for (const e of events) if (!map.has(e.group)) map.set(e.group, e.groupColor);
    for (const t of tasks) if (!map.has(t.group)) map.set(t.group, t.groupColor);
    for (const g of myGroups) if (!map.has(g.name)) map.set(g.name, g.color);
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [events, tasks, myGroups]);

  const activeGroups = filter.groups.length === 0 ? allGroups.map((g) => g.name) : filter.groups.filter((g) => allGroups.some((a) => a.name === g));

  const setF = (patch: Partial<CalFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const activeCount = useMemo(() => {
    let n = 0;
    if (filter.groups.length > 0 && filter.groups.length < allGroups.length) n += 1;
    if (!filter.showEvent || !filter.showTask) n += 1;
    if (filter.priorities.length < 4) n += 1;
    if (filter.statuses.length < 2) n += 1;
    if (filter.hideDone) n += 1;
    return n;
  }, [filter, allGroups.length]);

  const resetFilter = () => setFilter({ ...DEFAULT_FILTER, groups: [] });

  const toggleGroup = (name: string) => {
    setFilter((f) => {
      const base = f.groups.length === 0 ? allGroups.map((g) => g.name) : f.groups;
      const next = base.includes(name) ? base.filter((g) => g !== name) : [...base, name];
      if (next.length === allGroups.length) return { ...f, groups: [] };
      return { ...f, groups: next };
    });
  };

  const togglePriority = (p: Priority) => {
    setFilter((f) => ({
      ...f,
      priorities: f.priorities.includes(p) ? f.priorities.filter((x) => x !== p) : [...f.priorities, p],
    }));
  };

  const toggleStatus = (s: "approved" | "pending") => {
    setFilter((f) => ({
      ...f,
      statuses: f.statuses.includes(s) ? f.statuses.filter((x) => x !== s) : [...f.statuses, s],
    }));
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      events.filter((e) => {
        if (!filter.showEvent) return false;
        if (!activeGroups.includes(e.group)) return false;
        if (!filter.priorities.includes(e.priority)) return false;
        if (!filter.statuses.includes(e.status)) return false;
        if (filter.hideDone && e.attendance === "done") return false;
        if (q && !e.title.toLowerCase().includes(q)) return false;
        return true;
      }),
    [events, filter, activeGroups, q]
  );
  const visibleTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!filter.showTask) return false;
        if (!activeGroups.includes(t.group)) return false;
        if (!filter.priorities.includes(t.priority)) return false;
        if (filter.hideDone && t.done) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
      }),
    [tasks, filter, activeGroups, q]
  );
  const weekEvents = visible;
  const weekTasks = visibleTasks;

  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const [todayKey, setTodayKey] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayKey(dateKey(new Date()));
  }, []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );
  const weekKeySet = useMemo(() => new Set(weekDays.map(dateKey)), [weekDays]);
  const weekListEvents = useMemo(
    () => weekEvents.filter((e) => {
      const d = startDate(e);
      return d !== null && weekKeySet.has(dateKey(d));
    }),
    [weekEvents, weekKeySet]
  );
  const weekListTasks = useMemo(
    () => weekTasks.filter((t) => {
      const d = taskDate(t);
      return d !== null && weekKeySet.has(dateKey(d));
    }),
    [weekTasks, weekKeySet]
  );

  const byId = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);

  // Panel detail: hanya event minggu yang tampil. Jangan ambil dari minggu lain.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (panelId === null && weekListEvents.length > 0) setPanelId(weekListEvents[0].id);
  }, [panelId, weekListEvents]);
  useEffect(() => {
    if (panelId === null) return;
    const cur = byId[panelId];
    const d = cur ? startDate(cur) : null;
    const inWeek = !!cur && !!d && weekKeySet.has(dateKey(d));
    if ((!cur || !inWeek) && weekListEvents.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelId(weekListEvents[0].id);
    } else if ((!cur || !inWeek) && weekListEvents.length === 0) {
      setPanelId(null);
    }
  }, [panelId, byId, weekListEvents, weekKeySet]);

  // Agenda berikutnya di luar minggu tampil (untuk pesan + tombol Lompat).
  const nextAgenda = useMemo(() => {
    if (weekListEvents.length > 0 || weekListTasks.length > 0) return null;
    const weekEnd = new Date(weekDays[6].getFullYear(), weekDays[6].getMonth(), weekDays[6].getDate(), 23, 59, 59);
    const cands: { at: Date; label: string }[] = [];
    for (const e of weekEvents) {
      const d = startDate(e);
      if (d) cands.push({ at: d, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" }) });
    }
    for (const t of weekTasks) {
      const d = taskDate(t);
      if (d) cands.push({ at: d, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" }) });
    }
    if (cands.length === 0) return null;
    cands.sort((a, b) => a.at.getTime() - b.at.getTime());
    const future = cands.find((c) => c.at.getTime() > weekEnd.getTime());
    if (future) return future;
    return cands[cands.length - 1];
  }, [weekEvents, weekTasks, weekDays, weekListEvents.length, weekListTasks.length]);

  const monthCells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const blanks = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: { date: number | null; key: string }[] = [];
    for (let i = 0; i < blanks; i += 1) cells.push({ date: null, key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d += 1) cells.push({ date: d, key: `d${d}` });
    return cells;
  }, [viewYear, viewMonth]);

  const idsByDate = useMemo(() => {
    const map = new Map<number, EventItem[]>();
    for (const e of visible) {
      const d = startDate(e);
      if (!d || !inMonth(d, viewYear, viewMonth)) continue;
      const list = map.get(d.getDate()) ?? [];
      list.push(e);
      map.set(d.getDate(), list);
    }
    return map;
  }, [visible, viewYear, viewMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<number, TaskItem[]>();
    for (const t of visibleTasks) {
      const d = taskDate(t);
      if (!d || !inMonth(d, viewYear, viewMonth)) continue;
      const list = map.get(d.getDate()) ?? [];
      list.push(t);
      map.set(d.getDate(), list);
    }
    return map;
  }, [visibleTasks, viewYear, viewMonth]);

  const dayEvents = useMemo(() => idsByDate.get(selected) ?? [], [idsByDate, selected]);
  const dayTasks = useMemo(() => tasksByDate.get(selected) ?? [], [tasksByDate, selected]);

  const panel: EventItem | undefined = panelId ? byId[panelId] : undefined;
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
  }, []);
  const panelStarted = !!panel?.startAt && nowMs !== null ? new Date(panel.startAt as string).getTime() <= (nowMs as number) : false;

  const selDate = new Date(viewYear, viewMonth, selected);
  const selLabel = selDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const monthTitle = `${MON_LONG[viewMonth]} ${viewYear}`;

  const filterForm = (
    <div className="x-filter-form">
      <div className="x-filter-row-head">
        <b>Filter</b>
        <button type="button" className="x-btn x-btn--ghost x-btn--sm" style={{ width: "auto" }} onClick={resetFilter}>
          Reset
        </button>
      </div>
      <p className="x-sec">Grup</p>
      <label className="x-fcheck">
        <input
          type="checkbox"
          checked={filter.groups.length === 0}
          onChange={() => setF({ groups: [] })}
        />
        <span>Semua</span>
      </label>
      {allGroups.map((g) => {
        const checked = activeGroups.includes(g.name);
        return (
          <label key={g.name} className="x-fcheck">
            <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.name)} />
            <i style={{ background: g.color }} aria-hidden="true" />
            <span>{g.name}</span>
          </label>
        );
      })}
      <p className="x-sec">Jenis</p>
      <label className="x-fcheck">
        <input type="checkbox" checked={filter.showEvent} onChange={(e) => setF({ showEvent: e.target.checked })} />
        <span>Event</span>
      </label>
      <label className="x-fcheck">
        <input type="checkbox" checked={filter.showTask} onChange={(e) => setF({ showTask: e.target.checked })} />
        <span>Tugas</span>
      </label>
      <p className="x-sec">Prioritas</p>
      <div className="x-chips" style={{ marginTop: 0 }}>
        {([1, 2, 3, 4] as Priority[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`x-chip${filter.priorities.includes(p) ? " is-on" : ""}`}
            aria-pressed={filter.priorities.includes(p)}
            onClick={() => togglePriority(p)}
          >
            P{p}
          </button>
        ))}
      </div>
      <p className="x-sec">Status event</p>
      <label className="x-fcheck">
        <input type="checkbox" checked={filter.statuses.includes("approved")} onChange={() => toggleStatus("approved")} />
        <span>Disetujui</span>
      </label>
      <label className="x-fcheck">
        <input type="checkbox" checked={filter.statuses.includes("pending")} onChange={() => toggleStatus("pending")} />
        <span>Menunggu</span>
      </label>
      <p className="x-sec">Lainnya</p>
      <label className="x-fcheck">
        <input type="checkbox" checked={filter.hideDone} onChange={(e) => setF({ hideDone: e.target.checked })} />
        <span>Sembunyikan yang selesai</span>
      </label>
    </div>
  );

  const mobile = (
    <div className="r-screen">
      <h2 className="x-h">Kalender</h2>
      <div className="x-month">
        <h3>{monthTitle}</h3>
        <div className="x-pager">
          <button type="button" aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="x-grid" role="grid" aria-label={monthTitle}>
        {DOW.map((d) => (
          <span key={d} className="x-dow">
            {d}
          </span>
        ))}
        {monthCells.map((c) =>
          c.date === null ? (
            <span key={c.key} className="x-day is-empty" />
          ) : (
            <button
              key={c.key}
              type="button"
              className={`x-day${c.date === selected ? " is-sel" : ""}`}
              aria-pressed={c.date === selected}
              aria-label={`${c.date} ${monthTitle}`}
              onClick={() => setSelected(c.date as number)}
            >
              {c.date}
              {(idsByDate.get(c.date) ?? []).length + (tasksByDate.get(c.date) ?? []).length > 0 && (
                <i style={{ ["--c" as string]: (idsByDate.get(c.date) ?? [])[0]?.groupColor ?? (tasksByDate.get(c.date) ?? [])[0]?.groupColor }} />
              )}
            </button>
          )
        )}
      </div>
      <div className="x-frow" role="group" aria-label="Filter kalender">
        <button type="button" className="x-chip" onClick={() => setSheetOpen(true)}>
          Filter{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button
          type="button"
          className={`x-chip${filter.showEvent ? " is-on" : ""}`}
          aria-pressed={filter.showEvent}
          onClick={() => setF({ showEvent: !filter.showEvent })}
        >
          Event
        </button>
        <button
          type="button"
          className={`x-chip${filter.showTask ? " is-on" : ""}`}
          aria-pressed={filter.showTask}
          onClick={() => setF({ showTask: !filter.showTask })}
        >
          Tugas
        </button>
        <button
          type="button"
          className={`x-chip${filter.hideDone ? " is-on" : ""}`}
          aria-pressed={filter.hideDone}
          onClick={() => setF({ hideDone: !filter.hideDone })}
        >
          Sembunyikan selesai
        </button>
        {activeCount > 0 && (
          <button type="button" className="x-chip" onClick={resetFilter}>
            Reset
          </button>
        )}
      </div>
      <div className="x-field">
        <input
          className="x-input"
          type="search"
          placeholder="Cari agenda..."
          aria-label="Cari agenda"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="x-sec">{selDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={reload} />
      ) : dayEvents.length === 0 && dayTasks.length === 0 ? (
        <EmptyState text={`Tidak ada agenda pada ${selLabel} untuk filter saat ini.`} />
      ) : (
        <div className="x-card">
          {dayEvents.map((e, i) => (
            <Link key={e.id} href={`/event/${e.id}`} className="x-mini x-rise" style={{ ["--c" as string]: e.groupColor, ["--i" as string]: i, textDecoration: "none", color: "inherit" }}>
              <i />
              <b>{e.start}</b>
              {e.title}
            </Link>
          ))}
          {dayTasks.map((t, i) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setTaskId(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTaskId(t.id);
                }
              }}
              className={`x-mini x-rise${t.done ? " is-done" : ""}`}
              style={{ ["--c" as string]: t.groupColor, ["--i" as string]: dayEvents.length + i, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Selesaikan ${t.title}`}
                style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
              />
              <b>{taskHM(t)}</b>
              <span className="x-task-title">{t.title}</span>
              <span className="x-tag">Tenggat</span>
            </div>
          ))}
        </div>
      )}
      {sheetOpen && (
        <div className="x-modal-back" onClick={(e) => { if (e.target === e.currentTarget) setSheetOpen(false); }}>
          <div className="x-modal" role="dialog" aria-modal="true" aria-label="Filter kalender">
            <div className="x-modal-head">
              <b style={{ flex: 1 }}>Filter</b>
              <button type="button" className="x-modal-x" aria-label="Tutup" onClick={() => setSheetOpen(false)}>
                ✕
              </button>
            </div>
            {filterForm}
            <div style={{ marginTop: 16 }}>
              <button type="button" className="x-btn" onClick={() => setSheetOpen(false)}>
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const weekBlock = (e: EventItem, i = 0) => {
    const d = startDate(e);
    if (!d) return null;
    const s = d.getHours() + d.getMinutes() / 60;
    const dur = e.startAt && e.endAt
      ? Math.max(0.5, (new Date(e.endAt).getTime() - new Date(e.startAt).getTime()) / 3600000)
      : 1;
    const style = { "--c": e.groupColor, "--s": s, "--h": dur, "--i": i } as React.CSSProperties;
    const clash = weekEvents.some((o) => o.id !== e.id && overlaps(o, e));
    return (
      <button
        key={e.id}
        type="button"
        className={`x-ev x-rise${e.status === "pending" ? " x-ev--wait" : ""}${panelId === e.id ? " is-sel" : ""}`}
        style={style}
        onClick={(ev) => { ev.stopPropagation(); setPanelId(e.id); }}
        aria-label={`${e.title} ${e.start}-${e.end}`}
      >
        <b>{e.title}</b>
        <time>{`${e.start}-${e.end}`}</time>
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <PriorityChip value={e.priority} short />
          {clash && <span className="x-flag x-flag--bad">Bentrok</span>}
          {e.status === "pending" && <span className="x-flag">Menunggu</span>}
        </span>
      </button>
    );
  };

  const weekTaskBlock = (t: TaskItem, i = 0) => {
    const d = taskDate(t);
    if (!d) return null;
    const s = Math.min(d.getHours() + d.getMinutes() / 60, 23);
    const style = { "--c": t.groupColor, "--s": s, "--i": i } as React.CSSProperties;
    return (
      <div
        key={t.id}
        className={`x-task x-rise${t.done ? " is-done" : ""}`}
        style={{ ...style, cursor: "pointer" }}
        onClick={(ev) => { ev.stopPropagation(); setTaskId(t.id); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setTaskId(t.id);
          }
        }}
        aria-label={`Tenggat ${t.title} ${taskHM(t)}`}
      >
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => toggleTask(t.id)}
          aria-label={`Selesaikan ${t.title}`}
          onClick={(ev) => ev.stopPropagation()}
        />
        <span className="x-task-title">{t.title}</span>
        <time>Tenggat {taskHM(t)}</time>
      </div>
    );
  };

  const slotNew = (day: Date, ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest(".x-ev") || (ev.target as HTMLElement).closest(".x-task")) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const hour = Math.min(23, Math.max(0, Math.floor((ev.clientY - rect.top) / 44)));
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    openNew({ tab: "event", date: iso, start: `${pad(hour)}:00`, end: hour >= 23 ? "23:59" : `${pad(hour + 1)}:00` });
  };

  const weekCols = weekDays.map((day, di) => {
    const key = dateKey(day);
    return (
      <div
        key={key}
        className={`x-col${key === todayKey ? " is-today" : ""}`}
        onClick={(ev) => slotNew(day, ev)}
        role="button"
        aria-label={`Tambah event ${day.getDate()} ${MON_LONG[day.getMonth()]}`}
      >
        {weekEvents.filter((e) => {
          const d = startDate(e);
          return d !== null && dateKey(d) === key;
        }).map((e, i) => weekBlock(e, di * 2 + i))}
        {weekTasks.filter((t) => {
          const d = taskDate(t);
          return d !== null && dateKey(d) === key;
        }).map((t, i) => weekTaskBlock(t, di * 2 + i))}
      </div>
    );
  });
  const weekHead = weekDays.map((d, i) => {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return (
      <div key={key} className={key === todayKey ? "is-today x-today-pulse" : ""}>{DOW[i]}<b>{d.getDate()}</b></div>
    );
  });
  const weekTitle = `${MON_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}, Minggu ${isoWeek(weekStart)}`;
  const weekEmpty = weekListEvents.length === 0 && weekListTasks.length === 0;
  const hasAnything = events.length > 0 || tasks.length > 0;

  const desktop = (
    <>
      <div className="x-top">
        <h2>{weekTitle}</h2>
        <button type="button" className="x-btn x-btn--outline x-arw" aria-label="Minggu sebelumnya" onClick={() => shiftWeek(-1)}>
          ‹
        </button>
        <button type="button" className="x-btn x-btn--outline x-arw" aria-label="Minggu berikutnya" onClick={() => shiftWeek(1)}>
          ›
        </button>
        <button type="button" className="x-btn x-btn--outline" onClick={goToday}>
          Hari ini
        </button>
        <div className="x-filter-wrap">
          <button type="button" className="x-btn x-btn--outline" style={{ width: "auto" }} aria-expanded={filterOpen} onClick={() => setFilterOpen((v) => !v)}>
            Filter{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          {filterOpen && (
            <div className="x-filter-pop" role="dialog" aria-label="Filter kalender">
              {filterForm}
            </div>
          )}
        </div>
        <input
          className="x-input"
          type="search"
          placeholder="Cari agenda..."
          aria-label="Cari agenda"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="x-calbody">
        <div className="x-wk">
          <div className="x-wk-head">
            <span />
            {weekHead}
          </div>
          <div className="x-wk-body" ref={weekScrollRef}>
            <div className="x-hrs">
              {HOURS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            <div key={weekStart.toISOString()} className={`x-wk-slide${weekDir >= 0 ? " is-r" : " is-l"}`} style={{ display: "contents" }}>
              {weekCols}
            </div>
          </div>
          {ready && !loadError && weekEmpty && (
            <div style={{ marginTop: 12 }}>
              {q ? (
                <EmptyState text={`Tidak ada agenda berjudul "${query}" untuk filter saat ini.`} />
              ) : !hasAnything ? (
                <EmptyState text="Belum ada agenda di Supabase. Tambah lewat tombol + Baru di sidebar." />
              ) : nextAgenda ? (
                <div className="x-empty" role="status">
                  Minggu ini kosong untuk filter saat ini. Agenda berikutnya: {nextAgenda.label}
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="x-btn x-btn--outline x-btn--sm"
                      style={{ width: "auto" }}
                      onClick={() => { setWeekDir(1); setWeekStart(mondayOf(nextAgenda.at)); }}
                    >
                      Lompat
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState text="Minggu ini kosong untuk filter saat ini." />
              )}
            </div>
          )}
        </div>
        <aside className="x-panel x-detail" aria-label="Detail event">
          {!ready ? (
            <LoadingSkeleton />
          ) : loadError ? (
            <ErrorState text={loadError} onRetry={reload} />
          ) : panel ? (
            <>
              <h2>{panel.title}</h2>
              <p className="x-sub">
                {panel.dateLabel} · {panel.start}-{panel.end} · {panel.group}
              </p>
              <div className="x-chips">
                <PriorityChip value={panel.priority} />
                <StatusChip status={panel.status} />
              </div>
              <p className="x-sub" style={{ marginTop: 8 }}>{panel.note || "Agenda pribadi."}</p>
              <p className="x-sec">Kehadiran</p>
              <RsvpSegment value={panel.rsvp} onChange={(v) => { setRsvp(panel.id, v); say(`RSVP ${panel.title}: ${v}`); }} />
              {!panelStarted && (
                <p className="x-sub" style={{ marginTop: 8 }}>
                  Presensi dibuka saat acara dimulai.
                </p>
              )}
              <p className="x-sec">Peserta</p>
              <div className="x-people">
                {panel.attendees.map((a) => (
                  <span key={a}>{a}</span>
                ))}
                {panel.extraAttendees > 0 && <span>+{panel.extraAttendees}</span>}
              </div>
              <p className="x-sec">Checklist</p>
              {panel.checklist.map((c, i) => (
                <label key={c.label} className="x-check">
                  <input type="checkbox" checked={c.done} onChange={() => toggleCheck(panel.id, i)} />
                  <span>{c.label}</span>
                </label>
              ))}
              {panelStarted && (
                <div className="x-btns" style={{ margin: "14px 0 16px" }}>
                  <button type="button" className={`x-btn${panel.attendance === "done" ? " is-done" : ""}`} onClick={() => { markAttendance(panel.id, "done"); say(`${panel.title} ditandai selesai`); }}>
                    Tandai Selesai
                  </button>
                  <button type="button" className="x-btn x-btn--outline" onClick={() => { markAttendance(panel.id, "absent"); say(`Ketidakhadiran ${panel.title} dicatat`); }}>
                    Tidak Hadir
                  </button>
                </div>
              )}
              <div className="x-btns" style={{ margin: "14px 0 16px" }}>
                <button type="button" className="x-btn x-btn--outline" onClick={() => setPanelEditing(true)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="x-btn x-btn--ghost"
                  onClick={() => {
                    if (window.confirm(`Hapus ${panel.title}?`)) {
                      deleteEvent(panel.id).then((ok) => {
                        if (ok) {
                          setPanelId(null);
                          say(`${panel.title} dihapus`);
                        }
                      });
                    }
                  }}
                >
                  Hapus
                </button>
              </div>
              <p className="x-sub">
                Butuh tindakan? <Link href="/persetujuan">Buka antrean persetujuan</Link>
              </p>
            </>
          ) : (
            <EmptyState text="Pilih event di kalender untuk melihat detail." />
          )}
        </aside>
      </div>
      {panelEditing && panel && (
        <div className="x-modal-back" onClick={(e) => { if (e.target === e.currentTarget) setPanelEditing(false); }}>
          <div className="x-modal" role="dialog" aria-modal="true" aria-label={`Edit ${panel.title}`}>
            <EventEditForm event={panel} onDone={() => setPanelEditing(false)} />
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <MobileShell>{mobile}</MobileShell>
      <DesktopShell>{desktop}</DesktopShell>
      <TaskDetail taskId={taskId} onClose={() => setTaskId(null)} />
    </>
  );
}
