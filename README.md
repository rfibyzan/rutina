# RUTINA — Jadwal Pribadi dan Bersama

Sistem Informasi Manajemen Jadwal dan Piket Organisasi Mahasiswa
(Kelompok 10 MPTI). UI diport persis dari `rutina-design-kit(1).zip`
(`prototype/index.html` + `tokens.json`), font PP Neue Machina.

## Struktur

- `web/` — Next.js 16 App Router + TypeScript + Tailwind v4.
  Satu codebase untuk web desktop (sidebar, min 1024px) dan
  web mobile (tabbar bawah, pengganti aplikasi iOS, installable PWA).
- `android/` — Kotlin + Jetpack Compose + Material3 + Room
  (cache offline). Hasil: APK debug siap pasang.
- `db/` — Skema PostgreSQL 16 self-host + aturan izin role.
  Nol layanan berbayar.

## Jalan cepat

```powershell
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # verifikasi produksi
```

APK:

```powershell
cd android
C:\...\gradle-8.10.2\bin\gradle.bat assembleDebug
# hasil: app\build\outputs\apk\debug\app-debug.apk
```

DB lokal: lihat `db/README.md`.

## Catatan lisensi font

PP Neue Machina (Pangram Pangram) adalah font komersial.
File OTF di `web/public/fonts` dan `android/.../res/font`
berasal dari pengguna. Distribusi publik butuh lisensi resmi;
fallback gratis: Space Grotesk (OFL).
