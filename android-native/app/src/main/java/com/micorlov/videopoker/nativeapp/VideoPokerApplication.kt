package com.micorlov.videopoker.nativeapp

import android.app.Application

class VideoPokerApplication : Application() {
    val container: AppContainer by lazy { AppContainer(this) }
}
