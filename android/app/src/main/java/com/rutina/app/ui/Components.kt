package com.rutina.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rutina.app.data.EventItem
import com.rutina.app.data.priorityLabel
import com.rutina.app.data.roleLabel
import com.rutina.app.ui.theme.Cobalt
import com.rutina.app.ui.theme.Cobalt50
import com.rutina.app.ui.theme.CobaltDeep
import com.rutina.app.ui.theme.Ink
import com.rutina.app.ui.theme.Ink2
import com.rutina.app.ui.theme.Muted
import com.rutina.app.ui.theme.Pending
import com.rutina.app.ui.theme.PriorityColor
import com.rutina.app.ui.theme.Surface

fun priorityColor(p: Int): Color = when (p) {
    1 -> PriorityColor.P1
    2 -> PriorityColor.P2
    3 -> PriorityColor.P3
    else -> PriorityColor.P4
}

fun priorityOnColor(p: Int): Color = if (p == 2 || p == 4) Ink else Color.White

@Composable
fun PriorityChip(p: Int) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(priorityColor(p))
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(priorityLabel(p), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = priorityOnColor(p))
    }
}

@Composable
fun StatusChip(status: String) {
    val bg = if (status == "approved") Color(0xFF17804A) else Pending
    val fg = if (status == "approved") Color.White else Ink
    val label = if (status == "approved") "Disetujui" else "Menunggu"
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = fg)
    }
}

@Composable
fun RoleBadge(role: String) {
    val (bg, fg, border) = when (role) {
        "owner" -> Triple(Cobalt, Color.White, Cobalt)
        "admin" -> Triple(CobaltDeep, Color.White, CobaltDeep)
        "editor" -> Triple(Color.Transparent, Cobalt, Cobalt)
        "contributor" -> Triple(Cobalt50, Cobalt, Cobalt50)
        else -> Triple(Muted, Ink2, Muted)
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(roleLabel(role), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun Tag(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Muted)
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text, fontSize = 12.sp, color = Ink2)
    }
}

@Composable
fun EventCard(event: EventItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(BorderStroke(2.dp, Muted), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(end = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(5.dp)
                .height(64.dp)
                .clip(RoundedCornerShape(0.dp, 3.dp, 3.dp, 0.dp))
                .background(priorityColor(event.priority))
        )
        Spacer(Modifier.width(12.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(vertical = 12.dp)
                .background(Surface)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(event.start, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.width(46.dp))
                Text(event.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Tag(event.group)
                PriorityChip(event.priority)
            }
        }
    }
}

@Composable
fun RutinaButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Cobalt, contentColor = Color.White)
    ) {
        Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
    }
}

@Composable
fun RutinaOutlineButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(2.dp, Cobalt),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Cobalt)
    ) {
        Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
    }
}

@Composable
fun RutinaGhostButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = modifier.fillMaxWidth().height(48.dp)) {
        Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Ink2)
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(
        text,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = Ink2,
        modifier = Modifier.padding(top = 20.dp, bottom = 10.dp)
    )
}

@Composable
fun RutinaSwitch(checked: Boolean, onChange: (Boolean) -> Unit, label: String) {
    Box(
        modifier = Modifier
            .size(width = 52.dp, height = 44.dp)
            .semantics(mergeDescendants = true) {
                role = Role.Switch
                contentDescription = label
                stateDescription = if (checked) "aktif" else "nonaktif"
            }
            .clickable(onClick = { onChange(!checked) }),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(width = 44.dp, height = 26.dp)
                .clip(CircleShape)
                .background(if (checked) Cobalt else Muted),
            contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart
        ) {
            Box(
                modifier = Modifier
                    .padding(horizontal = 3.dp)
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(Color.White)
            )
        }
    }
}
