"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Pick,
  PriorityChip,
  RsvpSegment,
  StatusChip,
} from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import { EventItem, TaskItem } from "@/lib/data";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MON_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

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
  const { ready, loadError, events, tasks, reload, setRsvp, markAttendance, toggleCheck, openNew, hiddenGroups, deleteEvent, toggleTask } = useStore();
  const { say } = useToast();
  const [group, setGroup] = useState<string>("Semua");
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(9);
  const [selected, setSelected] = useState(9);
  const [weekStart, setWeekStart] = useState(() => new Date(2026, 9, 5));
  const [query, setQuery] = useState("");
  const [panelId, setPanelId] = useState<string | null>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelected(t.getDate());
    setWeekStart(mondayOf(t));
  }, []);

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
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const goToday = () => {
    const t = new Date();
    setWeekStart(mondayOf(t));
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelected(t.getDate());
    say("Lompat ke minggu ini");
  };

  const groups = useMemo(
    () => ["Semua", ...Array.from(new Set([...events.map((e) => e.group), ...tasks.map((t) => t.group)]))],
    [events, tasks]
  );
  const activeGroup = groups.includes(group) ? group : "Semua";

  const byId = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const visible = events.filter(
    (e) => (activeGroup === "Semua" || e.group === activeGroup) && !hiddenGroups.includes(e.group)
  );
  const visibleTasks = tasks.filter(
    (t) => (activeGroup === "Semua" || t.group === activeGroup) && !hiddenGroups.includes(t.group)
  );
  const weekEvents = useMemo(
    () => visible.filter((e) => e.title.toLowerCase().includes(query.toLowerCase())),
    [visible, query]
  );
  const weekTasks = useMemo(
    () => visibleTasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())),
    [visibleTasks, query]
  );

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

  const dayEvents = useMemo(() => {
    const list = idsByDate.get(selected) ?? [];
    return list.filter((e) => activeGroup === "Semua" || e.group === activeGroup);
  }, [idsByDate, selected, activeGroup]);
  const dayTasks = useMemo(() => {
    const list = tasksByDate.get(selected) ?? [];
    return list.filter((t) => activeGroup === "Semua" || t.group === activeGroup);
  }, [tasksByDate, selected, activeGroup]);

  const panel: EventItem | undefined = panelId ? byId[panelId] : undefined;

  const selDate = new Date(viewYear, viewMonth, selected);
  const selLabel = selDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const monthTitle = `${MON_LONG[viewMonth]} ${viewYear}`;

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
      <div className="x-chips" role="group" aria-label="Filter grup">
        <Pick options={groups} value={activeGroup} onChange={setGroup} label="Filter grup" />
      </div>
      <p className="x-sec">{selDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={reload} />
      ) : dayEvents.length === 0 && dayTasks.length === 0 ? (
        <EmptyState text={`Tidak ada agenda grup ${activeGroup} pada ${selLabel}.`} />
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
            <label key={t.id} className={`x-mini x-rise${t.done ? " is-done" : ""}`} style={{ ["--c" as string]: t.groupColor, ["--i" as string]: dayEvents.length + i }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={`Selesaikan ${t.title}`} style={{ width: 18, height: 18, accentColor: "var(--primary)" }} />
              <b>{taskHM(t)}</b>
              <span className="x-task-title">{t.title}</span>
              <span className="x-tag">Tenggat</span>
            </label>
          ))}
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
        style={style}
        onClick={(ev) => ev.stopPropagation()}
        role="group"
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
        {weekEvents.filter((e) => {
          const d = startDate(e);
          return d !== null && dateKey(d) === key;
        }).map((e, i) => weekBlock(e, i))}
        {weekTasks.filter((t) => {
          const d = taskDate(t);
          return d !== null && dateKey(d) === key;
        }).map((t, i) => weekTaskBlock(t, i))}
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
        <select className="x-input" aria-label="Filter grup" value={activeGroup} onChange={(e) => setGroup(e.target.value)} style={{ width: "auto" }}>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <input
          className="x-input"
          type="search"
          placeholder="Cari agenda..."
          aria-label="Cari agenda"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="x-btn" style={{ width: "auto" }} onClick={() => openNew()}>
          + Baru
        </button>
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
            {weekCols}
          </div>
          {ready && !loadError && weekEmpty && (
            <div style={{ marginTop: 12 }}>
              {query ? (
                <EmptyState text={`Tidak ada agenda berjudul "${query}".`} />
              ) : !hasAnything ? (
                <EmptyState text="Belum ada agenda di Supabase. Tambah lewat tombol + Tambah Event." />
              ) : nextAgenda ? (
                <div className="x-empty" role="status">
                  Minggu ini kosong. Agenda berikutnya: {nextAgenda.label}
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="x-btn x-btn--outline x-btn--sm"
                      style={{ width: "auto" }}
                      onClick={() => setWeekStart(mondayOf(nextAgenda.at))}
                    >
                      Lompat
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState text="Minggu ini kosong." />
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
              <div className="x-btns" style={{ margin: "14px 0 16px" }}>
                <button type="button" className={`x-btn${panel.attendance === "done" ? " is-done" : ""}`} onClick={() => { markAttendance(panel.id, "done"); say(`${panel.title} ditandai selesai`); }}>
                  Tandai Selesai
                </button>
                <button type="button" className="x-btn x-btn--outline" onClick={() => { markAttendance(panel.id, "absent"); say(`Ketidakhadiran ${panel.title} dicatat`); }}>
                  Tidak Hadir
                </button>
              </div>
              <div className="x-btns" style={{ margin: "14px 0 16px" }}>
                <Link className="x-btn x-btn--outline" href={`/event/${panel.id}`}>
                  Edit
                </Link>
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
    </>
  );

  return (
    <>
      <MobileShell>{mobile}</MobileShell>
      <DesktopShell>{desktop}</DesktopShell>
    </>
  );
}
