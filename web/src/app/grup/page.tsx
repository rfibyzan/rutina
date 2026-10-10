"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Group } from "@/lib/data";

const COLORS = ["#073693", "#F28C28", "#1F9D55", "#9AA3B2", "#C42520", "#7C3AED"];

function toGroup(row: { id: string; name: string; color: string }, role: Group["myRole"], members: number, next?: string): Group {
  const short = row.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return { id: row.id, name: row.name, short, members, next, myRole: role, color: row.color };
}

interface Row extends Group {
  next?: string;
}

export default function GrupPage() {
  const { say } = useToast();
  const { user, events } = useStore();
  const [supabase] = useState(() => createClient());
  const [groups, setGroups] = useState<Row[]>([]);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const loadGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      return;
    }
    const { data } = await supabase.from("group_members").select("role,group_id,groups(id,name,color)").eq("user_id", user.id);
    const mapped = ((data ?? []) as { role: string; groups: unknown }[]).map((r) => {
      const gg = r.groups as { id: string; name: string; color: string } | { id: string; name: string; color: string }[] | null;
      return {
        role: r.role,
        group: (Array.isArray(gg) ? (gg[0] ?? null) : gg) as { id: string; name: string; color: string } | null,
      };
    });
    const rows = mapped.filter((r) => r.group);
    const out: Row[] = [];
    for (const r of rows) {
      const g = r.group!;
      const { count } = await supabase.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", g.id);
      const nextEv = events
        .filter((e) => e.group === g.name && e.endAt && e.endAt >= new Date().toISOString())
        .sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""))[0];
      out.push(toGroup(g, r.role as Group["myRole"], count ?? 0, nextEv ? `${nextEv.dateLabel} · ${nextEv.title}` : undefined));
    }
    setGroups(out);
  }, [supabase, user, events]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGroups();
  }, [loadGroups]);

  const create = async () => {
    if (name.trim().length < 3) {
      setError("Nama grup minimal 3 huruf.");
      return;
    }
    if (!user) {
      setError("Masuk dulu untuk membuat grup.");
      return;
    }
    setError("");
    const invite = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: name.trim(), color, owner_id: user.id, invite_code: invite })
      .select("id,name,color")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    await supabase.from("group_members").insert({ group_id: (data as { id: string }).id, user_id: user.id, role: "owner" });
    setName("");
    setMode("none");
    say(`Grup ${name.trim()} dibuat`);
    loadGroups();
  };

  const join = async () => {
    if (!/^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) {
      setError("Kode undangan 6 karakter huruf/angka, mis. BEMFT1.");
      return;
    }
    if (!user) {
      setError("Masuk dulu untuk gabung grup.");
      return;
    }
    setError("");
    const { data, error } = await supabase.from("groups").select("id").eq("invite_code", code.trim().toUpperCase()).maybeSingle();
    if (error || !data) {
      setError("Kode tidak ditemukan.");
      return;
    }
    const gid = (data as { id: string }).id;
    const { error: mErr } = await supabase.from("group_members").upsert({ group_id: gid, user_id: user.id, role: "viewer" }, { onConflict: "group_id,user_id" });
    if (mErr) {
      setError(mErr.message);
      return;
    }
    setCode("");
    setMode("none");
    say("Berhasil gabung grup via kode");
    loadGroups();
  };

  const form = mode !== "none" && (
    <div className="x-card" style={{ marginTop: 16 }}>
      {mode === "create" ? (
        <>
          <div className="x-field" style={{ marginTop: 0 }}>
            <label htmlFor="g-name">Nama grup baru</label>
            <input id="g-name" className="x-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Divisi Humas" />
          </div>
          <div className="x-field">
            <span>Warna grup</span>
            <div className="x-chips" role="group" aria-label="Warna grup">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Warna ${c}`}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: c,
                    border: c === color ? "3px solid var(--ink)" : "2px solid var(--muted)",
                  }}
                />
              ))}
            </div>
          </div>
          {error && <div className="x-err" role="alert">{error}</div>}
          <div className="x-btns" style={{ marginTop: 12 }}>
            <button type="button" className="x-btn" onClick={create}>Buat</button>
            <button type="button" className="x-btn x-btn--ghost" onClick={() => { setMode("none"); setError(""); }}>Batal</button>
          </div>
        </>
      ) : (
        <>
          <div className="x-field" style={{ marginTop: 0 }}>
            <label htmlFor="g-code">Kode undangan</label>
            <input id="g-code" className="x-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Mis. BEMFT1" maxLength={6} />
          </div>
          {error && <div className="x-err" role="alert">{error}</div>}
          <div className="x-btns" style={{ marginTop: 12 }}>
            <button type="button" className="x-btn" onClick={join}>Gabung</button>
            <button type="button" className="x-btn x-btn--ghost" onClick={() => { setMode("none"); setError(""); }}>Batal</button>
          </div>
        </>
      )}
    </div>
  );

  const cards = groups.map((g) => (
    <Link key={g.id} className="x-card x-group" href={`/grup/${g.id}`}>
      <span className="x-avatar" style={{ background: `${g.color}22`, color: g.color }}>{g.short}</span>
      <div>
        <h4>{g.name}</h4>
        <small>{g.members} anggota{g.next ? ` · ${g.next}` : ""}</small>
      </div>
      <RoleBadge role={g.myRole} />
    </Link>
  ));

  const actions = (
    <>
      <div className="x-stack" style={{ marginTop: 20 }}>
        <button type="button" className="x-btn" onClick={() => { setMode("create"); setError(""); }}>
          Buat Grup
        </button>
        <button type="button" className="x-btn x-btn--outline" onClick={() => { setMode("join"); setError(""); }}>
          Gabung via Kode
        </button>
      </div>
      {form}
    </>
  );

  return (
    <>
      <MobileShell>
        <div className="r-screen">
          <h2 className="x-h">Grup</h2>
          <p className="x-sub">{groups.length} grup yang kamu ikuti</p>
          <div className="x-stack" style={{ marginTop: 16 }}>
            {cards.length === 0 ? <div className="x-empty">Belum ada grup. Buat grup pertama.</div> : cards}
          </div>
          {actions}
        </div>
      </MobileShell>
      <DesktopShell>
        <div className="x-vpage">
          <div className="x-top">
            <div>
              <h2 className="x-h">Grup</h2>
              <p className="x-sub">{groups.length} grup yang kamu ikuti</p>
            </div>
            <button type="button" className="x-btn x-btn--outline" onClick={() => { setMode(mode === "join" ? "none" : "join"); setError(""); }}>
              Gabung via Kode
            </button>
            <button type="button" className="x-btn" style={{ width: "auto" }} onClick={() => { setMode(mode === "create" ? "none" : "create"); setError(""); }}>
              Buat Grup
            </button>
          </div>
          <div className="x-gcards">{cards.length === 0 ? <div className="x-empty">Belum ada grup. Buat grup pertama.</div> : cards}</div>
          {form}
        </div>
      </DesktopShell>
    </>
  );
}
