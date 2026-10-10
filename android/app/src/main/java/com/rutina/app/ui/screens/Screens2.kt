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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rutina.app.ApprovalWithDecision
import com.rutina.app.MainViewModel
import com.rutina.app.data.Member
import com.rutina.app.data.SeedData
import com.rutina.app.data.roleLabel
import com.rutina.app.ui.EventCard
import com.rutina.app.ui.RoleBadge
import com.rutina.app.ui.RutinaAsterisk
import com.rutina.app.ui.RutinaButton
import com.rutina.app.ui.RutinaGhostButton
import com.rutina.app.ui.RutinaOutlineButton
import com.rutina.app.ui.RutinaSwitch
import com.rutina.app.ui.SectionTitle
import com.rutina.app.ui.StatusChip
import com.rutina.app.ui.theme.Cobalt
import com.rutina.app.ui.theme.CobaltDeep
import com.rutina.app.ui.theme.Ink
import com.rutina.app.ui.theme.Ink2
import com.rutina.app.ui.theme.Muted
import com.rutina.app.ui.theme.Pending
import com.rutina.app.ui.theme.Surface

private val ROLES = listOf("owner", "admin", "editor", "contributor", "viewer")

@Composable
fun GrupScreen(onGroup: (String) -> Unit) {
    val context = LocalContext.current
    var mode by remember { mutableStateOf("none") }
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var extra by remember { mutableStateOf(listOf<Triple<String, String, String>>()) }
    val groups = SeedData.groups + extra.map { (n, s, r) ->
        com.rutina.app.data.Group("g-$n", n, s, 1, r)
    }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Grup", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("${groups.size} grup yang kamu ikuti", fontSize = 14.sp, color = Ink2)
            Spacer(Modifier.height(16.dp))
        }
        items(groups) { g ->
            val clickableMod = if (g.id.startsWith("g-")) Modifier else Modifier.clickable { onGroup(g.id) }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                    .then(clickableMod)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Cobalt.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(g.short, fontWeight = FontWeight.Bold, color = Cobalt)
                }
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(g.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("${g.members} anggota", fontSize = 13.sp, color = Ink2)
                }
                RoleBadge(g.myRole)
            }
            Spacer(Modifier.height(10.dp))
        }
        item {
            Spacer(Modifier.height(10.dp))
            RutinaButton("Buat Grup") { mode = "create"; error = "" }
            Spacer(Modifier.height(10.dp))
            RutinaOutlineButton("Gabung via Kode") { mode = "join"; error = "" }
            if (mode == "create") {
                FieldLabel("Nama grup baru")
                OutlinedTextField(value = name, onValueChange = { name = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text("Mis. Divisi Humas") })
                if (error.isNotEmpty()) Text(error, color = Color(0xFF8F1D1A), fontSize = 13.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                    Box(Modifier.weight(1f)) {
                        RutinaButton("Buat") {
                            if (name.trim().length < 3) {
                                error = "Nama grup minimal 3 huruf."
                                return@RutinaButton
                            }
                            val short = name.trim().split(" ").map { it.first() }.joinToString("").take(3).uppercase()
                            extra = extra + Triple(name.trim(), short, "owner")
                            Toast.makeText(context, "Grup ${name.trim()} dibuat, kamu Pemilik", Toast.LENGTH_SHORT).show()
                            name = ""
                            mode = "none"
                        }
                    }
                    Box(Modifier.weight(1f)) { RutinaGhostButton("Batal") { mode = "none" } }
                }
            }
            if (mode == "join") {
                FieldLabel("Kode undangan")
                OutlinedTextField(value = code, onValueChange = { code = it.uppercase().take(6) }, modifier = Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text("Mis. BEMFT1") })
                if (error.isNotEmpty()) Text(error, color = Color(0xFF8F1D1A), fontSize = 13.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                    Box(Modifier.weight(1f)) {
                        RutinaButton("Gabung") {
                            if (!Regex("^[A-Z0-9]{6}$").matches(code.trim())) {
                                error = "Kode undangan 6 karakter huruf/angka, mis. BEMFT1."
                                return@RutinaButton
                            }
                            Toast.makeText(context, "Berhasil gabung grup via kode", Toast.LENGTH_SHORT).show()
                            code = ""
                            mode = "none"
                        }
                    }
                    Box(Modifier.weight(1f)) { RutinaGhostButton("Batal") { mode = "none" } }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun GrupDetailScreen(vm: MainViewModel, groupId: String, onEvent: (String) -> Unit, onApprovals: () -> Unit, onBack: () -> Unit) {
    val context = LocalContext.current
    val group = SeedData.groups.find { it.id == groupId }
    val events by vm.events.collectAsState()
    var tab by remember { mutableStateOf("Agenda") }
    var members by remember { mutableStateOf(SeedData.members) }
    var quorum by remember { mutableStateOf(true) }
    var detect by remember { mutableStateOf(true) }
    if (group == null) {
        EmptyBox("Grup tidak ditemukan.")
        return
    }
    val agenda = events.filter { it.group == group.name }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Cobalt)
                    .padding(24.dp)
            ) {
                RutinaAsterisk(
                    modifier = Modifier.size(180.dp).offset(x = 50.dp, y = (-40).dp).align(Alignment.TopEnd),
                    color = CobaltDeep
                )
                Column {
                    Text("Pengaturan grup", fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
                    Text(group.name, fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
            Row(modifier = Modifier.padding(18.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Agenda", "Anggota", "Izin").forEach { t ->
                    ChipButton(t, t == tab) { tab = t }
                }
            }
        }
        if (tab == "Agenda") {
            item { Box(Modifier.padding(horizontal = 18.dp)) { SectionTitle("Agenda ${group.name}") } }
            if (agenda.isEmpty()) {
                item { Box(Modifier.padding(horizontal = 18.dp)) { EmptyBox("Belum ada agenda di ${group.name}.") } }
            } else {
                items(agenda) { e ->
                    Box(Modifier.padding(horizontal = 18.dp)) {
                        EventCard(e) { onEvent(e.id) }
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
        if (tab == "Anggota") {
            item {
                Column(Modifier.padding(horizontal = 18.dp)) {
                    SectionTitle("Anggota · ${group.members} orang")
                    members.forEach { m ->
                        MemberRow(m, onRole = { r ->
                            members = members.map { if (it.name == m.name) it.copy(role = r) else it }
                            Toast.makeText(context, "${m.name} kini ${roleLabel(r)} di ${group.name}", Toast.LENGTH_SHORT).show()
                        })
                    }
                }
            }
        }
        if (tab == "Izin") {
            item {
                Column(Modifier.padding(horizontal = 18.dp)) {
                    SectionTitle("Role dan Izin")
                    PermTable()
                    SectionTitle("Aturan")
                    ToggleRow("Persetujuan: kuorum 2 Admin", quorum, "Persetujuan: kuorum 2 Admin") {
                        quorum = it
                        Toast.makeText(context, "Kuorum persetujuan ${if (it) "aktif" else "nonaktif"}", Toast.LENGTH_SHORT).show()
                    }
                    ToggleRow("Deteksi bentrok otomatis", detect, "Deteksi bentrok otomatis") {
                        detect = it
                        Toast.makeText(context, "Deteksi bentrok ${if (it) "aktif" else "nonaktif"}", Toast.LENGTH_SHORT).show()
                    }
                    SectionTitle("Undangan")
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Text("Kode: BEMFT1 · Berlaku untuk semua role kecuali Pemilik", fontSize = 14.sp)
                    }
                }
            }
        }
        item {
            Column(Modifier.padding(18.dp)) {
                RutinaOutlineButton("Antrean persetujuan", onClick = onApprovals)
                Spacer(Modifier.height(8.dp))
                RutinaGhostButton("‹ Semua grup", onClick = onBack)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun MemberRow(m: Member, onRole: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(m.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.weight(1f))
        RoleBadge(m.role)
        Spacer(Modifier.width(8.dp))
        Box {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Surface)
                    .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
                    .clickable { open = true }
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                Text(roleLabel(m.role), fontSize = 13.sp, color = Ink)
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                ROLES.forEach { r ->
                    DropdownMenuItem(text = { Text(roleLabel(r)) }, onClick = { open = false; onRole(r) })
                }
            }
        }
    }
}

@Composable
private fun PermTable() {
    val rows = listOf(
        "Pemilik" to listOf(true, true, true, true, true),
        "Admin" to listOf(true, true, true, true, true),
        "Editor" to listOf(true, true, true, false, false),
        "Kontributor" to listOf(true, true, false, false, false),
        "Pengikut" to listOf(true, false, false, false, false)
    )
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
            .padding(8.dp)
    ) {
        Row {
            Spacer(Modifier.weight(1.4f))
            listOf("Lihat", "Ajukan", "Langsung", "Setujui", "Anggota").forEach { h ->
                Text(h, fontSize = 10.sp, color = Ink2, modifier = Modifier.weight(1f))
            }
        }
        rows.forEach { (name, vals) ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                Text(name, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.weight(1.4f))
                vals.forEach { v ->
                    Text(
                        if (v) "✓" else "-",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (v) Cobalt else Ink2,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(text: String, checked: Boolean, label: String, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text, fontSize = 14.sp, modifier = Modifier.weight(1f))
        RutinaSwitch(checked, onChange, label)
    }
}

@Composable
fun PersetujuanScreen(vm: MainViewModel) {
    val context = LocalContext.current
    val approvals by vm.approvals.collectAsState()
    val pending = approvals.filter { it.decision == null }
    val done = approvals.filter { it.decision != null }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Persetujuan", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("BEM FT · ${pending.size} menunggu", fontSize = 14.sp, color = Ink2)
            Spacer(Modifier.height(16.dp))
        }
        if (approvals.isEmpty()) {
            item { EmptyBox("Belum ada ajuan masuk.") }
        } else {
            items(pending, key = { it.approval.id }) { a -> ApprovalCard(a, vm) { m -> Toast.makeText(context, m, Toast.LENGTH_SHORT).show() } }
            if (pending.isEmpty()) {
                item { EmptyBox("Semua ajuan sudah diputuskan.") }
            }
            if (done.isNotEmpty()) {
                item { SectionTitle("Sudah diputuskan") }
                items(done, key = { it.approval.id }) { a -> ApprovalCard(a, vm) { m -> Toast.makeText(context, m, Toast.LENGTH_SHORT).show() } }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

private fun decisionLabel(d: String?): String = when (d) {
    "approved" -> "Disetujui"
    "rejected" -> "Ditolak"
    "needs_revision" -> "Minta revisi"
    else -> "Menunggu"
}

@Composable
private fun ApprovalCard(a: ApprovalWithDecision, vm: MainViewModel, toast: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(androidx.compose.foundation.BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
            .background(Surface)
            .padding(14.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            StatusChip(if (a.decision == null) "pending" else "approved")
            if (a.approval.conflict != null && a.decision == null) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color(0xFFC42520))
                        .padding(horizontal = 10.dp, vertical = 3.dp)
                ) {
                    Text("bentrok 1", fontSize = 12.sp, color = Color.White)
                }
            }
            if (a.decision != null) {
                Text(decisionLabel(a.decision), fontSize = 12.sp, color = Ink2)
            }
        }
        Text(a.approval.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
        Text("${a.approval.requester} · ${a.approval.whenText}", fontSize = 13.sp, color = Ink2)
        if (a.decision == null) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                Box(Modifier.weight(1f)) {
                    RutinaButton("Setujui") {
                        vm.decide(a.approval.id, "approved")
                        toast("${a.approval.title} disetujui")
                    }
                }
                Box(Modifier.weight(1f)) {
                    RutinaOutlineButton("Tolak") {
                        vm.decide(a.approval.id, "rejected")
                        toast("${a.approval.title} ditolak")
                    }
                }
                Box(Modifier.weight(1f)) {
                    RutinaGhostButton("Revisi") {
                        vm.decide(a.approval.id, "needs_revision")
                        toast("Permintaan revisi ${a.approval.title} dikirim")
                    }
                }
            }
        }
    }
    Spacer(Modifier.height(10.dp))
}
