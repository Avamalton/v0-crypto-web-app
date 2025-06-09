"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Upload, ImageIcon, X, Check, AlertCircle, FileImage, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"

interface PaymentProofUploadProps {
  orderId: string
  onUploadComplete: (imageUrl: string, description: string) => void
  existingProof?: string
  existingImage?: string
}

export function PaymentProofUpload({
  orderId,
  onUploadComplete,
  existingProof = "",
  existingImage = "",
}: PaymentProofUploadProps) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(existingImage || "")
  const [description, setDescription] = useState<string>(existingProof || "")
  const [uploading, setUploading] = useState(false)
  const [validationError, setValidationError] = useState<string>("")
  const { toast } = useToast()

  // Simple file validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    try {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return {
          valid: false,
          error: "File size too large. Maximum size is 5MB.",
        }
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        return {
          valid: false,
          error: "Invalid file type. Please upload an image file (JPG, PNG, etc.)",
        }
      }

      return { valid: true }
    } catch (error) {
      console.error("Validation error:", error)
      return {
        valid: false,
        error: "Error validating file. Please try again.",
      }
    }
  }, [])

  // Simple file upload without compression
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      try {
        if (!user?.id) {
          throw new Error("User not authenticated")
        }

        // Generate file path
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
        const fileName = `payment-proof-${orderId}-${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${orderId}/${fileName}`

        console.log("Uploading file:", filePath)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from("payment-proofs").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (error) {
          console.error("Storage upload error:", error)
          throw new Error(error.message || "Failed to upload file")
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(filePath)

        console.log("Upload successful:", urlData.publicUrl)
        return urlData.publicUrl
      } catch (error: any) {
        console.error("Upload error:", error)
        throw new Error(error.message || "Failed to upload file")
      }
    },
    [user?.id, orderId],
  )

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = event.target.files?.[0]
        if (!file) return

        console.log("File selected:", file.name, file.size)

        setValidationError("")

        // Validate file
        const validation = validateFile(file)
        if (!validation.valid) {
          setValidationError(validation.error || "Invalid file")
          return
        }

        setSelectedFile(file)

        // Create simple preview
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (result) {
            setPreviewUrl(result)
          }
        }
        reader.onerror = () => {
          console.error("Error reading file")
          setValidationError("Error reading file. Please try again.")
        }
        reader.readAsDataURL(file)

        toast({
          title: "File Selected",
          description: `${file.name} ready for upload`,
        })
      } catch (error: any) {
        console.error("File select error:", error)
        setValidationError("Error processing file. Please try again.")
      }
    },
    [validateFile, toast],
  )

  const handleSubmit = useCallback(async () => {
    try {
      const trimmedDescription = description?.trim() || ""

      if (!trimmedDescription && !selectedFile) {
        setValidationError("Please provide a description or upload an image")
        return
      }

      if (validationError) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive",
        })
        return
      }

      setUploading(true)
      let imageUrl = previewUrl

      // Upload new image if selected
      if (selectedFile) {
        try {
          console.log("Starting upload...")
          imageUrl = await uploadFile(selectedFile)
          console.log("Upload completed:", imageUrl)
        } catch (uploadError: any) {
          console.error("Upload failed:", uploadError)

          // If upload fails but we have description, allow text-only submission
          if (trimmedDescription.length > 0) {
            toast({
              title: "Upload Failed",
              description: "Image upload failed, but description will be saved.",
              variant: "destructive",
            })
            imageUrl = null
          } else {
            throw uploadError
          }
        }
      }

      console.log("Updating order...")

      // Update order with payment proof
      const { error } = await supabase
        .from("orders")
        .update({
          payment_proof: trimmedDescription,
          payment_proof_image_url: imageUrl || null,
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) {
        console.error("Database update error:", error)
        throw new Error(error.message || "Failed to update order")
      }

      console.log("Order updated successfully")

      onUploadComplete(imageUrl || "", trimmedDescription)

      toast({
        title: "Payment Proof Submitted",
        description: imageUrl
          ? "Your payment proof with image has been submitted successfully"
          : "Your payment description has been submitted successfully",
      })

      // Clean up blob URL
      if (previewUrl && previewUrl !== existingImage && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    } catch (error: any) {
      console.error("Submit error:", error)
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit payment proof",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }, [
    description,
    selectedFile,
    validationError,
    previewUrl,
    existingImage,
    orderId,
    uploadFile,
    onUploadComplete,
    toast,
  ])

  const removeImage = useCallback(() => {
    try {
      setSelectedFile(null)
      setValidationError("")

      // Clean up preview URL
      if (previewUrl && previewUrl !== existingImage && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(existingImage || "")
    } catch (error) {
      console.error("Error removing image:", error)
    }
  }, [previewUrl, existingImage])

  // Safe check for description and file
  const trimmedDescription = description?.trim() || ""
  const hasValidInput = trimmedDescription.length > 0 || selectedFile !== null
  const isSubmitDisabled = uploading || !hasValidInput || !!validationError

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Payment Proof</span>
        </CardTitle>
        <CardDescription>Upload an image of your payment receipt and provide additional details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Upload */}
        <div>
          <Label className="text-sm font-medium">Payment Receipt Image</Label>
          <div className="mt-2">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Payment proof preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg border shadow-sm"
                  onError={(e) => {
                    console.error("Image load error")
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
                {selectedFile && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-6 text-center transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-500 font-medium">Upload an image</span>
                    <span className="text-gray-500"> or click here</span>
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Payment Description
          </Label>
          <Textarea
            id="description"
            value={description || ""}
            onChange={(e) => setDescription(e.target.value || "")}
            placeholder="Describe your payment (e.g., transfer time, reference number, bank details, etc.)"
            rows={3}
            className="mt-1"
            disabled={uploading}
          />
        </div>

        {/* File Info */}
        {selectedFile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Selected File:</span>
            </div>
            <div className="mt-1 text-sm text-blue-700">
              <p>{selectedFile.name}</p>
              <p>Size: {Math.round(selectedFile.size / 1024)}KB</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full" size="lg">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Submit Payment Proof
            </>
          )}
        </Button>

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Upload a clear image of your payment receipt</p>
          <p>• Include payment details in the description</p>
          <p>• Your order status will be updated after submission</p>
        </div>
      </CardContent>
    </Card>
  )
}
