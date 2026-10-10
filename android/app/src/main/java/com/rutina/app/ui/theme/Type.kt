package com.rutina.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.rutina.app.R

val RutinaFont = FontFamily(
    Font(R.font.pp_neue_machina_light, FontWeight.Light),
    Font(R.font.pp_neue_machina_regular, FontWeight.Normal),
    Font(R.font.pp_neue_machina_regular, FontWeight.Medium),
    Font(R.font.pp_neue_machina_ultrabold, FontWeight.Bold),
)

val RutinaTypography = Typography(
    displayLarge = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Bold, fontSize = 40.sp, lineHeight = 44.sp, letterSpacing = (-0.02).em),
    headlineMedium = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 32.sp, letterSpacing = (-0.02).em),
    titleLarge = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp),
    bodyLarge = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = RutinaFont, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
)
