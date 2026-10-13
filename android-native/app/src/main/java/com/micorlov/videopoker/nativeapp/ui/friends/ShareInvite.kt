package com.micorlov.videopoker.nativeapp.ui.friends

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.social.InviteLink
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber

/** Opens the system share sheet (WhatsApp, SMS, Telegram, email…) with the invite message for [code]. */
object ShareInvite {
    fun open(context: Context, code: String): Boolean {
        val message = context.getString(
            R.string.invite_message,
            formatNumber(RewardPolicy.INVITEE_REWARD),
            InviteLink.forCode(code, context.packageName),
            code,
        )
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, message)
        val chooser = Intent.createChooser(send, context.getString(R.string.friends_invite_button))
        return try {
            context.startActivity(chooser)
            true
        } catch (e: ActivityNotFoundException) {
            false
        }
    }
}
