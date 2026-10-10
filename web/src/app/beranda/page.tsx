"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Asterisk, EmptyState, ErrorState, EventRow, LoadingSkeleton, PriorityChip } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore } from "@/lib/store";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function BerandaPage() {
  const router = useRouter();
  const { ready, authReady, user, userName, loadError, events, tasks, toggleTask, reload, hiddenGroups, openNew, unreadCount } = useStore();

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);

  const [now, setNow] = useState(() => new Date(2026, 9, 10));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  const today = dayKey(now);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => !hiddenGroups.includes(e.group))
        .filter((e) => e.endAt && e.endAt >= now.toISOString())
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? "")),
    [events, hiddenGroups, now]
  );
  const todayList = useMemo(
    () => upcoming.filter((e) => e.startAt && dayKey(new Date(e.startAt)) === today),
    [upcoming, today]
  );
  const nextList = useMemo(
    () => upcoming.filter((e) => e.startAt && dayKey(new Date(e.startAt)) !== today).slice(0, 5),
    [upcoming, today]
  );
  const pendingCount = upcoming.filter((e) => e.status === "pending").length;
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

  const body = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 className="x-h">Halo, {userName.split(" ")[0]}</h2>
          <p className="x-sub">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/notifikasi" aria-label="Notifikasi" style={{ position: "relative", textDecoration: "none", minWidth: 44, minHeight: 44, display: "grid", placeItems: "center", color: "var(--ink)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="x-count" style={{ position: "absolute", top: 2, right: 0 }}>{unreadCount}</span>
          )}
        </Link>
      </div>
      <div className="x-summary">
        <Asterisk className="x-ast x-deco" />
        <strong>{todayList.length} agenda hari ini</strong>
        <span>{pendingCount === 0 ? "Tidak ada yang menunggu" : `${pendingCount} menunggu persetujuan`}</span>
      </div>
      {clashes.length > 0 && (
        <div className="x-warn">
          <b>Bentrok hari ini</b>
          {clashes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
      )}
      <p className="x-sec">Hari ini</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={reload} />
      ) : todayList.length === 0 ? (
        <EmptyState text="Belum ada agenda hari ini. Tekan + untuk menambah." />
      ) : (
        <div className="x-stack">
          {todayList.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}
      <p className="x-sec">Tugas tenggat terdekat</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : openTasks.length === 0 ? (
        <EmptyState text="Tidak ada tugas terbuka. Tambah lewat + Baru." />
      ) : (
        <div className="x-stack">
          {openTasks.map((t) => (
            <label key={t.id} className="x-check" style={{ border: "var(--x-border)", borderRadius: "var(--x-radius)", padding: "10px 12px" }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span>
                <b>{t.title}</b>
                <br />
                <small style={{ color: "var(--ink-2)" }}>{t.dueLabel} · {t.group}</small>
              </span>
              <span style={{ marginLeft: "auto" }}>
                <PriorityChip value={t.priority} short />
              </span>
            </label>
          ))}
        </div>
      )}
      <p className="x-sec">Akan datang</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : nextList.length === 0 ? (
        <EmptyState text="Tidak ada agenda berikutnya." />
      ) : (
        <div className="x-stack">
          {nextList.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}
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

  return (
    <>
      <MobileShell>
        <div className="r-screen">{body}</div>
      </MobileShell>
      <DesktopShell>
        <div className="r-dcenter">{body}</div>
      </DesktopShell>
    </>
  );
}
