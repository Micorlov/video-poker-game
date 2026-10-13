package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.flow.StateFlow

/** Whatever can show the account picker (the Activity in the app). Kept opaque so the logic stays testable on the JVM. */
interface SignInHost

/** Google sign-in. [user] is null while signed out. */
interface AuthGateway {
    /** False when the app was built without Firebase set up: the Friends tab explains instead of failing. */
    val available: Boolean
    val user: StateFlow<AuthUser?>

    suspend fun signIn(host: SignInHost): Result<AuthUser>

    fun signOut()
}
