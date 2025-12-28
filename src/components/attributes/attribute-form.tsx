"use client"

import { useMemo, useState, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlus, IconX, IconGripVertical, IconFolder, IconFolderOpen, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { attributeSchema, type AttributeFormData, type AttributeTypeEnum } from "@/lib/validations"
import { Spinner } from "@/components/ui/spinner"

interface Attribute {
  id: string
  name: string
  type: "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN"
  description: string | null
  is_required: boolean
  is_filterable: boolean
  display_order: number
  is_active: boolean
  validation_rules: Record<string, any> | null
  options: string[] | null
  min_length: number | null
  max_length: number | null
  placeholder: string | null
  default_value: string | null
  min_value: number | null
  max_value: number | null
  step: number | null
  unit: string | null
  true_label: string | null
  false_label: string | null
  category_ids: string[] | null
  created_at: string
  updated_at: string
}

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

interface AttributeFormProps {
  categories: Category[]
  attribute?: Attribute
  onSubmit: (data: AttributeFormData) => void
  onCancel: () => void
  isLoading?: boolean
  isCategoriesLoading?: boolean
}

export function AttributeForm({
  categories,
  attribute,
  onSubmit,
  onCancel,
  isLoading = false,
  isCategoriesLoading = false,
}: AttributeFormProps) {
  const [newOption, setNewOption] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<AttributeFormData>({
    resolver: zodResolver(attributeSchema),
    mode: "onSubmit",
    defaultValues: attribute
      ? {
          name: attribute.name,
          type: attribute.type,
          description: attribute.description || "",
          is_required: attribute.is_required,
          is_filterable: attribute.is_filterable,
          display_order: attribute.display_order,
          is_active: attribute.is_active,
          min_length: attribute.min_length,
          max_length: attribute.max_length,
          placeholder: attribute.placeholder,
          default_value: attribute.default_value,
          min_value: attribute.min_value,
          max_value: attribute.max_value,
          step: attribute.step,
          unit: attribute.unit,
          true_label: attribute.true_label || "Yes",
          false_label: attribute.false_label || "No",
          options: attribute.options || [],
          category_ids: attribute.category_ids || [],
        }
      : {
          name: "",
          type: "TEXT",
          description: "",
          is_required: false,
          is_filterable: false,
          display_order: 0,
          is_active: true,
          min_length: null,
          max_length: null,
          placeholder: null,
          default_value: null,
          min_value: null,
          max_value: null,
          step: 1,
          unit: null,
          true_label: "Yes",
          false_label: "No",
          options: [],
          category_ids: [],
        },
  })

  const selectedType = watch("type")
  const isRequired = watch("is_required")
  const isFilterable = watch("is_filterable")
  const isActive = watch("is_active")
  const options = watch("options") || []
  const selectedCategoryIds = watch("category_ids") || []

  // Flatten categories for selection with hierarchy info
  const flatCategories = useMemo(() => {
    const result: { 
      id: string
      name: string
      level: number
      hasChildren: boolean
      isLast: boolean
      parentName?: string
    }[] = []
    
    const processCategory = (cat: Category, level: number = 0, parentName?: string, isLast: boolean = false) => {
      const hasChildren = !!(cat.children && cat.children.length > 0)
      result.push({ 
        id: cat.id, 
        name: cat.name, 
        level, 
        hasChildren,
        isLast,
        parentName
      })
      if (hasChildren && cat.children) {
        cat.children.forEach((child, idx) => 
          processCategory(child, level + 1, cat.name, idx === cat.children!.length - 1)
        )
      }
    }
    
    categories.forEach((cat, idx) => processCategory(cat, 0, undefined, idx === categories.length - 1))
    return result
  }, [categories])

  // Add option(s) to the list - handles comma-separated values
  const addOption = useCallback(() => {
    const currentOptions = getValues("options") || []
    const inputText = newOption.trim()
    
    if (!inputText) return
    
    // Check if input contains comma - split into multiple options
    if (inputText.includes(",")) {
      const newOptions = inputText
        .split(",")
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0 && !currentOptions.includes(opt))
      
      if (newOptions.length > 0) {
        setValue("options", [...currentOptions, ...newOptions], { shouldValidate: false })
      }
    } else {
      // Single option
      if (!currentOptions.includes(inputText)) {
        setValue("options", [...currentOptions, inputText], { shouldValidate: false })
      }
    }
    
    setNewOption("")
  }, [newOption, setValue, getValues])

  // Remove option from the list - use getValues to avoid stale closure
  const removeOption = useCallback((index: number) => {
    const currentOptions = getValues("options") || []
    setValue("options", currentOptions.filter((_, i) => i !== index), { shouldValidate: false })
  }, [setValue, getValues])

  // Toggle category selection - use getValues to avoid stale closure
  const toggleCategory = useCallback((categoryId: string) => {
    const currentIds = getValues("category_ids") || []
    if (currentIds.includes(categoryId)) {
      setValue("category_ids", currentIds.filter(id => id !== categoryId), { shouldValidate: false })
    } else {
      setValue("category_ids", [...currentIds, categoryId], { shouldValidate: false })
    }
  }, [setValue, getValues])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ScrollArea className="h-[60vh] pr-4">
        <FieldGroup className="space-y-4">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Basic Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Attribute Name *</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g., Material, Weight, Battery Life, Waterproof"
                  aria-invalid={errors.name ? true : undefined}
                  {...register("name")}
                  disabled={isLoading}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <FieldDescription className="text-xs">
                  ⚠️ For Color/Size with separate stock, use Variants instead
                </FieldDescription>
              </Field>

              <Field data-invalid={errors.type ? true : undefined}>
                <FieldLabel htmlFor="type">Attribute Type *</FieldLabel>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setValue("type", value as AttributeTypeEnum)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="NUMBER">Number</SelectItem>
                    <SelectItem value="SELECT">Select (Dropdown)</SelectItem>
                    <SelectItem value="BOOLEAN">Boolean (Yes/No)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <FieldError>{errors.type.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={errors.description ? true : undefined}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                id="description"
                placeholder="e.g., Product weight for shipping calculations"
                aria-invalid={errors.description ? true : undefined}
                {...register("description")}
                disabled={isLoading}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                {errors.display_order && <FieldError>{errors.display_order.message}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Options</FieldLabel>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_required"
                      checked={isRequired}
                      onCheckedChange={(checked) => setValue("is_required", checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="is_required" className="font-normal cursor-pointer text-sm">
                      Required
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_filterable"
                      checked={isFilterable}
                      onCheckedChange={(checked) => setValue("is_filterable", checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="is_filterable" className="font-normal cursor-pointer text-sm">
                      Filterable
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={isActive}
                      onCheckedChange={(checked) => setValue("is_active", checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="is_active" className="font-normal cursor-pointer text-sm">
                      Active
                    </Label>
                  </div>
                </div>
              </Field>
            </div>
          </div>

          {/* Type-specific Configuration */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {selectedType} Configuration
            </h4>

            {/* TEXT Type Fields */}
            {selectedType === "TEXT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="placeholder">Placeholder</FieldLabel>
                  <Input
                    id="placeholder"
                    placeholder="e.g., Enter brand name..."
                    {...register("placeholder")}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Shown in empty input field</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="default_value">Default Value</FieldLabel>
                  <Input
                    id="default_value"
                    placeholder="e.g., Machine wash cold"
                    {...register("default_value")}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Pre-filled value for new products</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="min_length">Min Length</FieldLabel>
                  <Input
                    id="min_length"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register("min_length", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="max_length">Max Length</FieldLabel>
                  <Input
                    id="max_length"
                    type="number"
                    min="1"
                    placeholder="255"
                    {...register("max_length", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </Field>
              </div>
            )}

            {/* NUMBER Type Fields */}
            {selectedType === "NUMBER" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="min_value">Min Value</FieldLabel>
                  <Input
                    id="min_value"
                    type="number"
                    step="any"
                    placeholder="e.g., 0.01"
                    {...register("min_value", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Minimum allowed value</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="max_value">Max Value</FieldLabel>
                  <Input
                    id="max_value"
                    type="number"
                    step="any"
                    placeholder="e.g., 1000"
                    {...register("max_value", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Maximum allowed value</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="step">Step</FieldLabel>
                  <Input
                    id="step"
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="e.g., 0.01 or 0.5"
                    {...register("step", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Increment value (0.01 for decimals)</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="unit">Unit</FieldLabel>
                  <Input
                    id="unit"
                    placeholder="e.g., kg, hours, inches"
                    {...register("unit")}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Displayed after the value</FieldDescription>
                </Field>
              </div>
            )}

            {/* SELECT Type Fields */}
            {selectedType === "SELECT" && (
              <div className="space-y-3">
                <Field>
                  <FieldLabel>Options</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Cotton, Wool, Polyester, Silk, Denim"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addOption()
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addOption}
                      disabled={isLoading || !newOption.trim()}
                    >
                      <IconPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldDescription className="text-xs">
                    Add comma-separated options (e.g., "1 Year, 2 Years, 3 Years")
                  </FieldDescription>
                </Field>

                {options.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
                    {options.map((option, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-3 py-1.5 flex items-center gap-2"
                      >
                        <IconGripVertical className="h-3 w-3 text-muted-foreground" />
                        <span>{option}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="ml-1 hover:text-destructive transition-colors"
                          disabled={isLoading}
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {options.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed">
                    No options added yet. Add at least one option for this attribute.
                  </div>
                )}
              </div>
            )}

            {/* BOOLEAN Type Fields */}
            {selectedType === "BOOLEAN" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="true_label">True Label</FieldLabel>
                  <Input
                    id="true_label"
                    placeholder="e.g., Waterproof, Eco-Friendly, Yes"
                    {...register("true_label")}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Displayed when checked (e.g., "Waterproof")</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="false_label">False Label</FieldLabel>
                  <Input
                    id="false_label"
                    placeholder="e.g., Not Waterproof, Standard, No"
                    {...register("false_label")}
                    disabled={isLoading}
                  />
                  <FieldDescription className="text-xs">Displayed when unchecked (e.g., "Not Waterproof")</FieldDescription>
                </Field>
              </div>
            )}
          </div>

          {/* Category Assignment */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Category Assignment
            </h4>
            <FieldDescription className="text-xs -mt-1">
              Assign to specific categories (e.g., "Battery Life" for Electronics only). Leave empty for all products.
            </FieldDescription>

            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed">
                <Spinner className="size-5 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
              </div>
            ) : flatCategories.length > 0 ? (
              <div className="space-y-1 p-3 bg-muted/30 rounded-lg border max-h-64 overflow-y-auto">
                {flatCategories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id)
                  const isParent = cat.hasChildren
                  const checkboxId = `category-${cat.id}`
                  
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2 rounded-md transition-all",
                        isSelected
                          ? "bg-primary/15 border border-primary/30"
                          : "hover:bg-muted/80 border border-transparent",
                        isParent && "font-medium"
                      )}
                      style={{ marginLeft: `${cat.level * 20}px` }}
                    >
                      {/* Tree connector line */}
                      {cat.level > 0 && (
                        <div className="flex items-center text-muted-foreground/50">
                          <IconChevronRight className="h-3 w-3" />
                        </div>
                      )}
                      
                      {/* Folder icon */}
                      {isParent ? (
                        <IconFolderOpen className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isSelected ? "text-primary" : "text-amber-500"
                        )} />
                      ) : (
                        <IconFolder className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                      )}
                      
                      {/* Checkbox */}
                      <Checkbox
                        id={checkboxId}
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(cat.id)}
                        disabled={isLoading}
                        className="data-[state=checked]:bg-primary"
                      />
                      
                      {/* Category name - clickable label */}
                      <label 
                        htmlFor={checkboxId}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <span className={cn(
                          "text-sm truncate block",
                          isSelected && "text-primary"
                        )}>
                          {cat.name}
                        </span>
                        {cat.parentName && (
                          <span className="text-[10px] text-muted-foreground">
                            in {cat.parentName}
                          </span>
                        )}
                      </label>
                      
                      {/* Parent indicator badge */}
                      {isParent && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          parent
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                <IconFolder className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                No categories available. Create categories first.
              </div>
            )}

            {selectedCategoryIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {selectedCategoryIds.length}
                </Badge>
                <span>category(ies) selected</span>
              </div>
            )}
          </div>

          {errors.root && <FieldError>{errors.root.message}</FieldError>}
        </FieldGroup>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? (attribute ? "Updating..." : "Creating...")
            : (attribute ? "Update Attribute" : "Create Attribute")}
        </Button>
      </div>
    </form>
  )
}

