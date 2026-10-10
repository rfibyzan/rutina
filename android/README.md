# RUTINA Android

Kotlin + Jetpack Compose + Material3 (`RutinaTheme`), MVVM,
Navigation Compose, Room (`rutina.db`) untuk cache offline.

## Struktur

- `ui/theme/` — `Color.kt`, `Theme.kt`, `Type.kt` (PP Neue Machina)
- `ui/Asterisk.kt` — motif asterisk 8 lengan
- `ui/Components.kt` — chip prioritas, badge role, kartu event, tombol
- `ui/screens/` — 8 layar + notifikasi + profil
- `ui/RutinaNav.kt` — NavHost + bottom bar (Beranda, Kalender, +, Grup, Profil)
- `data/` — model + `SeedData` (teks demo sama dengan web)
- `data/local/RutinaDb.kt` — Room: events, approvals

## Build APK (gratis, lokal)

Butuh Android SDK (sudah ada) + Gradle 8.10:

```powershell
& "$env:LOCALAPPDATA\Temp\opencode\gradle-8.10.2\bin\gradle.bat" assembleDebug
```

Hasil: `app\build\outputs\apk\debug\app-debug.apk`.
Pasang via USB/sideload, tanpa Play Store.
