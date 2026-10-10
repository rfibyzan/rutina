# RUTINA Web

Next.js App Router + TypeScript + Tailwind. Komponen di `src/components/`,
data demo di `src/lib/` (bentuk sama seperti `db/schema.sql`).

## Rute

`/`, `/beranda`, `/kalender`, `/tambah`, `/grup`, `/grup/[id]`,
`/persetujuan`, `/event/[id]`, `/notifikasi`, `/profil`, `/katalog`.

## Responsif

- Di bawah 1024px: layar ponsel full-bleed + tabbar (untuk iOS:
  pasang via Bagikan lalu Tambah ke Layar Utama, manifest sudah ada).
- 1024px ke atas: sidebar biru + konten (kalender minggu + panel
  detail, tabel grup, tabel persetujuan).

## Perintah

```powershell
npm install
npm run dev
npm run build
npm run lint
```
