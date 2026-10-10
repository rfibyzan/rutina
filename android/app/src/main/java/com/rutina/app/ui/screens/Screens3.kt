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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rutina.app.MainViewModel
import com.rutina.app.data.SeedData
import com.rutina.app.ui.PriorityChip
import com.rutina.app.ui.RutinaButton
import com.rutina.app.ui.RutinaGhostButton
import com.rutina.app.ui.RutinaOutlineButton
import com.rutina.app.ui.RutinaSwitch
import com.rutina.app.ui.SectionTitle
import com.rutina.app.ui.StatusChip
import com.rutina.app.ui.theme.Cobalt
import com.rutina.app.ui.theme.Cobalt50
import com.rutina.app.ui.theme.Ink2
import com.rutina.app.ui.theme.Muted
import com.rutina.app.ui.theme.Surface

@Composable
fun EventDetailScreen(vm: MainViewModel, eventId: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val events by vm.events.collectAsState()
    val event = events.find { it.id == eventId }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("‹ Kembali", fontSize = 14.sp, color = Ink2, modifier = Modifier.clickable(onClick = onBack))
            if (event == null) {
                EmptyBox("Event tidak ditemukan.")
            } else {
            Text(event.title, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
            Text("${event.dateLabel} · ${event.start}-${event.end} · ${event.group}", fontSize = 14.sp, color = Ink2)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                PriorityChip(event.priority)
                StatusChip(event.status)
            }
            SectionTitle("Kehadiran")
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Hadir", "Mungkin", "Tidak").forEach { r ->
                    val on = r == event.rsvp
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (on) Cobalt else Surface)
                            .border(androidx.compose.foundation.BorderStroke(2.dp, if (on) Cobalt else Muted), RoundedCornerShape(8.dp))
                            .clickable {
                                vm.setRsvp(event.id, r)
                                Toast.makeText(context, "RSVP ${event.title}: $r", Toast.LENGTH_SHORT).show()
                            }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(r, fontSize = 14.sp, color = if (on) Color.White else Ink2)
                    }
                }
            }
            SectionTitle("Peserta")
            Row {
                event.attendees.forEach { a ->
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Cobalt50),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(a, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Cobalt)
                    }
                    Spacer(Modifier.width(2.dp))
                }
                if (event.extraAttendees > 0) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(Muted),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("+${event.extraAttendees}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Ink2)
                    }
                }
            }
            SectionTitle("Checklist")
            if (event.checklist.isEmpty()) {
                EmptyBox("Belum ada checklist untuk event ini.")
            } else {
                event.checklist.forEachIndexed { i, c ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                        Checkbox(
                            checked = c.done,
                            onCheckedChange = { vm.toggleCheck(event.id, i) },
                            colors = CheckboxDefaults.colors(checkedColor = Cobalt)
                        )
                        Text(
                            c.label,
                            fontSize = 14.sp,
                            color = Ink2,
                            textDecoration = if (c.done) TextDecoration.LineThrough else TextDecoration.None
                        )
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            RutinaButton("Tandai Selesai") {
                Toast.makeText(context, "${event.title} ditandai selesai", Toast.LENGTH_SHORT).show()
            }
            Spacer(Modifier.height(10.dp))
            RutinaOutlineButton("Tidak Hadir") {
                Toast.makeText(context, "Ketidakhadiran ${event.title} dicatat", Toast.LENGTH_SHORT).show()
            }
            Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun NotifikasiScreen(onApprovals: () -> Unit) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Notifikasi", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("${SeedData.notices.size} belum dibaca", fontSize = 14.sp, color = Ink2)
            Spacer(Modifier.height(16.dp))
        }
        items(SeedData.notices) { n ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                    .padding(14.dp)
            ) {
                Text(n.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(n.body, fontSize = 14.sp, color = Ink2, modifier = Modifier.padding(top = 4.dp))
                Text(n.day, fontSize = 13.sp, color = Ink2, modifier = Modifier.padding(top = 6.dp))
            }
            Spacer(Modifier.height(10.dp))
        }
        item {
            Spacer(Modifier.height(6.dp))
            RutinaOutlineButton("Buka antrean persetujuan", onClick = onApprovals)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun ProfilScreen(vm: MainViewModel, onLogout: () -> Unit) {
    val context = LocalContext.current
    var sync by remember { mutableStateOf(false) }
    var remind by remember { mutableStateOf(true) }
    var info by remember { mutableStateOf(true) }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Profil", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Rafi Byzan · rafi@students.undip.ac.id", fontSize = 14.sp, color = Ink2)
            SectionTitle("Sinkronisasi")
            ToggleRowIntro("Sinkron Google Calendar", sync, "Sinkron Google Calendar") {
                sync = it
                Toast.makeText(context, "Sinkron Google Calendar ${if (it) "aktif" else "nonaktif"}", Toast.LENGTH_SHORT).show()
            }
            SectionTitle("Notifikasi")
            ToggleRowIntro("Pengingat event", remind, "Pengingat event") {
                remind = it
                Toast.makeText(context, "Pengingat ${if (it) "aktif" else "nonaktif"}", Toast.LENGTH_SHORT).show()
            }
            ToggleRowIntro("Info bentrok dan ajuan", info, "Info bentrok dan ajuan") {
                info = it
                Toast.makeText(context, "Info bentrok ${if (it) "aktif" else "nonaktif"}", Toast.LENGTH_SHORT).show()
            }
            SectionTitle("Data demo")
            RutinaOutlineButton("Kembalikan data demo") {
                vm.resetDemo()
                Toast.makeText(context, "Data demo dikembalikan", Toast.LENGTH_SHORT).show()
            }
            Spacer(Modifier.height(10.dp))
            RutinaGhostButton("Keluar", onClick = onLogout)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ToggleRowIntro(text: String, checked: Boolean, label: String, onChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, fontSize = 14.sp, modifier = Modifier.weight(1f))
        RutinaSwitch(checked, onChange, label)
    }
}
