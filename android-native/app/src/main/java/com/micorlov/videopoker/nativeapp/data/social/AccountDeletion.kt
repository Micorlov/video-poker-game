package com.micorlov.videopoker.nativeapp.data.social

/**
 * Deletes the player's account: first what the app stored for them in the cloud, then the
 * sign-in itself. In that order because the cloud data can only be removed while still signed in.
 * Repeating it after a failure is safe, so a half-finished attempt just runs again.
 */
class AccountDeletion(
    private val auth: AuthGateway,
    private val remote: SocialRemote,
    /** Stops anything else writing to the profile while it is being erased; [release] undoes it once the attempt is over. */
    private val hold: () -> Unit = {},
    private val release: () -> Unit = {},
) {
    suspend fun delete(host: SignInHost): Result<Unit> {
        val uid = auth.user.value?.uid ?: return Result.failure(IllegalStateException("not signed in"))
        hold()
        return try {
            remote.deleteUserData(uid)
            auth.deleteAccount(host)
        } catch (e: RemoteUnavailable) {
            Result.failure(e)
        } finally {
            // Signed out, nothing is sent; after a failure the player is still signed in and syncing resumes.
            release()
        }
    }
}
