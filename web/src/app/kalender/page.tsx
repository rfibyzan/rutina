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
import { TaskDetail, TaskDetailBody } from "@/components/task-detail";
import { DesktopShell, MobileShell } from "@/components/shell";
import { DatePicker } from "@/components/date-picker";
import { layoutDay, type DaySrc } from "@/components/cal-layout";
import { useStore, useToast } from "@/lib/store";
import type { EventItem, Priority, TaskItem } from "@/lib/data";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MON_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const FILTER_KEY = "rutina.calFilter";
const ZOOM_KEY = "rutina.calZoom";

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

function loadZoom(): "fit" | "detail" {
  try {
    return window.localStorage.getItem(ZOOM_KEY) === "detail" ? "detail" : "fit";
  } catch {
    return "fit";
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

function endDate(e: EventItem): Date | null {
  if (!e.endAt) return null;
  const d = new Date(e.endAt);
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
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [alldayOpen, setAlldayOpen] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<CalFilter>(DEFAULT_FILTER);
  const [calZoom, setCalZoom] = useState<"fit" | "detail">("fit");
  const [hourHeight, setHourHeight] = useState(44);
  const [bodyW, setBodyW] = useState(0);
  const [groupOpen, setGroupOpen] = useState<{ day: string; startMin: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mPickerOpen, setMPickerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState<{ day: string; cluster: number } | null>(null);
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
      setCalZoom(loadZoom());
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

  useEffect(() => {
    if (!filterLoaded.current) return;
    try {
      window.localStorage.setItem(ZOOM_KEY, calZoom);
    } catch {
      // abaikan
    }
  }, [calZoom]);

  // B: tinggi per jam — fit = tinggi body/24 agar grid 24 jam pas layar, detail 64px.
  useEffect(() => {
    if (calZoom !== "fit") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHourHeight(64);
      return;
    }
    const el = weekScrollRef.current;
    if (!el) return;
    const compute = () => {
      const h = el.clientHeight;
      if (h > 0) setHourHeight(Math.max(22, h / 24));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [calZoom, ready]);

  // Lebar body untuk aturan kolom minimum 64px.
  useEffect(() => {
    const el = weekScrollRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w > 0) setBodyW(w);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

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

  const pickDate = (d: Date) => {
    setWeekDir(1);
    setWeekStart(mondayOf(d));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelected(d.getDate());
  };

  // A: pintasan keyboard desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable || t.closest("input,textarea,select,[contenteditable='true']"))) return;
      if (document.querySelector(".x-modal")) return;
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === "t" || k === "T") {
        e.preventDefault();
        goToday();
      } else if (k === "ArrowLeft") {
        e.preventDefault();
        shiftWeek(-1);
      } else if (k === "ArrowRight") {
        e.preventDefault();
        shiftWeek(1);
      } else if (k === "g" || k === "G") {
        e.preventDefault();
        setPickerOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Tutup popover +N / grup tugas / tenggat hari ini dengan Esc / klik luar.
  useEffect(() => {
    if (!overflowOpen && !groupOpen && !alldayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOverflowOpen(null);
        setGroupOpen(null);
        setAlldayOpen(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".x-more-pop") && !el.closest(".x-more") && !el.closest(".x-tgroup") && !el.closest(".x-tg-pop") && !el.closest(".x-allday-pop") && !el.closest(".x-allday-more")) {
        setOverflowOpen(null);
        setGroupOpen(null);
        setAlldayOpen(null);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [overflowOpen, groupOpen, alldayOpen]);

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  // B: klik tugas membuka detail di panel kanan (desktop) atau modal/sheet (mobile).
  const openTask = (id: string) => {
    if (isDesktop()) {
      setPanelId(null);
      setPanelTaskId(id);
    } else {
      setTaskId(id);
    }
  };
  const openEvent = (id: string) => {
    setPanelTaskId(null);
    setPanelId(id);
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
  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  // A4: tugas "tenggat hari ini" = bertenggat 23:59 pada hari itu. Tampil di
  // baris all-day, tidak digambar lagi di grid jam.
  const isAllDayTask = (t: TaskItem): boolean => taskHM(t) === "23:59";
  const allDayByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of weekListTasks) {
      if (!isAllDayTask(t)) continue;
      const d = taskDate(t);
      if (!d) continue;
      const k = dateKey(d);
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.title.localeCompare(b.title));
    return map;
  }, [weekListTasks]);
  const hasAllDay = allDayByDay.size > 0;
  // Tugas grid = visible minggu ini minus yang sudah di baris all-day.
  const gridTasksByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of weekListTasks) {
      if (isAllDayTask(t)) continue;
      const d = taskDate(t);
      if (!d) continue;
      const k = dateKey(d);
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    return map;
  }, [weekListTasks]);

  // Panel detail: hanya event/tugas minggu yang tampil. Jangan ambil dari minggu lain.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (panelId === null && panelTaskId === null && weekListEvents.length > 0) setPanelId(weekListEvents[0].id);
  }, [panelId, panelTaskId, weekListEvents]);
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
  useEffect(() => {
    if (panelTaskId === null) return;
    const cur = taskById[panelTaskId];
    const d = cur ? taskDate(cur) : null;
    const inWeek = !!cur && !!d && weekKeySet.has(dateKey(d));
    if (!cur || !inWeek) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelTaskId(null);
    }
  }, [panelTaskId, taskById, weekKeySet]);

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
  const panelTask = panelTaskId ? taskById[panelTaskId] : undefined;
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
    const iv = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(iv);
  }, []);
  const panelStarted = !!panel?.startAt && nowMs !== null ? new Date(panel.startAt as string).getTime() <= (nowMs as number) : false;

  const selDate = new Date(viewYear, viewMonth, selected);
  const selLabel = selDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const monthTitle = `${MON_LONG[viewMonth]} ${viewYear}`;

  // Kunci tanggal beragenda untuk titik date picker.
  const agendaKeys = useMemo(() => {
    const s = new Set<string>();
    for (const e of visible) {
      const d = startDate(e);
      if (d) s.add(dateKey(d));
    }
    for (const t of visibleTasks) {
      const d = taskDate(t);
      if (d) s.add(dateKey(d));
    }
    return s;
  }, [visible, visibleTasks]);

  const gridH = 24 * hourHeight;
  const isCompact = hourHeight < 34;

  // B detail: auto-scroll ke agenda pertama / jam sekarang.
  useEffect(() => {
    if (calZoom !== "detail") {
      const el = weekScrollRef.current;
      if (el) el.scrollTop = 0;
      return;
    }
    const el = weekScrollRef.current;
    if (!el) return;
    let target: number | null = null;
    const now = new Date();
    const inWeek = weekKeySet.has(dateKey(now));
    if (inWeek) {
      target = (now.getHours() + now.getMinutes() / 60) * 64;
    } else {
      let best: number | null = null;
      for (const e of weekListEvents) {
        const d = startDate(e);
        if (d) {
          const m = (d.getHours() + d.getMinutes() / 60) * 64;
          if (best === null || m < best) best = m;
        }
      }
      for (const t of weekListTasks) {
        const d = taskDate(t);
        if (d) {
          const m = Math.min(d.getHours() + d.getMinutes() / 60, 23) * 64;
          if (best === null || m < best) best = m;
        }
      }
      target = best;
    }
    if (target !== null) el.scrollTop = Math.max(0, target - 80);
    else el.scrollTop = 7 * 64;
  }, [calZoom, weekStart, weekListEvents, weekListTasks, weekKeySet]);

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
        <DatePicker
          title={monthTitle}
          titleLabel="Bulan"
          open={mPickerOpen}
          onOpenChange={setMPickerOpen}
          baseYear={viewYear}
          baseMonth={viewMonth}
          weekStart={weekStart}
          agendaKeys={agendaKeys}
          onPick={pickDate}
          onToday={goToday}
        />
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
        {monthCells.map((c) => {
          if (c.date === null) return <span key={c.key} className="x-day is-empty" />;
          const evs = idsByDate.get(c.date) ?? [];
          const tks = tasksByDate.get(c.date) ?? [];
          const total = evs.length + tks.length;
          const colors = [...evs.map((e) => e.groupColor), ...tks.map((t) => t.groupColor)].slice(0, 3);
          const overflow = total > 3;
          return (
            <button
              key={c.key}
              type="button"
              className={`x-day${c.date === selected ? " is-sel" : ""}`}
              aria-pressed={c.date === selected}
              aria-label={`${c.date} ${monthTitle}${total > 0 ? `, ${total} agenda` : ""}`}
              onClick={() => {
                setSelected(c.date as number);
                if (overflow) {
                  const d = new Date(viewYear, viewMonth, c.date as number);
                  setWeekDir(1);
                  setWeekStart(mondayOf(d));
                }
              }}
            >
              {c.date}
              {total > 0 && (
                <span className="x-dots" aria-hidden="true">
                  {colors.map((col, i) => (
                    <i key={i} style={{ ["--c" as string]: col, background: col }} />
                  ))}
                  {overflow && <span className="x-morenum">+{total - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
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
          {dayEvents.slice(0, 50).map((e, i) => (
            <Link key={e.id} href={`/event/${e.id}`} className="x-mini x-mini--event x-rise" style={{ ["--c" as string]: e.groupColor, ["--i" as string]: i, textDecoration: "none", color: "inherit" }}>
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
              onClick={() => openTask(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openTask(t.id);
                }
              }}
              className={`x-mini x-mini--task x-rise${t.done ? " is-done" : ""}`}
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

  const slotNew = (day: Date, ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest(".x-ev") || (ev.target as HTMLElement).closest(".x-task") || (ev.target as HTMLElement).closest(".x-tpill") || (ev.target as HTMLElement).closest(".x-tgroup") || (ev.target as HTMLElement).closest(".x-tg-pop") || (ev.target as HTMLElement).closest(".x-more") || (ev.target as HTMLElement).closest(".x-more-pop") || (ev.target as HTMLElement).closest(".x-allday")) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const hour = Math.min(23, Math.max(0, Math.floor((ev.clientY - rect.top) / hourHeight)));
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    openNew({ tab: "event", date: iso, start: `${pad(hour)}:00`, end: hour >= 23 ? "23:59" : `${pad(hour + 1)}:00` });
  };

  type Place = { top: number; height: number; col: number; colCount: number };
  type PlaceStyle = (x: Place) => React.CSSProperties;
  const placeStyleOf: PlaceStyle = (p) => ({
    top: `${p.top}px`,
    height: `${p.height}px`,
    left: `calc(${(p.col * 100 / p.colCount).toFixed(3)}% + 2px)`,
    width: `calc(${(100 / p.colCount).toFixed(3)}% - 5px)`,
  });

  const renderEvent = (e: EventItem, p: Place, ps: PlaceStyle) => {
    const clash = weekEvents.some((o) => o.id !== e.id && overlaps(o, e));
    const narrow = p.colCount > 1;
    return (
      <button
        key={e.id}
        type="button"
        className={`x-ev${e.status === "pending" ? " x-ev--wait" : ""}${panelId === e.id ? " is-sel" : ""}${narrow ? " is-narrow" : ""}`}
        style={{ ...ps(p), ["--c" as string]: e.groupColor } as React.CSSProperties}
        onClick={(ev) => { ev.stopPropagation(); openEvent(e.id); }}
        aria-label={`${e.title} ${e.start}-${e.end}`}
      >
        <b>{e.title}</b>
        {!isCompact && !narrow && (
          <>
            <time>{`${e.start}-${e.end}`}</time>
            <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <PriorityChip value={e.priority} short />
              {clash && <span className="x-flag x-flag--bad">Bentrok</span>}
              {e.status === "pending" && <span className="x-flag">Menunggu</span>}
            </span>
          </>
        )}
      </button>
    );
  };

  // A2: pill tugas tipis menempel di sisi kanan kolom (±60% lebar),
  // z-index di atas blok event, top = jam tenggat.
  const taskTop = (mins: number): number => {
    const h = 20;
    let t = (mins / 60) * hourHeight;
    if (t < 0) t = 0;
    if (t + h > gridH) t = Math.max(0, gridH - h);
    return t;
  };
  const renderTask = (t: TaskItem, topPx: number) => {
    return (
      <div
        key={t.id}
        className={`x-task x-tpill${t.done ? " is-done" : ""}${panelTaskId === t.id ? " is-sel" : ""}`}
        style={{ top: `${topPx}px`, ["--c" as string]: t.groupColor, cursor: "pointer" } as React.CSSProperties}
        onClick={(ev) => { ev.stopPropagation(); openTask(t.id); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTask(t.id);
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
      </div>
    );
  };

  // A3: pengelompokan per slot 30 menit (00-29, 30-59) per hari.
  const renderTaskGroup = (
    list: TaskItem[],
    topPx: number,
    dayKey: string,
    slot: number
  ) => {
    const sorted = [...list].sort((a, b) => taskHM(a).localeCompare(taskHM(b)));
    const first = taskHM(sorted[0]);
    const last = taskHM(sorted[sorted.length - 1]);
    const range = first === last ? first : `${first}–${last}`;
    const label = `${sorted.length} tugas · ${range}`;
    const color = sorted[0]?.groupColor ?? "var(--primary)";
    const open = groupOpen !== null && groupOpen.day === dayKey && groupOpen.startMin === slot;
    const gid = `tg-${dayKey}-${slot}`;
    const startMin = slot * 30;
    return (
      <div key={gid} className="x-tpill-wrap" style={{ top: `${topPx}px` }}>
        <button
          type="button"
          className="x-task x-tgroup x-tpill"
          style={{ ["--c" as string]: color } as React.CSSProperties}
          onClick={(ev) => {
            ev.stopPropagation();
            setOverflowOpen(null);
            setGroupOpen(open ? null : { day: dayKey, startMin: slot });
          }}
          aria-expanded={open}
          aria-label={`${label}`}
        >
          <span aria-hidden="true">☑</span>
          <span className="x-task-title">{label}</span>
        </button>
        {open && (
          <div
            className="x-more-pop x-tg-pop"
            role="dialog"
            aria-label={label}
            style={{ ...(startMin > 720 ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }), left: "auto", right: 0, minWidth: 240, maxWidth: 300 }}
            onClick={(ev) => ev.stopPropagation()}
          >
            {sorted.map((t) => (
              <div key={t.id} className="x-tg-row">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                  onClick={(ev) => ev.stopPropagation()}
                  aria-label={`Selesaikan ${t.title}`}
                />
                <button
                  type="button"
                  className="x-tg-title"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setGroupOpen(null);
                    openTask(t.id);
                  }}
                >
                  {t.title}
                </button>
                <PriorityChip value={t.priority} short />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDayItems = (day: Date, dayKey: string) => {
    const evs = weekEvents.filter((e) => {
      const d = startDate(e);
      return d !== null && dateKey(d) === dayKey;
    });
    // A1: layout kolom HANYA menghitung event.
    const minEv = isCompact ? 22 : 28;
    const src: DaySrc[] = evs.map((e) => {
      const s = startDate(e);
      const en = endDate(e);
      const sMin = s ? s.getHours() * 60 + s.getMinutes() : 0;
      const eMin = en ? en.getHours() * 60 + en.getMinutes() : sMin + 60;
      return { id: e.id, kind: "event" as const, startMin: sMin, endMin: Math.max(eMin, sMin + 30), minH: minEv };
    });
    const { placed, clusters } = layoutDay(src, hourHeight, gridH);
    const effW = Math.max(bodyW, 720);
    const dayW = bodyW > 0 ? (effW - 48) / 7 : 160;
    const nodes: React.ReactNode[] = [];
    const renderedCluster = new Set<number>();

    const renderSingle = (s: (typeof placed)[number], col: number, colCount: number) => {
      const pp = { ...s, col, colCount };
      const e = byId[s.id];
      if (!e) return null;
      return renderEvent(e, pp, placeStyleOf);
    };

    const popRows = (ordered: (typeof placed)[number][]) => {
      const rows: React.ReactNode[] = [];
      for (const s of ordered) {
        const o = byId[s.id];
        if (!o) continue;
        rows.push(
          <button
            key={s.id}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              setOverflowOpen(null);
              setGroupOpen(null);
              openEvent(s.id);
            }}
          >
            📅 {o.title}
          </button>
        );
      }
      return rows;
    };

    for (const p of placed) {
      const cl = clusters[p.cluster];
      const colW = dayW / p.colCount;
      const tooNarrow = colW < 64;
      const overflow = p.colCount > 3;
      if (tooNarrow) {
        if (renderedCluster.has(p.cluster)) continue;
        renderedCluster.add(p.cluster);
        const ordered = [...cl].sort((a, b) => a.top - b.top);
        const first = ordered[0];
        const minTop = Math.min(...cl.map((c) => c.top));
        nodes.push(renderSingle(first, 0, 1) && (
          <div key={`n-${dayKey}-${p.cluster}`} style={{ position: "absolute", top: `${first.top}px`, height: `${first.height}px`, left: 0, right: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: 0, right: 56, pointerEvents: "auto" }}>
              {renderSingle({ ...first, top: 0, bottom: first.height } as typeof first, 0, 1)}
            </div>
          </div>
        ));
        nodes.push(
          <button
            key={`more-${dayKey}-${p.cluster}`}
            type="button"
            className="x-more"
            style={{ top: `${minTop}px`, left: "calc(100% - 54px)", width: "50px" }}
            onClick={(ev) => {
              ev.stopPropagation();
              setGroupOpen(null);
              setOverflowOpen(overflowOpen && overflowOpen.day === dayKey && overflowOpen.cluster === p.cluster ? null : { day: dayKey, cluster: p.cluster });
            }}
            aria-label={`Tampilkan ${ordered.length - 1} agenda tersembunyi`}
          >
            +{ordered.length - 1}
          </button>
        );
        if (overflowOpen && overflowOpen.day === dayKey && overflowOpen.cluster === p.cluster) {
          nodes.push(
            <div key={`pop-${dayKey}-${p.cluster}`} className="x-more-pop" role="dialog" aria-label="Agenda pada slot ini" style={{ ...(minTop > gridH / 2 ? { bottom: `${gridH - minTop + 4}px` } : { top: `${minTop + 28}px` }), left: "8px", right: "8px" }}>
              {popRows(ordered)}
            </div>
          );
        }
      } else if (overflow) {
        if (renderedCluster.has(p.cluster)) continue;
        renderedCluster.add(p.cluster);
        const ordered = [...cl].sort((a, b) => a.top - b.top);
        const show = ordered.slice(0, 2);
        const minTop = Math.min(...cl.map((c) => c.top));
        for (const s of show) {
          nodes.push(renderSingle(s, show.indexOf(s), 3));
        }
        nodes.push(
          <button
            key={`more-${dayKey}-${p.cluster}`}
            type="button"
            className="x-more"
            style={{ top: `${minTop}px`, left: "calc(66.666% + 2px)", width: "calc(33.333% - 5px)" }}
            onClick={(ev) => { ev.stopPropagation(); setGroupOpen(null); setOverflowOpen({ day: dayKey, cluster: p.cluster }); }}
            aria-label={`Tampilkan ${ordered.length - 1} agenda tersembunyi`}
          >
            +{ordered.length - 2}
          </button>
        );
        if (overflowOpen && overflowOpen.day === dayKey && overflowOpen.cluster === p.cluster) {
          nodes.push(
            <div key={`pop-${dayKey}-${p.cluster}`} className="x-more-pop" role="dialog" aria-label="Agenda pada slot ini" style={{ ...(minTop > gridH / 2 ? { bottom: `${gridH - minTop + 4}px` } : { top: `${minTop + 28}px` }), left: "8px", right: "8px" }}>
              {popRows(ordered)}
            </div>
          );
        }
      } else {
        nodes.push(renderSingle(p, p.col, p.colCount));
      }
    }
    // A2+A3: tugas tidak ikut kolom; pill kanan per slot 30 menit.
    const tks = gridTasksByDay.get(dayKey) ?? [];
    const bySlot = new Map<number, TaskItem[]>();
    for (const t of tks) {
      const d = taskDate(t);
      if (!d) continue;
      const mins = d.getHours() * 60 + d.getMinutes();
      const slot = Math.floor(mins / 30);
      const list = bySlot.get(slot) ?? [];
      list.push(t);
      bySlot.set(slot, list);
    }
    for (const [slot, list] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
      const sorted = [...list].sort((a, b) => taskHM(a).localeCompare(taskHM(b)));
      const d0 = taskDate(sorted[0]);
      const mins0 = d0 ? d0.getHours() * 60 + d0.getMinutes() : slot * 30;
      const top = taskTop(mins0);
      if (sorted.length > 1) {
        nodes.push(renderTaskGroup(sorted, top, dayKey, slot));
      } else {
        nodes.push(renderTask(sorted[0], top));
      }
    }
    // Garis waktu sekarang.
    if (dayKey === todayKey && nowMs !== null) {
      const n = new Date(nowMs);
      const top = (n.getHours() + n.getMinutes() / 60) * hourHeight;
      if (top >= 0 && top <= gridH) {
        nodes.push(<div key="now" className="x-now" style={{ top: `${top}px` }} aria-hidden="true" />);
      }
    }
    return nodes;
  };

  const weekCols = weekDays.map((day) => {
    const key = dateKey(day);
    return (
      <div
        key={key}
        className={`x-col${key === todayKey ? " is-today" : ""}`}
        onClick={(ev) => slotNew(day, ev)}
        role="button"
        aria-label={`Tambah event ${day.getDate()} ${MON_LONG[day.getMonth()]}`}
      >
        {renderDayItems(day, key)}
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
    <div className="x-cal">
      <div className="x-top">
        <DatePicker
          title={weekTitle}
          titleLabel="Minggu"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          baseYear={weekStart.getFullYear()}
          baseMonth={weekStart.getMonth()}
          weekStart={weekStart}
          agendaKeys={agendaKeys}
          onPick={pickDate}
          onToday={goToday}
        />
        <button type="button" className="x-btn x-btn--outline x-arw" aria-label="Minggu sebelumnya" onClick={() => shiftWeek(-1)}>
          ‹
        </button>
        <button type="button" className="x-btn x-btn--outline x-arw" aria-label="Minggu berikutnya" onClick={() => shiftWeek(1)}>
          ›
        </button>
        <button type="button" className="x-btn x-btn--outline" onClick={goToday}>
          Hari ini
        </button>
        <div className="x-zoom" role="group" aria-label="Zoom kalender">
          <button type="button" className={calZoom === "fit" ? "is-on" : ""} aria-pressed={calZoom === "fit"} onClick={() => setCalZoom("fit")}>
            Pas layar
          </button>
          <button type="button" className={calZoom === "detail" ? "is-on" : ""} aria-pressed={calZoom === "detail"} onClick={() => setCalZoom("detail")}>
            Detail
          </button>
        </div>
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
        <div className={`x-wk${calZoom === "fit" ? " is-fit" : " is-detail"}${isCompact ? " is-compact" : ""}`} style={{ ["--hr" as string]: `${hourHeight}px` } as React.CSSProperties}>
          <div className="x-wk-head">
            <span />
            {weekHead}
          </div>
          {hasAllDay && (
            <div className="x-allday" aria-label="Tenggat hari ini">
              <span className="x-allday-label">Tenggat</span>
              {weekDays.map((day) => {
                const k = dateKey(day);
                const list = allDayByDay.get(k) ?? [];
                if (list.length === 0) return <div key={k} className="x-allday-cell" />;
                const show = list.slice(0, 2);
                const rest = list.length - show.length;
                const open = alldayOpen === k;
                return (
                  <div key={k} className="x-allday-cell">
                    {show.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`x-allday-pill${t.done ? " is-done" : ""}${panelTaskId === t.id ? " is-sel" : ""}`}
                        style={{ ["--c" as string]: t.groupColor } as React.CSSProperties}
                        onClick={(ev) => { ev.stopPropagation(); setAlldayOpen(null); openTask(t.id); }}
                        aria-label={`Tenggat ${t.title}`}
                        title={t.title}
                      >
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTask(t.id)}
                          onClick={(ev) => ev.stopPropagation()}
                          aria-label={`Selesaikan ${t.title}`}
                          tabIndex={-1}
                        />
                        <span>{t.title}</span>
                      </button>
                    ))}
                    {rest > 0 && (
                      <button
                        type="button"
                        className="x-allday-more"
                        aria-expanded={open}
                        aria-label={`Tampilkan ${rest} tugas tenggat lainnya`}
                        onClick={(ev) => { ev.stopPropagation(); setGroupOpen(null); setOverflowOpen(null); setAlldayOpen(open ? null : k); }}
                      >
                        +{rest} lainnya
                      </button>
                    )}
                    {open && (
                      <div className="x-more-pop x-allday-pop" role="dialog" aria-label="Tugas tenggat hari ini" onClick={(ev) => ev.stopPropagation()}>
                        {list.map((t) => (
                          <div key={t.id} className="x-tg-row">
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={() => toggleTask(t.id)}
                              onClick={(ev) => ev.stopPropagation()}
                              aria-label={`Selesaikan ${t.title}`}
                            />
                            <button
                              type="button"
                              className="x-tg-title"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setAlldayOpen(null);
                                openTask(t.id);
                              }}
                            >
                              {t.title}
                            </button>
                            <PriorityChip value={t.priority} short />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="x-wk-body" ref={weekScrollRef}>
            <div className="x-hrs">
              {HOURS.map((h, i) => (
                <span key={h}>{isCompact && i % 2 === 1 ? "" : h}</span>
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
                  {calZoom === "detail" && (
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
                  )}
                </div>
              ) : (
                <EmptyState text="Minggu ini kosong untuk filter saat ini." />
              )}
            </div>
          )}
        </div>
        <aside className="x-panel x-detail" aria-label="Detail agenda">
          {!ready ? (
            <LoadingSkeleton />
          ) : loadError ? (
            <ErrorState text={loadError} onRetry={reload} />
          ) : panelTask ? (
            <>
              <p className="x-sec" style={{ marginTop: 0 }}>Detail Tugas</p>
              <TaskDetailBody taskId={panelTask.id} onDeleted={() => setPanelTaskId(null)} idPrefix="pn" />
            </>
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
            <EmptyState text="Pilih event atau tugas untuk melihat detail." />
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
    </div>
  );

  return (
    <>
      <MobileShell>{mobile}</MobileShell>
      <DesktopShell>{desktop}</DesktopShell>
      <TaskDetail taskId={taskId} onClose={() => setTaskId(null)} />
    </>
  );
}
