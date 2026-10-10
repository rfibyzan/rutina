package com.rutina.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rutina.app.MainViewModel
import com.rutina.app.data.EventItem
import com.rutina.app.ui.EventCard
import com.rutina.app.ui.RutinaAsterisk
import com.rutina.app.ui.RutinaButton
import com.rutina.app.ui.RutinaOutlineButton
import com.rutina.app.ui.SectionTitle
import com.rutina.app.ui.theme.Cobalt
import com.rutina.app.ui.theme.Cobalt50
import com.rutina.app.ui.theme.CobaltDeep
import com.rutina.app.ui.theme.Ink
import com.rutina.app.ui.theme.Ink2
import com.rutina.app.ui.theme.Muted
import com.rutina.app.ui.theme.Pending
import com.rutina.app.ui.theme.Surface

@Composable
fun LoginScreen(onEnter: (String) -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Cobalt)
            .padding(24.dp),
        contentAlignment = Alignment.BottomStart
    ) {
        RutinaAsterisk(
            modifier = Modifier.size(160.dp).offset(x = (-60).dp, y = (-50).dp).align(Alignment.TopStart),
            color = CobaltDeep
        )
        RutinaAsterisk(
            modifier = Modifier.size(420.dp).offset(x = 210.dp, y = 60.dp).align(Alignment.TopEnd),
            color = Color.White
        )
        Column {
            Text("RUTINA", fontSize = 52.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(
                "Jadwal pribadi dan bersama, rapi di satu tempat.",
                fontSize = 17.sp,
                color = Color.White,
                modifier = Modifier.padding(top = 10.dp, bottom = 32.dp).width(240.dp)
            )
            RutinaButton("Masuk dengan Google", onClick = { onEnter("Google") })
            Spacer(Modifier.height(10.dp))
            ButtonWhiteOutline("Daftar dengan Email") { onEnter("Email") }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ButtonWhiteOutline(text: String, onClick: () -> Unit) {
    androidx.compose.material3.OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(2.dp, Color.White)
    ) {
        Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
    }
}

@Composable
fun BerandaScreen(vm: MainViewModel, onEvent: (String) -> Unit, onTambah: () -> Unit, onPersetujuan: () -> Unit) {
    val events by vm.events.collectAsState()
    val today = events.filter { it.dateLabel == "Jum 9 Okt" }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Halo, Rafi", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Jumat, 9 Oktober 2026", fontSize = 14.sp, color = Ink2)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Cobalt)
                    .padding(16.dp)
            ) {
                RutinaAsterisk(
                    modifier = Modifier.size(110.dp).offset(x = 36.dp, y = 40.dp).align(Alignment.BottomEnd),
                    color = CobaltDeep
                )
                Column {
                    Text("${today.size} agenda hari ini", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("1 menunggu persetujuan", fontSize = 14.sp, color = Color.White)
                }
            }
            SectionTitle("Hari ini")
        }
        if (today.isEmpty()) {
            item { EmptyBox("Belum ada agenda hari ini. Tambah lewat tombol +.") }
        } else {
            items(today) { e ->
                EventCard(e) { onEvent(e.id) }
                Spacer(Modifier.height(10.dp))
            }
        }
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp)
                    .border(androidx.compose.foundation.BorderStroke(2.dp, Pending), RoundedCornerShape(8.dp))
                    .background(Color(0xFFFEF6D6))
                    .padding(12.dp)
            ) {
                Column {
                    Text("Bentrok", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Rapat Divisi Medinfo vs Latihan Futsal 16:00", fontSize = 14.sp)
                }
            }
            SectionTitle("Pintas")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) { RutinaOutlineButton("Tambah Event", onClick = onTambah) }
                Box(Modifier.weight(1f)) { RutinaOutlineButton("Persetujuan", onClick = onPersetujuan) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun EmptyBox(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
            .padding(28.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontSize = 14.sp, color = Ink2)
    }
}

private val OCT_DOTS = mapOf(5 to 3, 9 to 1, 10 to 2, 12 to 2, 17 to 3, 22 to 1)
private val OCT_LABEL = mapOf(5 to "Sen 5 Okt", 9 to "Jum 9 Okt", 10 to "Sab 10 Okt")

@Composable
fun KalenderScreen(vm: MainViewModel, onEvent: (String) -> Unit) {
    val context = LocalContext.current
    val events by vm.events.collectAsState()
    var selected by remember { mutableIntStateOf(9) }
    var group by remember { mutableStateOf("Semua") }
    val groups = listOf("Semua", "Pribadi", "BEM FT", "Kelompok 10 MPTI", "UKM Futsal")
    val dayLabel = OCT_LABEL[selected]
    val dayEvents = if (dayLabel == null) emptyList() else events.filter {
        it.dateLabel == dayLabel && (group == "Semua" || it.group == group)
    }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Kalender", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp)
                    .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                    .padding(3.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf("Bulan", "Minggu", "Hari").forEach { t ->
                    val on = t == "Bulan"
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(5.dp))
                            .background(if (on) Cobalt else Color.Transparent)
                            .clickable { Toast.makeText(context, "Demo: tampilan $t", Toast.LENGTH_SHORT).show() }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(t, fontSize = 14.sp, color = if (on) Color.White else Ink2)
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Oktober 2026", fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            }
            MonthGrid(selected, onSelect = { selected = it })
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                groups.forEach { g ->
                    val on = g == group
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (on) Cobalt else Surface)
                            .border(androidx.compose.foundation.BorderStroke(2.dp, if (on) Cobalt else Muted), RoundedCornerShape(999.dp))
                            .clickable { group = g }
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        Text(g, fontSize = 12.sp, color = if (on) Color.White else Ink)
                    }
                }
            }
            SectionTitle("Jumat, 9 Okt")
        }
        if (dayLabel == null) {
            item { EmptyBox("Tidak ada agenda pada tanggal $selected. Pilih tanggal 5, 9, atau 10.") }
        } else if (dayEvents.isEmpty()) {
            item { EmptyBox("Tidak ada agenda grup $group pada hari ini.") }
        } else {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    dayEvents.forEach { e ->
                        Row(modifier = Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(com.rutina.app.ui.priorityColor(e.priority)))
                            Spacer(Modifier.width(10.dp))
                            Text(e.start, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.width(46.dp))
                            Text(e.title, fontSize = 14.sp, modifier = Modifier.clickable { onEvent(e.id) })
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun MonthGrid(selected: Int, onSelect: (Int) -> Unit) {
    val dows = listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min")
    Column {
        Row(Modifier.fillMaxWidth()) {
            dows.forEach { d ->
                Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Text(d, fontSize = 12.sp, color = Ink2, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        }
        val cells = mutableListOf<Int?>()
        repeat(3) { cells.add(null) }
        for (d in 1..31) cells.add(d)
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { day ->
                    Box(Modifier.weight(1f).height(44.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            val on = day == selected
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (on) Cobalt else Color.Transparent)
                                    .clickable { onSelect(day) },
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("$day", fontSize = 14.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Normal, color = if (on) Color.White else Ink)
                                    val dot = OCT_DOTS[day]
                                    if (dot != null) {
                                        Box(
                                            Modifier
                                                .size(5.dp)
                                                .clip(CircleShape)
                                                .background(if (on) Color.White else com.rutina.app.ui.priorityColor(dot))
                                        )
                                    } else {
                                        Spacer(Modifier.height(5.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TambahScreen(vm: MainViewModel, onDone: () -> Unit) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("Rapat Evaluasi Piket") }
    var group by remember { mutableStateOf("BEM FT") }
    var date by remember { mutableStateOf("Sen, 12 Okt 2026") }
    var start by remember { mutableStateOf("19:00") }
    var end by remember { mutableStateOf("21:00") }
    var priority by remember { mutableIntStateOf(3) }
    var note by remember { mutableStateOf("Bahas jadwal piket November.") }
    var error by remember { mutableStateOf("") }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Tambah Event", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            FieldLabel("Judul")
            OutlinedTextField(value = title, onValueChange = { title = it }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            FieldLabel("Kalender")
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("BEM FT", "Pribadi", "Kelompok 10 MPTI", "UKM Futsal").forEach { g ->
                    ChipButton(g, g == group) { group = g }
                }
            }
            FieldLabel("Tanggal")
            OutlinedTextField(value = date, onValueChange = { date = it }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            FieldLabel("Mulai-Selesai")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = start, onValueChange = { start = it }, modifier = Modifier.weight(1f), singleLine = true)
                OutlinedTextField(value = end, onValueChange = { end = it }, modifier = Modifier.weight(1f), singleLine = true)
            }
            FieldLabel("Prioritas")
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                (1..4).forEach { p ->
                    val c = com.rutina.app.ui.priorityColor(p)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (p == priority) c else Surface)
                            .border(androidx.compose.foundation.BorderStroke(2.dp, c), RoundedCornerShape(8.dp))
                            .clickable { priority = p }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("P$p", fontWeight = FontWeight.Bold, color = if (p == priority) com.rutina.app.ui.priorityOnColor(p) else Ink)
                    }
                }
            }
            FieldLabel("Catatan")
            OutlinedTextField(value = note, onValueChange = { note = it }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            if (group == "BEM FT") {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 14.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Cobalt50)
                        .padding(12.dp)
                ) {
                    Text("Kamu Kontributor di BEM FT. Event akan diajukan ke Admin untuk disetujui.", fontSize = 13.sp, color = CobaltDeep)
                }
            }
            if (error.isNotEmpty()) {
                Text(error, color = Color(0xFF8F1D1A), fontSize = 13.sp, modifier = Modifier.padding(top = 14.dp))
            }
            Spacer(Modifier.height(16.dp))
            RutinaButton(if (group == "BEM FT") "Ajukan" else "Simpan") {
                if (title.trim().length < 3) {
                    error = "Judul minimal 3 huruf."
                    return@RutinaButton
                }
                if (start >= end) {
                    error = "Jam selesai harus setelah jam mulai."
                    return@RutinaButton
                }
                vm.addEvent(
                    EventItem(
                        "ev-${System.currentTimeMillis()}", title.trim(), group, date, date, start, end, priority,
                        if (group == "BEM FT") "pending" else "approved", "Mungkin", listOf("RB"), 0, emptyList(), note.trim()
                    )
                )
                Toast.makeText(context, if (group == "BEM FT") "Event diajukan ke Admin" else "Event tersimpan", Toast.LENGTH_SHORT).show()
                onDone()
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun FieldLabel(text: String) {
    Text(text, fontSize = 12.sp, color = Ink2, modifier = Modifier.padding(top = 12.dp, bottom = 5.dp))
}

@Composable
fun ChipButton(text: String, on: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (on) Cobalt else Surface)
            .border(androidx.compose.foundation.BorderStroke(2.dp, if (on) Cobalt else Muted), RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(text, fontSize = 12.sp, color = if (on) Color.White else Ink)
    }
}
