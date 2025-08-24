package com.anonymous.locationupdater

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.*
import java.io.File
import java.io.OutputStream

class ExifModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ExifModule"

    @ReactMethod
    fun writeGpsToImage(filePath: String, lat: Double, lng: Double, promise: Promise) {
        try {
            val inputFile = getFileFromUri(filePath, reactApplicationContext)
                ?: throw Exception("Cannot resolve file from URI: $filePath")

            // Update EXIF
            val exif = ExifInterface(inputFile)
            exif.setLatLong(lat, lng)
            exif.saveAttributes()

            // Save to gallery
            val savedUri = saveToGallery(inputFile, reactApplicationContext)

            promise.resolve(savedUri.toString())
        } catch (e: Exception) {
            Log.e("ExifModule", "Failed to save image with GPS", e)
            promise.reject("EXIF_ERROR", e)
        }
    }

    private fun getFileFromUri(uriString: String, context: Context): File? {
        val uri = Uri.parse(uriString)
        return when (uri.scheme) {
            "file" -> File(uri.path!!)
            "content" -> {
                val inputStream = context.contentResolver.openInputStream(uri) ?: return null
                val tempFile = File(context.cacheDir, "temp_image.jpg")
                inputStream.use { input -> tempFile.outputStream().use { output -> input.copyTo(output) } }
                tempFile
            }
            else -> null
        }
    }

    private fun saveToGallery(file: File, context: Context): Uri {
        val filename = "IMG_${System.currentTimeMillis()}.jpg"

        val resolver = context.contentResolver
        val contentValues = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES)
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val uri: Uri? = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
            ?: throw Exception("Failed to create new MediaStore record")

        resolver.openOutputStream(uri!!).use { out: OutputStream? ->
            file.inputStream().use { input -> input.copyTo(out!!) }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            contentValues.clear()
            contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, contentValues, null, null)
        }

        return uri
    }
}

