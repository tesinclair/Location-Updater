package com.anonymous.locationupdater

import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.*

import java.io.File

class ExifModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "ExifModule"

    @ReactMethod
    fun writeGpsToImage(filePath: String, lat: Double, lng: Double, promise: Promise) {
        try {
            val file = File(Uri.parse(filePath).path!!)
            val exif = ExifInterface(file)

            exif.setLatLong(lat, lng)
            exif.saveAttributes()

            promise.resolve(file.absolutePath)
        } catch (e: Exception) {
            promise.reject("EXIF_ERROR", e)
        }
    }
}
