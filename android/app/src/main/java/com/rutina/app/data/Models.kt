package com.rutina.app.data

data class CheckItem(val label: String, val done: Boolean)

data class EventItem(
    val id: String,
    val title: String,
    val group: String,
    val day: String,
    val dateLabel: String,
    val start: String,
    val end: String,
    val priority: Int,
    val status: String,
    val rsvp: String,
    val attendees: List<String>,
    val extraAttendees: Int,
    val checklist: List<CheckItem>,
    val note: String
)

data class Group(val id: String, val name: String, val short: String, val members: Int, val myRole: String)
data class Member(val name: String, var role: String)
data class Approval(val id: String, val title: String, val requester: String, val whenText: String, val conflict: String?)
data class Notice(val id: String, val title: String, val body: String, val day: String)

fun roleLabel(role: String): String = when (role) {
    "owner" -> "Pemilik"
    "admin" -> "Admin"
    "editor" -> "Editor"
    "contributor" -> "Kontributor"
    else -> "Pengikut"
}

fun priorityLabel(p: Int): String = when (p) {
    1 -> "P1 Mendesak"
    2 -> "P2 Tinggi"
    3 -> "P3 Sedang"
    else -> "P4 Rendah"
}

object SeedData {
    val events = listOf(
        EventItem("kuliah-awan", "Kuliah Infrastruktur Awan", "Pribadi", "Jumat, 9 Okt", "Jum 9 Okt", "08:00", "10:00", 2, "approved", "Hadir", listOf("RB"), 0, listOf(CheckItem("Siapkan laptop", true), CheckItem("Review materi arsitektur jaringan awan", false)), "Ruang kelas reguler."),
        EventItem("piket-sekretariat", "Piket Sekretariat", "BEM FT", "Jumat, 9 Okt", "Jum 9 Okt", "13:00", "15:00", 1, "approved", "Hadir", listOf("RB", "FS", "AD"), 3, listOf(CheckItem("Sapu ruangan", true), CheckItem("Rekap kas", false), CheckItem("Cek inventaris", false)), "Dibuat oleh Admin BEM FT."),
        EventItem("rapat-medinfo", "Rapat Divisi Medinfo", "BEM FT", "Jumat, 9 Okt", "Jum 9 Okt", "16:00", "17:30", 3, "approved", "Mungkin", listOf("RB", "DS"), 0, listOf(CheckItem("Siapkan evaluasi piket", false)), "Bentrok dengan Latihan Futsal 16:00."),
        EventItem("belajar-uts", "Belajar UTS", "Pribadi", "Jumat, 9 Okt", "Jum 9 Okt", "20:00", "22:00", 2, "approved", "Hadir", listOf("RB"), 0, listOf(CheckItem("Rangkuman sinyal dan sistem", false)), ""),
        EventItem("rapat-kelompok-10", "Rapat Kelompok 10", "Kelompok 10 MPTI", "Senin, 5 Okt", "Sen 5 Okt", "10:00", "12:00", 3, "approved", "Hadir", listOf("RB", "FS", "AD"), 0, listOf(CheckItem("Finalisasi laporan MPTI", false)), ""),
        EventItem("kuliah-jaringan", "Kuliah Jaringan", "Pribadi", "Selasa, 6 Okt", "Sel 6 Okt", "08:00", "10:00", 3, "approved", "Hadir", listOf("RB"), 0, emptyList(), ""),
        EventItem("latihan-futsal", "Latihan Futsal", "UKM Futsal", "Rabu, 7 Okt", "Rab 7 Okt", "15:00", "17:00", 4, "approved", "Tidak", listOf("RB"), 0, emptyList(), ""),
        EventItem("belajar-kam", "Belajar UTS", "Pribadi", "Kamis, 8 Okt", "Kam 8 Okt", "19:00", "21:00", 2, "approved", "Hadir", listOf("RB"), 0, emptyList(), ""),
        EventItem("bazar", "Bazar Dana Usaha", "BEM FT", "Sabtu, 10 Okt", "Sab 10 Okt", "09:00", "12:00", 2, "pending", "Mungkin", listOf("FS"), 0, emptyList(), "Menunggu persetujuan Admin BEM FT.")
    )
    val groups = listOf(
        Group("bem-ft", "BEM FT", "BF", 42, "admin"),
        Group("kelompok-10", "Kelompok 10 MPTI", "K10", 3, "owner"),
        Group("ukm-futsal", "UKM Futsal", "UF", 25, "viewer")
    )
    val members = listOf(
        Member("Rafi Byzan", "admin"),
        Member("Frans S.", "editor"),
        Member("Aufan D.", "contributor"),
        Member("Dina A.", "viewer")
    )
    val approvals = listOf(
        Approval("ap-1", "Bazar Dana Usaha", "Frans", "Sab 10 Okt, 09:00-12:00", null),
        Approval("ap-2", "Rapat Evaluasi Piket", "Aufan", "Sen 12 Okt, 19:00", "Bentrok 1")
    )
    val notices = listOf(
        Notice("n-1", "2 ajuan menunggu persetujuan", "Bazar Dana Usaha dan Rapat Evaluasi Piket menunggu keputusan Admin BEM FT.", "Jumat, 9 Okt"),
        Notice("n-2", "Pengingat: Piket Sekretariat 13:00", "Jangan lupa membawa kunci sekretariat dan rekap kas.", "Jumat, 9 Okt"),
        Notice("n-3", "Bentrok terdeteksi", "Rapat Divisi Medinfo bentrok dengan Latihan Futsal pukul 16:00.", "Kamis, 8 Okt"),
        Notice("n-4", "Role diubah", "Frans S. kini Editor di BEM FT.", "Rabu, 7 Okt")
    )
}
