# Database RUTINA: PostgreSQL lokal, nol biaya

Tidak memakai Supabase Cloud / Firebase / layanan berbayar.
Yang dipakai: PostgreSQL 16 resmi via Docker di laptop sendiri.

## Jalankan

```powershell
docker run --name rutina-db -e POSTGRES_PASSWORD=rutina -e POSTGRES_DB=rutina `
  -p 5432:5432 -d postgres:16
Get-Content schema.sql | docker exec -i rutina-db psql -U postgres -d rutina
```

String koneksi lokal: `postgresql://postgres:rutina@localhost:5432/rutina`

## Aturan izin role

Ditegakkan di API (bukan hanya di UI), sesuai matriks `DESIGN.md` bagian 4:

- Lihat agenda: semua role
- Ajukan event (pending): owner, admin, editor, contributor
- Tambah/ubah langsung: owner, admin, editor
- Setujui/tolak: owner, admin
- Kelola anggota: owner, admin (tidak boleh menambah admin lain)
- Hapus grup/ubah pengaturan: owner saja

Aplikasi web dan Android saat ini memakai data demo lokal
(web: `localStorage`, Android: Room) dengan bentuk yang sama
seperti tabel di atas, sehingga migrasi ke Postgres hanya
mengganti lapisan baca/tulis.
