package com.micorlov.videopoker.nativeapp.data

/**
 * One Firestore commit for `installs/{id}_open`, in the shape js/telemetry.js
 * sends and firestore.rules accepts from a signed-out player. `at` on the
 * first write and `lastOpenAt` on later ones are server timestamps, so the
 * admin panel's local day is the server's day rather than the phone's clock.
 */
internal object InstallReport {

    fun createBody(state: InstallState, existing: Boolean, device: InstallDevice): String {
        val fields = createFields(state, existing, device.clamped())
        return """{"writes":[{"update":{"name":"${docName(state.id)}","fields":{${encodeFields(fields)}}},""" +
            """"updateTransforms":[{"fieldPath":"at","setToServerValue":"REQUEST_TIME"}],""" +
            """"currentDocument":{"exists":false}}]}"""
    }

    fun playBody(id: String, playMs: Long): String =
        """{"writes":[{"update":{"name":"${docName(id)}","fields":{"playMs":{"integerValue":"$playMs"}}},""" +
            """"updateMask":{"fieldPaths":["playMs"]},""" +
            """"currentDocument":{"exists":true}}]}"""

    fun updateBody(state: InstallState): String =
        """{"writes":[{"update":{"name":"${docName(state.id)}","fields":{"opens":{"integerValue":"${state.opens}"}}},""" +
            """"updateMask":{"fieldPaths":["opens"]},""" +
            """"updateTransforms":[{"fieldPath":"lastOpenAt","setToServerValue":"REQUEST_TIME"}],""" +
            """"currentDocument":{"exists":true}}]}"""

    fun docName(id: String): String =
        "projects/$PROJECT/databases/(default)/documents/installs/${id}_open"

    /** Every key validInstallStage requires, except `at`, which the transform adds. */
    fun createFields(state: InstallState, existing: Boolean, device: InstallDevice): Map<String, Any> {
        val d = device.clamped()
        return linkedMapOf(
            "stage" to "open",
            "installId" to state.id,
            "existing" to existing,
            "opens" to state.opens,
            "version" to d.version,
            "platform" to d.platform,
            "android" to d.androidSdk,
            "chrome" to d.chrome,
            "lang" to d.lang,
            "country" to d.country,
            "source" to d.source,
            "bootMs" to 0,
        )
    }

    private fun encodeFields(fields: Map<String, Any>): String =
        fields.entries.joinToString(",") { (key, value) -> """"$key":${encodeValue(value)}""" }

    private fun encodeValue(value: Any): String = when (value) {
        is Boolean -> """{"booleanValue":$value}"""
        is Int -> """{"integerValue":"$value"}"""
        is String -> """{"stringValue":${jsonString(value)}}"""
        else -> error("install field ${value.javaClass.simpleName} is not a rule type")
    }

    private fun jsonString(value: String): String = buildString {
        append('"')
        value.forEach { ch ->
            when (ch) {
                '\\' -> append("\\\\")
                '"' -> append("\\\"")
                else -> if (ch.code < 0x20) append("\\u%04x".format(ch.code)) else append(ch)
            }
        }
        append('"')
    }

    private const val PROJECT = "video-poker-6d665"
}

enum class InstallWriteResult { OK, RETRY, REJECTED }
