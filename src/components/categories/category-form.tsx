"use client"

import { useMemo, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { IconUpload, IconX } from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { categorySchema, type CategoryFormData } from "@/lib/validations"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parent_id: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  children?: Category[] | null
}

interface CategoryFormProps {
  categories: Category[]
  category?: Category
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({
  categories,
  category,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description || "",
          image: category.image || "",
          parent_id: category.parent_id || null,
          display_order: category.display_order ?? 0,
          is_active: category.is_active ?? true,
        }
      : {
          name: "",
          description: "",
          image: "",
          parent_id: null,
          display_order: 0,
          is_active: true,
        },
  })

  const parentId = watch("parent_id")
  const isActive = watch("is_active")
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(
    category?.image || null
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Memoize available parents to avoid recalculating on every render
  const availableParents = useMemo(() => {
    if (!category) return categories
    
    const excludeIds = new Set([category.id])
    const addChildren = (cat: Category) => {
      if (cat.children) {
        cat.children.forEach(child => {
          excludeIds.add(child.id)
          addChildren(child)
        })
      }
    }
    addChildren(category)
    return categories.filter(cat => !excludeIds.has(cat.id))
  }, [categories, category])

  // Handle form submission with file upload
  const handleFormSubmit = async (data: CategoryFormData) => {
    // If there's a selected file, upload it first
    if (selectedFile) {
      setUploading(true)
      try {
        const supabase = createClient()
        const session = await supabase.auth.getSession()

        if (!session.data.session?.access_token) {
          toast.error("Not authenticated")
          return
        }

        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("folder", "categories")

        const API_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"
        const response = await fetch(`${API_URL}/upload/image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: "Failed to upload image" }))
          throw new Error(error.detail || "Failed to upload image")
        }

        const uploadResult = await response.json()
        // Update the form data with the uploaded image URL
        data.image = uploadResult.url
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload image")
        setUploading(false)
        return // Don't proceed with category creation/update
      } finally {
        setUploading(false)
      }
    }

    // Proceed with category creation/update
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <FieldGroup className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="name">Category Name *</FieldLabel>
            <Input
              id="name"
              placeholder="e.g., Electronics"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field data-invalid={errors.display_order ? true : undefined}>
            <FieldLabel htmlFor="display_order">Display Order</FieldLabel>
            <Input
              id="display_order"
              type="number"
              min="0"
              placeholder="0"
              aria-invalid={errors.display_order ? true : undefined}
              {...register("display_order", { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.display_order && (
              <FieldError>{errors.display_order.message}</FieldError>
            )}
            <FieldDescription className="text-xs">
              Lower numbers appear first
            </FieldDescription>
          </Field>
        </div>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            placeholder="Category description (optional)"
            aria-invalid={errors.description ? true : undefined}
            {...register("description")}
            disabled={isLoading}
          />
          {errors.description && (
            <FieldError>{errors.description.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={errors.image ? true : undefined}>
          <FieldLabel htmlFor="image">Category Image</FieldLabel>
          <div className="space-y-1.5">
            <input
              ref={fileInputRef}
              id="image-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                // Validate file size (max 1MB)
                if (file.size > 1 * 1024 * 1024) {
                  toast.error("File size must be less than 1MB")
                  return
                }

                // Store the file for later upload
                setSelectedFile(file)

                // Show preview from local file
                const reader = new FileReader()
                reader.onloadend = () => {
                  setImagePreview(reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
              disabled={isLoading || uploading}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer.files?.[0]
                if (file && file.type.startsWith("image/")) {
                  if (file.size > 1 * 1024 * 1024) {
                    toast.error("File size must be less than 1MB")
                    return
                  }
                  setSelectedFile(file)
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string)
                  }
                  reader.readAsDataURL(file)
                }
              }}
              className={cn(
                "relative border border-dashed rounded-lg p-4 cursor-pointer transition-all duration-200",
                "hover:border-primary/40 hover:bg-muted/50",
                imagePreview ? "border-primary/20 bg-primary/5" : "border-muted-foreground/25 bg-muted/20",
                (isLoading || uploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {imagePreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-background shadow-sm flex-shrink-0">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 rounded-full shadow-md"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImagePreview(category?.image || null)
                        setSelectedFile(null)
                        setValue("image", category?.image || "")
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                      disabled={isLoading || uploading}
                    >
                      <IconX className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile?.name || "Category Image"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Current image"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-primary">
                      <IconUpload className="h-3 w-3" />
                      <span>Click or drag to change</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconUpload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, WebP or GIF (max. 1MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
            {errors.image && <FieldError>{errors.image.message}</FieldError>}
            <FieldDescription className="text-xs">
              Image will be uploaded when you save the category. (Max 1MB)
            </FieldDescription>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="parent_id">Parent Category</FieldLabel>
            <Select
              value={parentId || "none"}
              onValueChange={(value) => setValue("parent_id", value === "none" ? null : value)}
              disabled={isLoading}
            >
              <SelectTrigger id="parent_id">
                <SelectValue placeholder="Select parent (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top-level)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs">
              Create a subcategory
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="is_active">Status</FieldLabel>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue("is_active", checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Active
              </Label>
            </div>
            <FieldDescription className="text-xs">
              Inactive categories are hidden
            </FieldDescription>
          </Field>
        </div>

        {errors.root && <FieldError>{errors.root.message}</FieldError>}
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || uploading}>
          {uploading 
            ? "Uploading image..." 
            : isLoading 
              ? (category ? "Updating..." : "Creating...") 
              : (category ? "Update" : "Create")}
        </Button>
      </div>
    </form>
  )
}

