import { apiClient, API_URL, getAccessToken } from "../client"

interface UploadOptions {
  folder?: string
  bucket?: string
  product_id?: string
  onProgress?: (progress: number) => void
}

interface UploadResponse {
  url: string
  path: string
  size: number
  content_type: string
}

export const uploadApi = {
  /**
   * Upload an image file with progress tracking
   */
  async uploadImage(file: File, options?: UploadOptions): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const params = new URLSearchParams()
    if (options?.folder) params.append("folder", options.folder)
    if (options?.bucket) params.append("bucket", options.bucket)
    if (options?.product_id) params.append("product_id", options.product_id)

    const queryString = params.toString() ? `?${params.toString()}` : ""

    // If no progress callback, use the simple apiClient
    if (!options?.onProgress) {
      return apiClient.upload<UploadResponse>(`/upload/image${queryString}`, formData)
    }

    // Use XMLHttpRequest for progress tracking
    return new Promise<UploadResponse>(async (resolve, reject) => {
      try {
        const token = await getAccessToken()
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            options.onProgress?.(progress)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch {
              reject(new Error("Invalid response from server"))
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              reject(new Error(errorData.detail || `Upload failed with status ${xhr.status}`))
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"))
        })

        xhr.open("POST", `${API_URL}/upload/image${queryString}`)
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
        xhr.send(formData)
      } catch (error) {
        reject(error)
      }
    })
  },

  /**
   * Delete an uploaded file
   */
  async deleteFile(path: string, bucket?: string): Promise<void> {
    const params = new URLSearchParams()
    if (bucket) params.append("bucket", bucket)
    const queryString = params.toString() ? `?${params.toString()}` : ""
    
    // Don't encode slashes - the backend expects the path with slashes
    return apiClient.delete(`/upload/image/${path}${queryString}`)
  },
}

