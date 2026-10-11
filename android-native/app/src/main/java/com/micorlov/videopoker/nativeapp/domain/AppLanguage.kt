package com.micorlov.videopoker.nativeapp.domain

/**
 * The sixteen languages the web app ships (SUPPORTED_LANGS in js/i18n.js). Each is named in
 * its own script: a picker that says "German" is useless to the person who needs "Deutsch".
 */
enum class AppLanguage(val tag: String, val nativeName: String, val isRtl: Boolean = false) {
    ENGLISH("en", "English"),
    SPANISH("es", "Español"),
    PORTUGUESE_BR("pt-BR", "Português (Brasil)"),
    GERMAN("de", "Deutsch"),
    FRENCH("fr", "Français"),
    ITALIAN("it", "Italiano"),
    POLISH("pl", "Polski"),
    RUSSIAN("ru", "Русский"),
    TURKISH("tr", "Türkçe"),
    INDONESIAN("id", "Bahasa Indonesia"),
    HINDI("hi", "हिन्दी"),
    JAPANESE("ja", "日本語"),
    KOREAN("ko", "한국어"),
    CHINESE_SIMPLIFIED("zh-CN", "简体中文"),
    HEBREW("he", "עברית", isRtl = true),
    ARABIC("ar", "العربية", isRtl = true),
    ;

    companion object {
        /** Android still reports a few languages under their pre-1989 ISO codes. */
        private val LEGACY_CODES = mapOf("iw" to "he", "in" to "id")

        fun fromTag(tag: String?): AppLanguage? = entries.firstOrNull { it.tag.equals(tag, ignoreCase = true) }

        /**
         * Resolves a device locale ('pt-PT', 'zh-Hans-CN', 'iw') to a shipped language, or null.
         * Portuguese and Chinese variants land on the one we ship; anything else falls to English at the call site.
         */
        fun resolve(languageTag: String?): AppLanguage? {
            if (languageTag.isNullOrBlank()) return null
            val normalized = languageTag.replace('_', '-')
            fromTag(normalized)?.let { return it }
            val base = normalized.substringBefore('-').lowercase()
            return when (val code = LEGACY_CODES[base] ?: base) {
                "pt" -> PORTUGUESE_BR
                "zh" -> CHINESE_SIMPLIFIED
                else -> fromTag(code)
            }
        }
    }
}
