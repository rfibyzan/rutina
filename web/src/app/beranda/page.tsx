"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Asterisk, EmptyState, ErrorState, EventRow, LoadingSkeleton, PriorityChip } from "@/components/ui";
import { TaskDetail } from "@/components/task-detail";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore } from "@/lib/store";
import type { TaskItem } from "@/lib/data";
import { subProgress } from "@/lib/data";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

function TaskCard({
  task,
  index,
  nowIso,
  onOpen,
}: {
  task: TaskItem;
  index: number;
  nowIso: string;
  onOpen: (id: string) => void;
}) {
  const { toggleTask } = useStore();
  const [leaving, setLeaving] = useState(false);
  const done = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => toggleTask(task.id), 220);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className={`x-check x-rise x-task-card${leaving ? " is-leaving" : ""}`}
      style={
        {
          border: "2px dashed var(--c, var(--muted))",
          borderLeft: "5px solid var(--c, var(--muted))",
          borderRadius: "var(--x-radius)",
          padding: "10px 12px",
          cursor: "pointer",
          ["--c" as string]: task.groupColor,
          ["--i" as string]: index,
        } as React.CSSProperties
      }
    >
      <input
        type="checkbox"
        className="x-check-pop"
        checked={task.done}
        onChange={done}
        disabled={task.subtasks.length > 0}
        title={task.subtasks.length > 0 ? "Selesai otomatis saat semua subtugas selesai" : undefined}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Selesaikan ${task.title}`}
      />
      <span>
        <b>{task.title}</b>
        {task.dueAt && task.dueAt < nowIso && <span className="x-chip x-chip--p1" style={{ marginLeft: 6 }}>Terlambat</span>}
        <br />
        <small style={{ color: "var(--ink-2)" }}>{task.dueLabel} · {task.group}{subProgress(task)}</small>
      </span>
      <span style={{ marginLeft: "auto" }}>
        <PriorityChip value={task.priority} short />
      </span>
    </div>
  );
}

export default function BerandaPage() {
  const router = useRouter();
  const { ready, authReady, user, userName, loadError, events, tasks, reload, openNew, unreadCount } = useStore();

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);

  const [now, setNow] = useState(() => new Date(2026, 9, 10));
  const [taskId, setTaskId] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  const today = dayKey(now);
  const nowIso = now.toISOString();

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.endAt && e.endAt >= now.toISOString())
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [events, now]
  );
  const todayList = useMemo(
    () =>
      events
        .filter((e) => e.startAt && dayKey(new Date(e.startAt)) === today)
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [events, today]
  );
  const nextList = useMemo(
    () => upcoming.filter((e) => e.startAt && dayKey(new Date(e.startAt)) !== today).slice(0, 5),
    [upcoming, today]
  );
  const pendingCount = events.filter((e) => e.status === "pending").length;
  const openTasks = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")).slice(0, 5),
    [tasks]
  );
  const clashes = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < todayList.length; i += 1) {
      for (let j = i + 1; j < todayList.length; j += 1) {
        const a = todayList[i];
        const b = todayList[j];
        if (a.startAt && a.endAt && b.startAt && b.endAt && a.startAt < b.endAt && b.startAt < a.endAt) {
          out.push(`${a.title} vs ${b.title}`);
        }
      }
    }
    return out;
  }, [todayList]);

  const bell = (
    <Link href="/notifikasi" aria-label="Notifikasi" className="x-bell" style={{ position: "relative", textDecoration: "none", minWidth: 44, minHeight: 44, display: "grid", placeItems: "center", color: "var(--ink)" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span key={unreadCount} className="x-count x-bump" style={{ position: "absolute", top: 2, right: 0 }}>{unreadCount}</span>
      )}
    </Link>
  );

  const pintas = (
    <>
      <p className="x-sec">Pintas</p>
      <div className="x-btns">
        <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={() => openNew()}>
          + Baru
        </button>
        <Link className="x-btn x-btn--outline x-btn--sm" href="/persetujuan">
          Persetujuan
        </Link>
      </div>
    </>
  );

  const taskSection = (
    <>
      <p className="x-sec">Tugas tenggat terdekat</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : openTasks.length === 0 ? (
        <EmptyState text="Tidak ada tugas terbuka. Tambah lewat + Baru." />
      ) : (
        <div className="x-stack">
          {openTasks.map((t, i) => (
            <TaskCard key={t.id} task={t} index={i} nowIso={nowIso} onOpen={setTaskId} />
          ))}
        </div>
      )}
    </>
  );

  const agendaSection = (
    <>
      <p className="x-sec">Hari ini</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={reload} />
      ) : todayList.length === 0 ? (
        <EmptyState text="Belum ada agenda hari ini. Tekan + untuk menambah." />
      ) : (
        <div className="x-stack">
          {todayList.map((e, i) => (
            <EventRow key={e.id} event={e} index={i} />
          ))}
        </div>
      )}
      {taskSection}
      <p className="x-sec">Akan datang</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : nextList.length === 0 ? (
        <EmptyState text="Tidak ada agenda berikutnya." />
      ) : (
        <div className="x-stack">
          {nextList.map((e, i) => (
            <EventRow key={e.id} event={e} index={i} showDate />
          ))}
        </div>
      )}
    </>
  );

  const summary = (
    <div className="x-summary">
      <Asterisk className="x-ast x-deco" />
      <strong>
        <CountUp value={todayList.length} /> agenda hari ini
      </strong>
      <span>{pendingCount === 0 ? "Tidak ada yang menunggu" : `${pendingCount} menunggu persetujuan`}</span>
    </div>
  );

  const clashBox = clashes.length > 0 && (
    <div className="x-warn">
      <b>Bentrok hari ini</b>
      {clashes.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );

  const mobileBody = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 className="x-h">Halo, {userName.split(" ")[0]}</h2>
          <p className="x-sub">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        {bell}
      </div>
      {summary}
      {clashBox}
      {agendaSection}
      {pintas}
    </>
  );

  const desktopBody = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 className="x-h">Halo, {userName.split(" ")[0]}</h2>
          <p className="x-sub">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
      {summary}
      {clashBox}
      {agendaSection}
    </>
  );

  return (
    <>
      <MobileShell>
        <div className="r-screen">{mobileBody}</div>
      </MobileShell>
      <DesktopShell>
        <div className="r-dcenter">{desktopBody}</div>
      </DesktopShell>
      <TaskDetail taskId={taskId} onClose={() => setTaskId(null)} />
    </>
  );
}
