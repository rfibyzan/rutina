package com.rutina.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.runtime.Composable

@Composable
fun RutinaAsterisk(modifier: Modifier, color: Color) {
    Canvas(modifier) {
        val s = size.minDimension
        val w = s * 0.16f
        listOf(0f, 45f, 90f, 135f).forEach { deg ->
            rotate(deg) {
                drawRoundRect(color, topLeft = Offset(center.x - w / 2, center.y - s * 0.48f),
                    size = Size(w, s * 0.96f), cornerRadius = CornerRadius(s * 0.015f))
            }
        }
    }
}
