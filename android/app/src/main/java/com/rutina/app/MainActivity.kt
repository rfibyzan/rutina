package com.rutina.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.rutina.app.ui.RutinaApp
import com.rutina.app.ui.theme.RutinaTheme

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RutinaTheme {
                RutinaApp(vm)
            }
        }
    }
}
