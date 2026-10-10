package com.rutina.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.rutina.app.MainViewModel
import com.rutina.app.ui.screens.BerandaScreen
import com.rutina.app.ui.screens.EventDetailScreen
import com.rutina.app.ui.screens.GrupDetailScreen
import com.rutina.app.ui.screens.GrupScreen
import com.rutina.app.ui.screens.KalenderScreen
import com.rutina.app.ui.screens.LoginScreen
import com.rutina.app.ui.screens.NotifikasiScreen
import com.rutina.app.ui.screens.PersetujuanScreen
import com.rutina.app.ui.screens.ProfilScreen
import com.rutina.app.ui.screens.TambahScreen
import com.rutina.app.ui.theme.Cobalt
import com.rutina.app.ui.theme.Ink2
import com.rutina.app.ui.theme.Muted
import com.rutina.app.ui.theme.Surface

object Routes {
    const val LOGIN = "login"
    const val BERANDA = "beranda"
    const val KALENDER = "kalender"
    const val TAMBAH = "tambah"
    const val GRUP = "grup"
    const val GRUP_DETAIL = "grupDetail"
    const val PERSETUJUAN = "persetujuan"
    const val EVENT_DETAIL = "eventDetail"
    const val NOTIFIKASI = "notifikasi"
    const val PROFIL = "profil"
}

@Composable
fun RutinaApp(vm: MainViewModel = viewModel()) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: Routes.LOGIN
    val showBar = route != Routes.LOGIN
    Scaffold(
        bottomBar = { if (showBar) RutinaBottomBar(nav, route) },
        containerColor = Surface
    ) { inner ->
        Box(Modifier.fillMaxSize().padding(inner)) {
            NavHost(nav, startDestination = Routes.LOGIN) {
                composable(Routes.LOGIN) {
                    LoginScreen(onEnter = {
                        nav.navigate(Routes.BERANDA) {
                            popUpTo(Routes.LOGIN) { inclusive = true }
                        }
                    })
                }
                composable(Routes.BERANDA) {
                    BerandaScreen(
                        vm,
                        onEvent = { nav.navigate("${Routes.EVENT_DETAIL}/$it") },
                        onTambah = { nav.navigate(Routes.TAMBAH) },
                        onPersetujuan = { nav.navigate(Routes.PERSETUJUAN) }
                    )
                }
                composable(Routes.KALENDER) {
                    KalenderScreen(vm, onEvent = { nav.navigate("${Routes.EVENT_DETAIL}/$it") })
                }
                composable(Routes.TAMBAH) {
                    TambahScreen(vm, onDone = {
                        nav.navigate(Routes.KALENDER) {
                            popUpTo(Routes.BERANDA)
                        }
                    })
                }
                composable(Routes.GRUP) {
                    GrupScreen(onGroup = { nav.navigate("${Routes.GRUP_DETAIL}/$it") })
                }
                composable(
                    "${Routes.GRUP_DETAIL}/{id}",
                    arguments = listOf(navArgument("id") { type = NavType.StringType })
                ) { back ->
                    GrupDetailScreen(
                        vm,
                        groupId = back.arguments?.getString("id") ?: "",
                        onEvent = { nav.navigate("${Routes.EVENT_DETAIL}/$it") },
                        onApprovals = { nav.navigate(Routes.PERSETUJUAN) },
                        onBack = { nav.popBackStack() }
                    )
                }
                composable(Routes.PERSETUJUAN) { PersetujuanScreen(vm) }
                composable(
                    "${Routes.EVENT_DETAIL}/{id}",
                    arguments = listOf(navArgument("id") { type = NavType.StringType })
                ) { back ->
                    EventDetailScreen(vm, eventId = back.arguments?.getString("id") ?: "", onBack = { nav.popBackStack() })
                }
                composable(Routes.NOTIFIKASI) {
                    NotifikasiScreen(onApprovals = { nav.navigate(Routes.PERSETUJUAN) })
                }
                composable(Routes.PROFIL) {
                    ProfilScreen(vm, onLogout = {
                        nav.navigate(Routes.LOGIN) {
                            popUpTo(nav.graph.findStartDestination().id) { inclusive = true }
                        }
                    })
                }
            }
        }
    }
}

@Composable
private fun RutinaBottomBar(nav: NavHostController, route: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .background(Surface)
            .border(androidx.compose.foundation.BorderStroke(2.dp, Muted)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        BarItem("Beranda", route == Routes.BERANDA || route.startsWith(Routes.EVENT_DETAIL), Modifier.weight(1f)) {
            nav.navigate(Routes.BERANDA) { launchSingleTop = true }
        }
        BarItem("Kalender", route == Routes.KALENDER || route == Routes.TAMBAH, Modifier.weight(1f)) {
            nav.navigate(Routes.KALENDER) { launchSingleTop = true }
        }
        Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Cobalt)
                    .clickable { nav.navigate(Routes.TAMBAH) },
                contentAlignment = Alignment.Center
            ) {
                Text("+", fontSize = 28.sp, color = Color.White)
            }
        }
        BarItem("Grup", route == Routes.GRUP || route.startsWith(Routes.GRUP_DETAIL) || route == Routes.PERSETUJUAN, Modifier.weight(1f)) {
            nav.navigate(Routes.GRUP) { launchSingleTop = true }
        }
        BarItem("Profil", route == Routes.PROFIL, Modifier.weight(1f)) {
            nav.navigate(Routes.PROFIL) { launchSingleTop = true }
        }
    }
}

@Composable
private fun BarItem(label: String, on: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier = modifier.clickable(onClick = onClick).padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(18.dp)
                .border(androidx.compose.foundation.BorderStroke(2.dp, if (on) Cobalt else Ink2), RoundedCornerShape(4.dp))
                .background(if (on) Cobalt else Color.Transparent)
        )
        Text(label, fontSize = 12.sp, color = if (on) Cobalt else Ink2, fontWeight = FontWeight.Medium)
    }
}
