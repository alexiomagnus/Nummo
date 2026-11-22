plugins {
    id("com.android.application") version "9.1.0" apply false
    // AGP 9 compiles Kotlin itself (built-in Kotlin); this only chooses the compiler version: googleid 1.2.1 needs 2.4.
    id("org.jetbrains.kotlin.android") version "2.4.0" apply false
}
