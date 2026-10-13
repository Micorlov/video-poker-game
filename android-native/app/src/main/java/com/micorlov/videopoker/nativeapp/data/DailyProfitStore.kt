package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.DailyProfit

/** Persists today's UTC net profit. A malformed day key reads as "nothing yet". */
class DailyProfitStore(private val store: KeyValueStore) {

    fun load(): DailyProfit {
        val day = store.getString(DAY)?.takeIf { DAY_KEY.matches(it) } ?: return DailyProfit.NONE
        return DailyProfit(day, store.getLong(NET) ?: 0L)
    }

    fun save(profit: DailyProfit) = store.write {
        putString(DAY, profit.dayKey)
        putLong(NET, profit.net)
    }

    private companion object {
        const val DAY = "profit.utcDay"
        const val NET = "profit.utcNet"
        val DAY_KEY = Regex("""\d{4}-\d{2}-\d{2}""")
    }
}
