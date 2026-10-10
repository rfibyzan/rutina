"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";

export default function PersetujuanPage() {
  const { ready, loadError, approvals, reload, decide, myGroups } = useStore();
  const { say } = useToast();
  const [tab, setTab] = useState<"masuk" | "saya">("masuk");
  const [note, setNote] = useState("");

  const adminGroupIds = new Set(
    myGroups.filter((g) => g.role === "owner" || g.role === "admin").map((g) => g.name)
  );
  const mine = approvals.filter((a) => (a.group ? adminGroupIds.has(a.group) : true));
  const pending = mine.filter((a) => a.decision === null);
  const done = mine.filter((a) => a.decision !== null);
  const diajukan = approvals.filter((a) => a.byMe);

  const label: Record<string, string> = { approved: "Disetujui", rejected: "Ditolak", needs_revision: "Minta revisi" };
  const groupNames = Array.from(new Set(mine.map((a) => a.group).filter(Boolean))).join(", ");

  const act = (a: (typeof approvals)[number], decision: "approved" | "rejected" | "needs_revision") => {
    decide(a.id, decision, decision === "needs_revision" ? note : undefined);
    if (decision === "approved") say(`${a.title} disetujui`);
    else if (decision === "rejected") say(`${a.title} ditolak`);
    else {
      say(`Permintaan revisi ${a.title} dikirim`);
      setNote("");
    }
  };

  const card = (a: (typeof approvals)[number]) => (
    <div key={a.id} className="x-card x-pending">
      <span className="x-chip x-chip--wait">{a.decision === null ? "Menunggu" : label[a.decision as string]}</span>
      {a.conflict && a.decision === null && <span className="x-chip x-chip--p1">bentrok 1</span>}
      <h4>{a.eventId ? <Link href={`/event/${a.eventId}`}>{a.title}</Link> : a.title}</h4>
      <p>
        {a.requester}{a.group ? ` · ${a.group}` : ""} · {a.when}
      </p>
      {a.decision === null ? (
        <>
          <div className="x-field">
            <label htmlFor={`rev-${a.id}`}>Alasan revisi (opsional)</label>
            <input id={`rev-${a.id}`} className="x-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. Waktu bentrok, geser ke..." />
          </div>
          <div className="x-btns">
            <button type="button" className="x-btn x-btn--sm" onClick={() => act(a, "approved")}>
              Setujui
            </button>
            <button type="button" className="x-btn x-btn--sm x-btn--outline" onClick={() => act(a, "rejected")}>
              Tolak
            </button>
            <button type="button" className="x-btn x-btn--sm x-btn--ghost" onClick={() => act(a, "needs_revision")}>
              Revisi
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  const listMasuk = !ready ? (
    <LoadingSkeleton />
  ) : loadError ? (
    <ErrorState text={loadError} onRetry={reload} />
  ) : mine.length === 0 ? (
    <EmptyState text="Belum ada ajuan masuk di grup yang kamu kelola." />
  ) : (
    <>
      <div className="x-stack" style={{ marginTop: 16 }}>
        {pending.map(card)}
      </div>
      {pending.length === 0 && <EmptyState text="Semua ajuan sudah diputuskan." />}
      {done.length > 0 && (
        <>
          <p className="x-sec">Sudah diputuskan</p>
          <div className="x-stack">{done.map(card)}</div>
        </>
      )}
    </>
  );

  const listSaya = !ready ? (
    <LoadingSkeleton />
  ) : diajukan.length === 0 ? (
    <EmptyState text="Kamu belum mengajukan event apa pun." />
  ) : (
    <div className="x-stack" style={{ marginTop: 16 }}>
      {diajukan.map((a) => (
        <div key={a.id} className="x-card">
          <span className={`x-chip ${a.decision === null ? "x-chip--wait" : a.decision === "approved" ? "x-chip--ok" : "x-chip--p1"}`}>
            {a.decision === null ? "Menunggu" : label[a.decision as string]}
          </span>
          <h4>{a.eventId ? <Link href={`/event/${a.eventId}`}>{a.title}</Link> : a.title}</h4>
          <p>{a.when}</p>
        </div>
      ))}
    </div>
  );

  const tabs = (
    <div className="x-chips" role="group" aria-label="Tab persetujuan" style={{ maxWidth: 420 }}>
      {(["masuk", "saya"] as const).map((t) => (
        <button key={t} type="button" className={`x-chip${t === tab ? " is-on" : ""}`} aria-pressed={t === tab} onClick={() => setTab(t)}>
          {t === "masuk" ? "Perlu diputuskan" : "Ajuan saya"}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <MobileShell>
        <div className="r-screen">
          <h2 className="x-h">Persetujuan</h2>
          <p className="x-sub">{groupNames || "Grup yang kamu kelola"} · {pending.length} menunggu</p>
          <div style={{ marginTop: 12 }}>{tabs}</div>
          {tab === "masuk" ? listMasuk : listSaya}
        </div>
      </MobileShell>
      <DesktopShell>
        <div className="x-vpage">
          <div className="x-top">
            <div>
              <h2 className="x-h">Persetujuan</h2>
              <p className="x-sub">{groupNames || "Grup yang kamu kelola"} · {pending.length} menunggu</p>
            </div>
          </div>
          {tabs}
          {tab === "masuk" ? (
            !ready ? (
              <LoadingSkeleton />
            ) : loadError ? (
              <ErrorState text={loadError} onRetry={reload} />
            ) : mine.length === 0 ? (
              <EmptyState text="Belum ada ajuan masuk di grup yang kamu kelola." />
            ) : (
              <table className="x-wtable">
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Pengaju</th>
                    <th>Grup</th>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((a) => (
                    <tr key={a.id}>
                      <th>{a.eventId ? <Link href={`/event/${a.eventId}`}>{a.title}</Link> : a.title}</th>
                      <td>{a.requester}</td>
                      <td>{a.group ?? "-"}</td>
                      <td>{a.when}</td>
                      <td>
                        {a.decision === null ? (
                          <span className="x-chip x-chip--wait">Menunggu</span>
                        ) : (
                          <span className="x-tag">{label[a.decision as string]}</span>
                        )}
                      </td>
                      <td>
                        {a.decision === null ? (
                          <div className="x-btns">
                            <button type="button" className="x-btn x-btn--sm" onClick={() => act(a, "approved")}>
                              Setujui
                            </button>
                            <button type="button" className="x-btn x-btn--sm x-btn--outline" onClick={() => act(a, "rejected")}>
                              Tolak
                            </button>
                            <button type="button" className="x-btn x-btn--sm x-btn--ghost" onClick={() => act(a, "needs_revision")}>
                              Revisi
                            </button>
                          </div>
                        ) : (
                          <span className="x-tag">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            listSaya
          )}
        </div>
      </DesktopShell>
    </>
  );
}
