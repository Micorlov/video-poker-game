package com.micorlov.videopoker;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

/**
 * Carries an invite code across a Play Store install.
 *
 * A friend who taps an invite link without the app installed loses the browser
 * context holding that code the moment Play takes over. invite.html therefore
 * attaches it to the store URL as ?referrer=ref%3DCODE, Play preserves it
 * through the install, and this class reads it back on first launch and hands
 * it to js/deeplink.js — so the friendship still connects and the inviter is
 * still credited, even though the original click is long gone.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "VPInstallReferrer";
    private static final String PREFS = "vp_install_referrer";
    private static final String KEY_DONE = "fetched";
    private static final int DELIVERY_ATTEMPTS = 10;
    private static final long DELIVERY_RETRY_MS = 500;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        fetchInstallReferrerOnce();
    }

    /** The referrer is fixed at install time, so ask Play once and remember that we did. */
    private void fetchInstallReferrerOnce() {
        final SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (prefs.getBoolean(KEY_DONE, false)) return;

        final InstallReferrerClient client = InstallReferrerClient.newBuilder(this).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    boolean settled = false;
                    if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                        settled = true;
                        try {
                            ReferrerDetails details = client.getInstallReferrer();
                            deliverToWebView(details.getInstallReferrer());
                        } catch (Exception e) {
                            Log.w(TAG, "Could not read install referrer", e);
                        }
                    } else if (responseCode == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) {
                        // Play on this device will never answer — stop asking.
                        settled = true;
                    }
                    // SERVICE_UNAVAILABLE and DEVELOPER_ERROR are left unsettled so
                    // the next cold start tries again; Play keeps the referrer for
                    // a good while after install.
                    if (settled) prefs.edit().putBoolean(KEY_DONE, true).apply();
                    try { client.endConnection(); } catch (Exception ignored) { }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    // Transient. KEY_DONE stays unset, so the next launch retries.
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Install Referrer service unavailable", e);
        }
    }

    /**
     * Hands the raw referrer string to the web layer. The page may still be
     * parsing when Play answers, so the snippet parks the value on window either
     * way and reports whether a handler was there to receive it; js/deeplink.js
     * reads the parked value at startup for exactly that race, and this retries
     * for the opposite one.
     */
    private void deliverToWebView(final String rawReferrer) {
        if (rawReferrer == null || rawReferrer.isEmpty()) return;
        final Handler handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            int attempt = 0;

            @Override
            public void run() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) return;
                final Runnable self = this;
                String js = "(function(){window.__installReferrerRaw=" + JSONObject.quote(rawReferrer) + ";"
                        + "if(window.__onInstallReferrer){window.__onInstallReferrer(window.__installReferrerRaw);return true;}"
                        + "return false;})()";
                webView.evaluateJavascript(js, new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if ("true".equals(value)) return;
                        if (++attempt >= DELIVERY_ATTEMPTS) return;
                        handler.postDelayed(self, DELIVERY_RETRY_MS);
                    }
                });
            }
        });
    }
}
