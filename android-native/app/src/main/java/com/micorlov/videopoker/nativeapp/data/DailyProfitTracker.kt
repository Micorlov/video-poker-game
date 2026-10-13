package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.DailyProfitPolicy
import com.micorlov.videopoker.nativeapp.domain.UtcDay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The one owner of today's UTC net profit: the game feeds it, the Friends tab and the cloud sync read it. */
class DailyProfitTracker(
    private val store: DailyProfitStore,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val _state = MutableStateFlow(store.load())
    val state: StateFlow<DailyProfit> = _state.asStateFlow()

    fun record(delta: Long) {
        val next = DailyProfitPolicy.record(_state.value, UtcDay.key(clock()), delta)
        store.save(next)
        _state.value = next
    }

    /** Today's net, zero when nothing has been played since the last UTC midnight. */
    fun today(): Long = _state.value.valueOn(UtcDay.key(clock())) ?: 0L
}
