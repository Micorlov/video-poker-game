package com.micorlov.videopoker.nativeapp.ui.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.micorlov.videopoker.nativeapp.data.AnalyticsEvents
import com.micorlov.videopoker.nativeapp.data.EventLogger
import com.micorlov.videopoker.nativeapp.data.social.AccountDeletion
import com.micorlov.videopoker.nativeapp.data.social.AuthGateway
import com.micorlov.videopoker.nativeapp.data.social.FriendsRepository
import com.micorlov.videopoker.nativeapp.data.social.RemoteUnavailable
import com.micorlov.videopoker.nativeapp.data.social.SignInHost
import com.micorlov.videopoker.nativeapp.data.social.SocialRemote
import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.ResetCountdown
import com.micorlov.videopoker.nativeapp.domain.UtcDay
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.FriendsRanking
import com.micorlov.videopoker.nativeapp.domain.social.JoinResult
import com.micorlov.videopoker.nativeapp.domain.social.RankRow
import com.micorlov.videopoker.nativeapp.domain.social.ReferralCode
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import com.micorlov.videopoker.nativeapp.ui.ToastMessage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.retryWhen
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class FriendsAuth { UNAVAILABLE, SIGNED_OUT, SIGNING_IN, SIGNED_IN }

/** What the Friends tab shows. The invite card is always there; the rest depends on [auth]. */
data class FriendsUiState(
    val auth: FriendsAuth,
    val code: String? = null,
    val rows: List<RankRow> = emptyList(),
    val resetIn: ResetCountdown = ResetCountdown(0, 0),
    val rewardsEarned: Int = 0,
    val pendingInvite: Boolean = false,
    /** True while the account is being deleted, so Settings can stop a second tap. */
    val deleting: Boolean = false,
) {
    val rewardsCap: Int get() = RewardPolicy.INVITER_CAP
}

sealed interface FriendsEffect {
    /** Open the share sheet with the invite for [code]. */
    data class Share(val code: String) : FriendsEffect

    data class Toast(val message: ToastMessage) : FriendsEffect
}

/**
 * Signs the player in when they reach for Friends, joins any invite a link parked, and keeps
 * the table of today's net profits live: friends' scores from the cloud, the player's own row
 * straight from [profit] so it never lags their last hand.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class FriendsViewModel(
    private val auth: AuthGateway,
    private val remote: SocialRemote,
    private val friends: FriendsRepository,
    private val profit: StateFlow<DailyProfit>,
    private val clock: () -> Long = System::currentTimeMillis,
    /** The time, re-read often enough to keep the countdown current and roll the table over at UTC midnight. */
    private val ticker: Flow<Long> = clockTicker(clock),
    private val events: EventLogger = EventLogger.NONE,
    private val accountDeletion: AccountDeletion = AccountDeletion(auth, remote),
) : ViewModel() {

    private val _state = MutableStateFlow(
        FriendsUiState(
            auth = when {
                !auth.available -> FriendsAuth.UNAVAILABLE
                auth.user.value != null -> FriendsAuth.SIGNED_IN
                else -> FriendsAuth.SIGNED_OUT
            },
            resetIn = UtcDay.untilReset(clock()),
            pendingInvite = friends.hasPendingInvite(),
        ),
    )
    val state: StateFlow<FriendsUiState> = _state.asStateFlow()

    /** False in a build without Firebase: the app then hides Friends instead of showing a dead tab. */
    val available: Boolean get() = auth.available

    private val effectChannel = Channel<FriendsEffect>(Channel.UNLIMITED)
    val effects: ReceiveChannel<FriendsEffect> get() = effectChannel

    private var session: Job? = null
    private var shareWhenReady = false
    private var profileJob: Job? = null

    init {
        viewModelScope.launch { auth.user.collect(::onUser) }
    }

    fun onSignIn(host: SignInHost) {
        if (_state.value.auth != FriendsAuth.SIGNED_OUT) return
        _state.update { it.copy(auth = FriendsAuth.SIGNING_IN) }
        viewModelScope.launch {
            auth.signIn(host).onFailure {
                shareWhenReady = false
                _state.update { it.copy(auth = FriendsAuth.SIGNED_OUT) }
                toast(ToastMessage.SignInFailed)
            }
        }
    }

    /** Erases the player's cloud account and signs them out; the chips and progress on this device stay. */
    fun onDeleteAccount(host: SignInHost) {
        if (auth.user.value == null || _state.value.deleting) return
        _state.update { it.copy(deleting = true) }
        viewModelScope.launch {
            val result = accountDeletion.delete(host)
            _state.update { it.copy(deleting = false) }
            if (result.isSuccess) {
                toast(ToastMessage.AccountDeleted)
            } else {
                toast(ToastMessage.AccountDeleteFailed)
            }
        }
    }

    /** Invite: share right away when signed in, otherwise sign in first and share once the code is known. */
    fun onInvite(host: SignInHost) {
        val current = _state.value
        when {
            current.code != null -> share(current.code)
            current.auth == FriendsAuth.SIGNED_OUT -> {
                shareWhenReady = true
                onSignIn(host)
            }
            current.auth == FriendsAuth.SIGNED_IN -> {
                shareWhenReady = true
                retryProfile()
            }
            current.auth == FriendsAuth.UNAVAILABLE -> toast(ToastMessage.FriendsUnavailable)
            else -> Unit
        }
    }

    fun onAddByCode(input: String) {
        val user = auth.user.value ?: return
        val code = ReferralCode.normalize(input) ?: return toast(ToastMessage.InvalidCode)
        retryProfile()
        viewModelScope.launch { toast(friends.join(user, code).toToast()) }
    }

    /** An invite link was tapped while the app was open: join now if signed in, otherwise ask to sign in. */
    fun onLinkArrived() {
        _state.update { it.copy(pendingInvite = friends.hasPendingInvite()) }
        val user = auth.user.value ?: return
        viewModelScope.launch { joinPendingInvite(user) }
    }

    private suspend fun joinPendingInvite(user: AuthUser) {
        friends.consumePendingInvite(user)?.let { toast(it.toToast()) }
        _state.update { it.copy(pendingInvite = friends.hasPendingInvite()) }
    }

    private fun onUser(user: AuthUser?) {
        session?.cancel()
        if (user == null) {
            _state.update { it.copy(auth = if (auth.available) FriendsAuth.SIGNED_OUT else FriendsAuth.UNAVAILABLE, code = null, rows = emptyList()) }
            return
        }
        _state.update { it.copy(auth = FriendsAuth.SIGNED_IN) }
        session = viewModelScope.launch {
            profileJob = launch { loadProfile(user) }
            launch { watchTable(user) }
            launch { watchRewards(user) }
        }
    }

    /** Loads the profile again after an earlier attempt failed, e.g. when the player taps Invite once back online. */
    private fun retryProfile() {
        val user = auth.user.value ?: return
        if (_state.value.code != null || profileJob?.isActive == true) return
        profileJob = viewModelScope.launch { loadProfile(user) }
    }

    private fun share(code: String) {
        events.log(AnalyticsEvents.INVITE_SHARED, mapOf("channel" to "system_share"))
        effectChannel.trySend(FriendsEffect.Share(code))
    }

    private suspend fun loadProfile(user: AuthUser) {
        val code = fetchCode(user) ?: run {
            shareWhenReady = false
            return toast(ToastMessage.FriendsOffline)
        }
        _state.update { it.copy(code = code) }
        if (shareWhenReady) {
            shareWhenReady = false
            share(code)
        }
        joinPendingInvite(user)
    }

    /** A few quick retries cover a flaky connection right after sign-in; after that the player's next tap retries. */
    private suspend fun fetchCode(user: AuthUser): String? {
        repeat(PROFILE_ATTEMPTS) { attempt ->
            try {
                return remote.ensureProfile(user)
            } catch (e: RemoteUnavailable) {
                if (attempt < PROFILE_ATTEMPTS - 1) delay(RETRY_BASE_MS * (attempt + 1))
            }
        }
        return null
    }

    private suspend fun watchTable(user: AuthUser) {
        val scores = remote.friendUids(user.uid).flatMapLatest { remote.scores(it) }.retryWhen { cause, attempt -> backOff(cause, attempt) }
        combine(scores, profit, ticker) { friendScores, mine, now ->
            val today = UtcDay.key(now)
            val me = FriendScore(user.uid, user.name, mine.valueOn(today), today)
            FriendsRanking.rank(me, friendScores, today) to UtcDay.untilReset(now)
        }.collect { (rows, resetIn) -> _state.update { it.copy(rows = rows, resetIn = resetIn) } }
    }

    private suspend fun watchRewards(user: AuthUser) {
        // collectLatest: a claim stuck offline must not hold back newer snapshots (its intent is kept).
        remote.referralsAsInviter(user.uid).retryWhen { cause, attempt -> backOff(cause, attempt) }.collectLatest { rows ->
            _state.update { it.copy(rewardsEarned = RewardPolicy.earned(rows)) }
            friends.claimRewards(rows)
        }
    }

    /** A dropped listener comes back after a growing pause instead of leaving the table empty for the session. */
    private suspend fun backOff(cause: Throwable, attempt: Long): Boolean {
        if (cause !is RemoteUnavailable) return false
        delay((RETRY_BASE_MS shl attempt.coerceAtMost(MAX_BACKOFF_SHIFT).toInt()).coerceAtMost(MAX_RETRY_MS))
        return true
    }

    private fun toast(message: ToastMessage) {
        effectChannel.trySend(FriendsEffect.Toast(message))
    }

    private fun JoinResult.toToast(): ToastMessage = when (this) {
        is JoinResult.Connected -> ToastMessage.FriendsAdded(count)
        JoinResult.OwnCode -> ToastMessage.OwnInviteCode
        JoinResult.NoSuchCode -> ToastMessage.NoPlayerForCode
        JoinResult.AlreadyConnected -> ToastMessage.AlreadyFriends
        JoinResult.NetworkError -> ToastMessage.FriendsOffline
    }

}

private const val TICK_MS = 30_000L
private const val PROFILE_ATTEMPTS = 3
private const val RETRY_BASE_MS = 2_000L
private const val MAX_RETRY_MS = 60_000L
private const val MAX_BACKOFF_SHIFT = 5L

private fun clockTicker(clock: () -> Long): Flow<Long> = flow {
    while (true) {
        emit(clock())
        delay(TICK_MS)
    }
}
