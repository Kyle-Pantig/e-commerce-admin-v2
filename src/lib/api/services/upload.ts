import { apiClient } from "../client"

interface UploadOptions {
  folder?: string
  bucket?: string
  product_id?: string
}

interface UploadResponse {
  url: string
  path: string
  size: number
  content_type: string
}

export const uploadApi = {
  /**
   * Upload an image file
   */
  async uploadImage(file: File, options?: UploadOptions): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const params = new URLSearchParams()
    if (options?.folder) params.append("folder", options.folder)
    if (options?.bucket) params.append("bucket", options.bucket)
    if (options?.product_id) params.append("product_id", options.product_id)

    const queryString = params.toString() ? `?${params.toString()}` : ""

    return apiClient.upload<UploadResponse>(`/upload/image${queryString}`, formData)
  },

  /**
   * Delete an uploaded file
   */
  async deleteFile(path: string, bucket?: string): Promise<void> {
    const params = new URLSearchParams({ path })
    if (bucket) params.append("bucket", bucket)
    
    return apiClient.delete(`/upload/file?${params.toString()}`)
  },
}

