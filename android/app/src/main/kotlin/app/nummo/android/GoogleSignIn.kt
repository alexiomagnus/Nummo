package app.nummo.android

import android.util.Log
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

// Google sign-in for Advanced mode (22 November, user's request): Google refuses its sign-in page inside a WebView, so the
// app asks Android's Credential Manager for the account (the system's «Sign in with Google» sheet) and hands Google's ID
// token to the page, which signs in to Firebase with it (`signInWithCredential`). The token is for the project's Web
// client (`BuildConfig.GOOGLE_CLIENT_ID`); Google issues it only to this package signed with a SHA-1 registered there.
// Nothing is stored here: Firebase keeps the session in the page, as in the browser.
class GoogleSignIn(private val activity: MainActivity) {
    private val manager = CredentialManager.create(activity)

    val project: String get() = if (BuildConfig.GOOGLE_CLIENT_ID.isBlank()) "" else BuildConfig.FIREBASE_PROJECT

    fun signIn(id: String) {
        if (project.isEmpty()) {
            activity.deliver(id, "unavailable")
            return
        }
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID).build())
            .build()
        activity.awayForResult = true
        manager.getCredentialAsync(activity, request, null, activity.mainExecutor,
            object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(result: GetCredentialResponse) {
                    activity.awayForResult = false
                    val credential = result.credential
                    val token = if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                        try { GoogleIdTokenCredential.createFrom(credential.data).idToken } catch (_: GoogleIdTokenParsingException) { null }
                    } else null
                    if (token == null) activity.deliver(id, "error") else activity.deliver(id, "ok", token)
                }

                override fun onError(e: GetCredentialException) {
                    activity.awayForResult = false
                    // Only the kind of failure, never account data: enough to tell a configuration problem on a phone.
                    Log.w(tag, "Google sign-in: ${e.type}")
                    activity.deliver(id, when (e) {
                        is GetCredentialCancellationException -> "cancelled"
                        is NoCredentialException -> "unavailable"
                        else -> "error"
                    })
                }
            })
    }

    // After «Esci»: the next sign-in shows the account choice again.
    fun signOut() {
        manager.clearCredentialStateAsync(ClearCredentialStateRequest(), null, activity.mainExecutor,
            object : CredentialManagerCallback<Void?, ClearCredentialException> {
                override fun onResult(result: Void?) {}
                override fun onError(e: ClearCredentialException) { Log.w(tag, "Google sign-out: ${e.type}") }
            })
    }

    private companion object {
        const val tag = "Nummo"
    }
}
