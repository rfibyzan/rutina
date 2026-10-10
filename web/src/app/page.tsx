"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Asterisk } from "@/components/ui";
import { useStore, useToast } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

function LoginForm({ idp }: { idp: string }) {
  const router = useRouter();
  const { say } = useToast();
  const { user, authReady } = useStore();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authReady && user) router.replace("/beranda");
  }, [authReady, user, router]);

  const withGoogle = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/beranda` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Isi email yang valid.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/profil`,
        });
        if (error) throw error;
        say("Tautan reset dikirim ke email");
        setMode("in");
      } else if (mode === "up") {
        if (name.trim().length < 2) {
          setError("Isi nama minimal 2 huruf.");
          setBusy(false);
          return;
        }
        if (password.length < 6) {
          setError("Kata sandi minimal 6 karakter.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        say("Akun dibuat, cek email bila perlu verifikasi");
        router.push("/beranda");
      } else {
        if (password.length < 6) {
          setError("Kata sandi minimal 6 karakter.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        say("Masuk berhasil");
        router.push("/beranda");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="x-stack">
        <button type="button" className="x-btn x-btn--white" onClick={withGoogle} disabled={busy}>
          Masuk dengan Google
        </button>
      </div>
      <div className="x-field">
        <span id={`lg-mode-${idp}`}>Atau lewat email</span>
        <div className="x-chips" role="group" aria-labelledby={`lg-mode-${idp}`}>
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`x-chip${m === mode ? " is-on" : ""}`}
              aria-pressed={m === mode}
              onClick={() => setMode(m)}
            >
              {m === "in" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>
      </div>
      {mode === "up" && (
        <div className="x-field">
          <label htmlFor={`lg-name-${idp}`}>Nama</label>
          <input id={`lg-name-${idp}`} className="x-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" autoComplete="name" />
        </div>
      )}
      <div className="x-field">
        <label htmlFor={`lg-email-${idp}`}>Email</label>
        <input id={`lg-email-${idp}`} className="x-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@students.undip.ac.id" autoComplete="email" />
      </div>
      {mode !== "forgot" && (
        <div className="x-field">
          <label htmlFor={`lg-pass-${idp}`}>Kata sandi</label>
          <input id={`lg-pass-${idp}`} className="x-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete={mode === "up" ? "new-password" : "current-password"} />
        </div>
      )}
      {error && (
        <div className="x-err" role="alert">
          {error}
        </div>
      )}
      <div style={{ marginTop: 16 }} className="x-stack">
        <button type="button" className="x-btn x-btn--white" onClick={submit} disabled={busy}>
          {busy ? "Memproses..." : mode === "up" ? "Daftar dengan Email" : mode === "forgot" ? "Kirim Tautan Reset" : "Masuk dengan Email"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "forgot" ? "in" : "forgot")}
          style={{ background: "none", border: 0, color: "inherit", opacity: 0.85, fontSize: 14, cursor: "pointer" }}
        >
          {mode === "forgot" ? "Kembali masuk" : "Lupa kata sandi"}
        </button>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="r-mobile">
        <div className="x-login-m">
          <div className="x-login x-login-hero">
            <span className="x-ast-float x-ast-f1" aria-hidden="true">
              <Asterisk />
            </span>
            <span className="x-ast-float x-ast-f2" aria-hidden="true">
              <Asterisk />
            </span>
            <span className="x-ast-float x-ast-f3" aria-hidden="true">
              <Asterisk />
            </span>
            <h1 className="x-wordmark x-login-anim">RUTINA</h1>
            <p className="x-login-anim x-login-anim--d1">Jadwal pribadi dan bersama, rapi di satu tempat.</p>
          </div>
          <div className="x-login-form x-login-sheet x-login-fade">
            <LoginForm idp="m" />
          </div>
        </div>
      </div>
      <div className="r-desktop">
        <div className="x-login-split">
          <div className="x-login-brand">
            <span className="x-ast-float x-ast-f1" aria-hidden="true">
              <Asterisk />
            </span>
            <span className="x-ast-float x-ast-f2" aria-hidden="true">
              <Asterisk />
            </span>
            <span className="x-ast-float x-ast-f3" aria-hidden="true">
              <Asterisk />
            </span>
            <span className="x-ast-float x-ast-f4" aria-hidden="true">
              <Asterisk />
            </span>
            <h1 className="x-wordmark x-login-anim" style={{ position: "relative" }}>
              RUTINA
            </h1>
            <p className="x-login-anim x-login-anim--d1" style={{ position: "relative", fontSize: 17, marginTop: 10, maxWidth: 320 }}>
              Jadwal pribadi dan bersama, rapi di satu tempat. Kalender BEM FT, Kelompok 10 MPTI, dan UKM Futsal.
            </p>
          </div>
          <div className="x-login-form x-login-fade">
            <h2 className="x-h">Masuk ke RUTINA</h2>
            <p className="x-sub">Kelompok 10 MPTI, Undip</p>
            <div style={{ marginTop: 24 }}>
              <LoginForm idp="d" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
