import { supabase } from "./supabase"

export interface UploadResult {
  url: string
  path: string
  success: boolean
  error?: string
}

export interface StorageError {
  message: string
  code?: string
  statusCode?: number
}

// Supported file types and their MIME types
export const SUPPORTED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
} as const

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
    }
  }

  // Check file type
  const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES)
  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload JPG, PNG, WebP, or GIF images only.",
    }
  }

  return { valid: true }
}

/**
 * Get file extension from file name or MIME type
 */
export function getFileExtension(file: File): string {
  // Try to get extension from file name first
  const nameExtension = file.name.split(".").pop()?.toLowerCase()
  if (nameExtension && Object.values(SUPPORTED_FILE_TYPES).flat().includes(`.${nameExtension}`)) {
    return nameExtension
  }

  // Fallback to MIME type mapping
  const mimeExtensions = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]
  if (mimeExtensions && mimeExtensions.length > 0) {
    return mimeExtensions[0].substring(1) // Remove the dot
  }

  return "jpg" // Default fallback
}

/**
 * Generate unique file path for storage
 */
export function generateFilePath(userId: string, orderId: string, file: File, prefix = "file"): string {
  const timestamp = Date.now()
  const extension = getFileExtension(file)
  return `${userId}/${orderId}/${prefix}-${timestamp}.${extension}`
}

/**
 * Check if storage bucket exists
 */
export async function ensureBucketExists(bucketName = "payment-proofs"): Promise<boolean> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("Error checking buckets:", error)
      return false
    }

    const bucketExists = buckets?.some((bucket) => bucket.id === bucketName)

    if (!bucketExists) {
      console.error(`Bucket '${bucketName}' not found`)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in ensureBucketExists:", error)
    return false
  }
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(file: File, filePath: string, bucketName = "payment-proofs"): Promise<UploadResult> {
  try {
    // Validate file first
    const validation = validateFile(file)
    if (!validation.valid) {
      return {
        url: "",
        path: "",
        success: false,
        error: validation.error,
      }
    }

    // Check if bucket exists
    const bucketExists = await ensureBucketExists(bucketName)
    if (!bucketExists) {
      return {
        url: "",
        path: "",
        success: false,
        error: "File storage is not configured. Please contact support.",
      }
    }

    // Upload file
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Upload error:", error)
      return {
        url: "",
        path: "",
        success: false,
        error: getStorageErrorMessage(error),
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      path: filePath,
      success: true,
    }
  } catch (error: any) {
    console.error("Unexpected upload error:", error)
    return {
      url: "",
      path: "",
      success: false,
      error: "An unexpected error occurred during upload. Please try again.",
    }
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  filePath: string,
  bucketName = "payment-proofs",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath])

    if (error) {
      console.error("Delete error:", error)
      return {
        success: false,
        error: getStorageErrorMessage(error),
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Unexpected delete error:", error)
    return {
      success: false,
      error: "An unexpected error occurred during deletion. Please try again.",
    }
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(filePath: string, bucketName = "payment-proofs"): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * List files in a directory
 */
export async function listFiles(
  folderPath: string,
  bucketName = "payment-proofs",
): Promise<{ files: any[]; error?: string }> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).list(folderPath)

    if (error) {
      console.error("List files error:", error)
      return {
        files: [],
        error: getStorageErrorMessage(error),
      }
    }

    return { files: data || [] }
  } catch (error: any) {
    console.error("Unexpected list files error:", error)
    return {
      files: [],
      error: "An unexpected error occurred while listing files.",
    }
  }
}

/**
 * Convert storage error to user-friendly message
 */
function getStorageErrorMessage(error: any): string {
  const message = error.message || error.error || "Unknown error"

  // Handle specific error cases
  if (message.includes("Bucket not found")) {
    return "File storage is not configured. Please contact support."
  }

  if (message.includes("File size")) {
    return `File is too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`
  }

  if (message.includes("mime") || message.includes("type")) {
    return "Invalid file type. Please upload JPG, PNG, WebP, or GIF images only."
  }

  if (message.includes("already exists")) {
    return "A file with this name already exists. Please try again."
  }

  if (message.includes("permission") || message.includes("unauthorized")) {
    return "You do not have permission to upload files. Please contact support."
  }

  if (message.includes("quota") || message.includes("limit")) {
    return "Storage quota exceeded. Please contact support."
  }

  // Generic error message
  return "File upload failed. Please try again or contact support if the problem persists."
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

/**
 * Create image preview URL
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error("File is not an image"))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Compress image file (basic compression)
 */
export function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      resolve(file) // Return original if not an image
      return
    }

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Return original if compression fails
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => {
      resolve(file) // Return original if image loading fails
    }

    img.src = URL.createObjectURL(file)
  })
}

// Export default functions for common use cases
export default {
  uploadFile,
  deleteFile,
  getPublicUrl,
  validateFile,
  generateFilePath,
  ensureBucketExists,
  formatFileSize,
  isImageFile,
  createImagePreview,
  compressImage,
}
