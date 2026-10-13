package com.micorlov.videopoker.nativeapp.data.social

import android.annotation.SuppressLint
import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

/**
 * Google sign-in through Credential Manager, then Firebase Auth with the Google ID token, the
 * same account the web app's Google sign-in creates, so a player is one player in both apps.
 */
class FirebaseAuthGateway(private val context: Context) : AuthGateway {
    private val auth = FirebaseAuth.getInstance()
    private val _user = MutableStateFlow(auth.currentUser?.toAuthUser())

    override val available = true
    override val user: StateFlow<AuthUser?> = _user.asStateFlow()

    init {
        auth.addAuthStateListener { _user.value = it.currentUser?.toAuthUser() }
    }

    override suspend fun signIn(host: SignInHost): Result<AuthUser> = try {
        Result.success(signInOrThrow(host))
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }

    private suspend fun signInOrThrow(host: SignInHost): AuthUser {
        val activity = (host as ActivityHost).activity
        val option = GetSignInWithGoogleOption.Builder(webClientId()).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = CredentialManager.create(activity).getCredential(activity, request).credential
        check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            "unexpected credential ${credential.type}"
        }
        val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
        val signedIn = auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null)).await().user
        return checkNotNull(signedIn).toAuthUser().also { _user.value = it }
    }

    override fun signOut() = auth.signOut()

    /** The OAuth web client id the google-services plugin generates from google-services.json. */
    @SuppressLint("DiscouragedApi")
    private fun webClientId(): String {
        val id = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
        check(id != 0) { "default_web_client_id missing: is google-services.json in place?" }
        return context.getString(id)
    }

    private fun FirebaseUser.toAuthUser() = AuthUser(
        uid = uid,
        name = displayName?.takeIf { it.isNotBlank() } ?: email?.substringBefore('@') ?: DEFAULT_NAME,
        photoUrl = photoUrl?.toString(),
        createdAtMs = metadata?.creationTimestamp ?: 0L,
    )

    private companion object {
        const val DEFAULT_NAME = "Player"
    }
}
