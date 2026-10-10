"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { useStore, useToast } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export default function ProfilPage() {
  const { user, userName, authReady, signOut, reload } = useStore();
  const { say } = useToast();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [sync, setSync] = useState(() => {
    try {
      return window.localStorage.getItem("rutina.pref.sync") === "1";
    } catch {
      return false;
    }
  });
  const [remind, setRemind] = useState(() => {
    try {
      return window.localStorage.getItem("rutina.pref.remind") !== "0";
    } catch {
      return true;
    }
  });
  const [conflictMail, setConflictMail] = useState(() => {
    try {
      return window.localStorage.getItem("rutina.pref.conflict") !== "0";
    } catch {
      return true;
    }
  });
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [saving, setSaving] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(/iPad|iPhone|iPod/.test(window.navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("rutina.pref.sync", sync ? "1" : "0");
      window.localStorage.setItem("rutina.pref.remind", remind ? "1" : "0");
      window.localStorage.setItem("rutina.pref.conflict", conflictMail ? "1" : "0");
    } catch {
      // Penyimpanan penuh, preferensi hanya berlaku sesi ini.
    }
  }, [sync, remind, conflictMail]);

  useEffect(() => {
    if (authReady && !user) router.replace("/");
  }, [authReady, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("name,timezone").eq("id", user.id).maybeSingle().then(({ data }) => {
      const row = data as { name?: string; timezone?: string } | null;
      if (row) {
        setName(row.name ?? "");
        setTimezone(row.timezone ?? "Asia/Jakarta");
      }
    });
  }, [supabase, user]);

  const keluar = async () => {
    await signOut();
    say("Keluar berhasil");
    router.replace("/");
  };

  const saveProfile = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      say("Nama minimal 2 huruf");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("users").update({ name: name.trim(), timezone }).eq("id", user.id);
    setSaving(false);
    say(error ? `Gagal menyimpan: ${error.message}` : "Profil tersimpan");
    reload();
  };

  const body = (
    <>
      <h2 className="x-h">Pengaturan</h2>
      <p className="x-sub">{userName} · {user?.email ?? ""}</p>
      {!isStandalone && (
        <div className="x-info">
          {isIOS ? (
            <>Pasang RUTINA di iPhone: ketuk Bagikan lalu Tambah ke Layar Utama.</>
          ) : (
            <>Pasang RUTINA: buka menu browser lalu Install / Tambah ke Layar Utama.</>
          )}
        </div>
      )}
      <p className="x-sec">Profil</p>
      <div className="x-field">
        <label htmlFor="p-nama">Nama</label>
        <input id="p-nama" className="x-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={userName} />
      </div>
      <div className="x-field">
        <label htmlFor="p-tz">Zona waktu</label>
        <select id="p-tz" className="x-input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
          <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
          <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
        </select>
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="button" className="x-btn x-btn--outline" onClick={saveProfile} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </div>
      <p className="x-sec">Sinkronisasi</p>
      <div className="x-toggle">
        <span>Sinkron Google Calendar <span className="x-tag">Segera</span></span>
        <Switch checked={sync} onChange={(v) => { setSync(v); say(`Sinkron Google Calendar ${v ? "aktif" : "nonaktif"}`); }} label="Sinkron Google Calendar" />
      </div>
      <p className="x-sec">Notifikasi</p>
      <div className="x-toggle">
        <span>Pengingat event</span>
        <Switch checked={remind} onChange={(v) => { setRemind(v); say(`Pengingat ${v ? "aktif" : "nonaktif"}`); }} label="Pengingat event" />
      </div>
      <div className="x-toggle">
        <span>Info bentrok dan ajuan</span>
        <Switch checked={conflictMail} onChange={(v) => { setConflictMail(v); say(`Info bentrok ${v ? "aktif" : "nonaktif"}`); }} label="Info bentrok dan ajuan" />
      </div>
      <p className="x-sec">Data</p>
      <div className="x-btns">
        <button type="button" className="x-btn x-btn--outline x-btn--sm" onClick={() => { reload(); say("Data dimuat ulang"); }}>
          Muat ulang data
        </button>
        <button type="button" className="x-btn x-btn--ghost x-btn--sm" onClick={keluar}>
          Keluar
        </button>
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
