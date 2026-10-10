"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Asterisk, EmptyState, ErrorState, EventRow, LoadingSkeleton, RoleBadge, Switch } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Group, Member, PERMISSION_ROWS, ROLE_LABEL, Role } from "@/lib/data";

const TABS = ["Agenda", "Anggota", "Izin"] as const;
const ROLES: Role[] = ["owner", "admin", "editor", "contributor", "viewer"];

export default function GrupDetail({ group }: { group: Group }) {
  const { ready, loadError, events, reload, user, openNew } = useStore();
  const { say } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<(typeof TABS)[number]>("Agenda");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [quorum, setQuorum] = useState(false);
  const [detect, setDetect] = useState(true);
  const [invite, setInvite] = useState("-");
  const [myRole, setMyRole] = useState<Role>(group.myRole);

  const loadGroup = useCallback(async () => {
    const { data: g } = await supabase
      .from("groups")
      .select("approval_mode,quorum,detect_conflict,invite_code")
      .eq("id", group.id)
      .maybeSingle();
    if (g) {
      const row = g as { approval_mode: string; quorum: number; detect_conflict: boolean; invite_code: string };
      setQuorum(row.approval_mode === "quorum");
      setDetect(!!row.detect_conflict);
      setInvite(row.invite_code ?? "-");
    }
    const { data: m } = await supabase
      .from("group_members")
      .select("role,user_id,users(name)")
      .eq("group_id", group.id);
    if (m) {
      const rows = m as { role: string; user_id: string; users: { name: string } | { name: string }[] | null }[];
      setMembers(
        rows.map((r) => ({
          name: Array.isArray(r.users) ? (r.users[0]?.name ?? "Anggota") : (r.users?.name ?? "Anggota"),
          role: r.role as Role,
        }))
      );
      setMemberIds(rows.map((r) => r.user_id));
      if (user) {
        const mine = rows.find((r) => r.user_id === user.id);
        if (mine) setMyRole(mine.role as Role);
      }
    }
  }, [supabase, group.id, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGroup();
  }, [loadGroup]);

  const agenda = events.filter((e) => e.group === group.name);
  const canManage = myRole === "owner" || myRole === "admin";

  const changeRole = async (index: number, role: Role) => {
    const uid = memberIds[index];
    if (!uid) return;
    const { error } = await supabase.from("group_members").update({ role }).eq("group_id", group.id).eq("user_id", uid);
    if (error) {
      say(`Gagal ubah role: ${error.message}`);
      return;
    }
    setMembers((prev) => prev.map((x, i) => (i === index ? { ...x, role } : x)));
    say(`${members[index].name} kini ${ROLE_LABEL[role]} di ${group.name}`);
  };

  const saveSettings = async (patch: { approval_mode?: string; quorum?: number; detect_conflict?: boolean }) => {
    const { error } = await supabase.from("groups").update(patch).eq("id", group.id);
    if (error) say(`Gagal simpan aturan: ${error.message}`);
  };

  const toggleQuorum = (v: boolean) => {
    setQuorum(v);
    saveSettings(v ? { approval_mode: "quorum", quorum: 2 } : { approval_mode: "single", quorum: 1 });
    say(`Kuorum persetujuan ${v ? "aktif" : "nonaktif"}`);
  };

  const removeMember = async (index: number) => {
    const uid = memberIds[index];
    if (!uid || !canManage) return;
    if (uid === user?.id) {
      say("Tidak bisa mengeluarkan diri sendiri, pakai Keluar Grup");
      return;
    }
    if (!window.confirm(`Keluarkan ${members[index].name}?`)) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", uid);
    if (error) {
      say(`Gagal mengeluarkan: ${error.message}`);
      return;
    }
    say(`${members[index].name} dikeluarkan`);
    loadGroup();
  };

  const leaveGroup = async () => {
    if (!user || myRole === "owner") {
      say(myRole === "owner" ? "Pemilik tidak bisa keluar, hapus grup atau alihkan dulu" : "Masuk dulu");
      return;
    }
    if (!window.confirm(`Keluar dari ${group.name}?`)) return;
    await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id);
    say(`Keluar dari ${group.name}`);
    router.push("/grup");
  };

  const deleteGroup = async () => {
    if (myRole !== "owner") return;
    if (!window.confirm(`Hapus grup ${group.name} beserta semua eventnya?`)) return;
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) {
      say(`Gagal menghapus: ${error.message}`);
      return;
    }
    say(`Grup ${group.name} dihapus`);
    router.push("/grup");
  };

  const copyInvite = async () => {
    try {
      await window.navigator.clipboard.writeText(invite);
      say("Kode undangan disalin");
    } catch {
      say(`Kode: ${invite}`);
    }
  };

  const resetInvite = async () => {
    if (!canManage) return;
    const next = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("groups").update({ invite_code: next }).eq("id", group.id);
    if (error) {
      say(`Gagal reset kode: ${error.message}`);
      return;
    }
    setInvite(next);
    say("Kode undangan baru dibuat");
  };

  const toggleDetect = (v: boolean) => {
    setDetect(v);
    saveSettings({ detect_conflict: v });
    say(`Deteksi bentrok ${v ? "aktif" : "nonaktif"}`);
  };

  const permTable = (
    <table className="x-perm">
      <thead>
        <tr>
          <th />
          {PERMISSION_ROWS.map((r) => (
            <th key={r.label}>{r.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROLES.map((role) => (
          <tr key={role}>
            <th>{ROLE_LABEL[role]}</th>
            {PERMISSION_ROWS.map((r) => (
              <td key={r.label} className={r.values.includes(role) ? "y" : "n"}>
                {r.values.includes(role) ? "✓" : "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const memberRows = members.map((m, i) => (
    <tr key={`${m.name}-${i}`}>
      <th>{m.name}</th>
      <td>
        <RoleBadge role={m.role} />
      </td>
      <td>
        {canManage ? (
          <select
            className="x-input"
            aria-label={`Role ${m.name}`}
            value={m.role}
            onChange={(e) => changeRole(i, e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="x-sub">Terkunci</span>
        )}
      </td>
      <td>
        {canManage && memberIds[i] !== user?.id ? (
          <button type="button" className="x-btn x-btn--ghost x-btn--sm" onClick={() => removeMember(i)}>
            Keluarkan
          </button>
        ) : null}
      </td>
    </tr>
  ));

  const settings = (
    <>
      <p className="x-sec">Aturan</p>
      <div className="x-toggle">
        <span>Persetujuan: kuorum 2 Admin</span>
        <Switch checked={quorum} onChange={(v) => canManage && toggleQuorum(v)} label="Persetujuan: kuorum 2 Admin" />
      </div>
      <div className="x-toggle">
        <span>Deteksi bentrok otomatis</span>
        <Switch checked={detect} onChange={(v) => canManage && toggleDetect(v)} label="Deteksi bentrok otomatis" />
      </div>
      {!canManage && <p className="x-sub">Hanya Pemilik dan Admin yang bisa mengubah aturan.</p>}
      <p className="x-sec">Undangan</p>
      <div className="x-card">
        Kode: <b>{invite}</b> · Berlaku untuk semua role kecuali Pemilik
        <div className="x-btns" style={{ marginTop: 10 }}>
          <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={copyInvite}>
            Salin Kode
          </button>
          {canManage && (
            <button type="button" className="x-btn x-btn--ghost x-btn--sm" onClick={resetInvite}>
              Reset Kode
            </button>
          )}
        </div>
      </div>
      <p className="x-sec">Zona berbahaya</p>
      <div className="x-btns">
        {myRole !== "owner" ? (
          <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={leaveGroup}>
            Keluar Grup
          </button>
        ) : (
          <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={deleteGroup}>
            Hapus Grup
          </button>
        )}
      </div>
    </>
  );

  const mobile = (
    <>
      <div className="x-header">
        <Asterisk className="x-ast x-deco" />
        <small>Pengaturan grup</small>
        <h2>{group.name}</h2>
      </div>
      <div className="x-pad" style={{ paddingBottom: 110 }}>
        <div className="x-chips" role="group" aria-label="Tab grup">
          {TABS.map((t) => (
            <button key={t} type="button" className={`x-chip${t === tab ? " is-on" : ""}`} aria-pressed={t === tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {tab === "Agenda" && (
          <>
            <p className="x-sec">Agenda {group.name}</p>
            {!ready ? (
              <LoadingSkeleton />
            ) : loadError ? (
              <ErrorState text={loadError} onRetry={reload} />
            ) : agenda.length === 0 ? (
              <EmptyState text={`Belum ada agenda di ${group.name}.`} />
            ) : (
              <div className="x-stack">
                {agenda.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </>
        )}
        {tab === "Anggota" && (
          <>
            <p className="x-sec">Anggota · {members.length} orang</p>
            {members.length === 0 ? (
              <EmptyState text="Belum ada anggota tercatat di Supabase." />
            ) : (
              <table className="x-perm">
                <tbody>
                  {members.map((m, i) => (
                    <tr key={`${m.name}-${i}`}>
                      <th>{m.name}</th>
                      <td>
                        <RoleBadge role={m.role} />
                      </td>
                      <td>
                        {canManage ? (
                          <select className="x-input" aria-label={`Role ${m.name}`} value={m.role} onChange={(e) => changeRole(i, e.target.value as Role)}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="x-sub">Terkunci</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {tab === "Izin" && (
          <>
            <p className="x-sec">Role dan Izin</p>
            {permTable}
            {settings}
          </>
        )}
        <p className="x-sub" style={{ marginTop: 16 }}>
          <Link href="/grup">‹ Semua grup</Link> · <Link href="/persetujuan">Antrean persetujuan</Link>
        </p>
      </div>
    </>
  );

  const agendaBlock = (
    <>
      <p className="x-sec">Agenda {group.name}</p>
      {!ready ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={reload} />
      ) : agenda.length === 0 ? (
        <EmptyState text={`Belum ada agenda di ${group.name}.`} />
      ) : (
        <div className="x-stack">
          {agenda.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}
    </>
  );

  const anggotaBlock = (
    <>
      <p className="x-sec">Anggota · {members.length} orang</p>
      {members.length === 0 ? (
        <EmptyState text="Belum ada anggota tercatat." />
      ) : (
        <table className="x-wtable">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Role</th>
              <th>Ubah role</th>
              <th />
            </tr>
          </thead>
          <tbody>{memberRows}</tbody>
        </table>
      )}
    </>
  );

  const izinBlock = (
    <>
      <p className="x-sec">Role dan Izin</p>
      {permTable}
      {settings}
    </>
  );

  const desktop = (
    <div className="x-vpage">
      <div className="x-top">
        <div>
          <h2 className="x-h">{group.name}</h2>
          <p className="x-sub">{members.length} anggota · Kamu {ROLE_LABEL[myRole]}</p>
        </div>
        <Link className="x-btn x-btn--outline" href="/persetujuan">
          Antrean Persetujuan
        </Link>
        <button type="button" className="x-btn" style={{ width: "auto" }} onClick={() => openNew({ tab: "event", groupId: group.id })}>
          Tambah Event
        </button>
      </div>
      <div className="x-chips" role="group" aria-label="Tab grup" style={{ maxWidth: 420 }}>
        {TABS.map((t) => (
          <button key={t} type="button" className={`x-chip${t === tab ? " is-on" : ""}`} aria-pressed={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        {tab === "Agenda" && agendaBlock}
        {tab === "Anggota" && anggotaBlock}
        {tab === "Izin" && izinBlock}
      </div>
    </div>
  );

  return (
    <>
      <MobileShell>{mobile}</MobileShell>
      <DesktopShell>{desktop}</DesktopShell>
    </>
  );
}
