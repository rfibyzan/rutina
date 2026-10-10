package com.rutina.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

private val RutinaColors = lightColorScheme(
    primary = Cobalt, onPrimary = Surface,
    primaryContainer = Cobalt50, onPrimaryContainer = Cobalt,
    secondary = CobaltDeep, onSecondary = Surface,
    background = Surface, onBackground = Ink,
    surface = Surface, onSurface = Ink,
    surfaceVariant = Muted, onSurfaceVariant = Ink2,
    outline = Muted, error = Danger, onError = Surface,
)

val RutinaShapes = Shapes(
    small = RoundedCornerShape(6.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(12.dp),
)

@Composable
fun RutinaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = RutinaColors, typography = RutinaTypography, shapes = RutinaShapes, content = content)
}
