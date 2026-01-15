"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { addressesApi, type UserAddress, type UserAddressCreate, type UserAddressUpdate } from "@/lib/api"
import { MaxWidthLayout } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconMapPin,
  IconLoader2,
} from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const addressSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING", "BOTH"]),
  is_default: z.boolean(),
  phone: z.string().optional().nullable(),
  shipping_address: z.string().min(5, "Address must be at least 5 characters"),
  shipping_city: z.string().min(2, "City is required"),
  shipping_state: z.string().optional().nullable(),
  shipping_zip: z.string().optional().nullable(),
  shipping_country: z.string(),
  billing_address: z.string().optional().nullable(),
  billing_city: z.string().optional().nullable(),
  billing_state: z.string().optional().nullable(),
  billing_zip: z.string().optional().nullable(),
  billing_country: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
})

type AddressFormData = z.infer<typeof addressSchema>

export default function AccountPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<UserAddress | null>(null)
  const queryClient = useQueryClient()

  const { data: addresses, isLoading, error } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => addressesApi.list(),
  })

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: "BOTH",
      is_default: false,
      phone: null,
      shipping_address: "",
      shipping_city: "",
      shipping_state: null,
      shipping_zip: null,
      shipping_country: "Philippines",
      billing_address: null,
      billing_city: null,
      billing_state: null,
      billing_zip: null,
      billing_country: null,
      label: null,
    },
  })

  const addressType = form.watch("type")
  const showShippingAddress = addressType === "BOTH" || addressType === "SHIPPING"
  const showBillingAddress = addressType === "BOTH" || addressType === "BILLING"
  
  // Label suggestions
  const labelSuggestions = ["Home", "Work", "Office", "Other"]

  // Populate form when editing address changes and dialog is open
  useEffect(() => {
    if (isDialogOpen && editingAddress) {
      form.reset({
        type: editingAddress.type,
        is_default: editingAddress.isDefault,
        phone: editingAddress.phone || null,
        shipping_address: editingAddress.shippingAddress || "",
        shipping_city: editingAddress.shippingCity || "",
        shipping_state: editingAddress.shippingState || null,
        shipping_zip: editingAddress.shippingZip || null,
        shipping_country: editingAddress.shippingCountry || "Philippines",
        billing_address: editingAddress.billingAddress || null,
        billing_city: editingAddress.billingCity || null,
        billing_state: editingAddress.billingState || null,
        billing_zip: editingAddress.billingZip || null,
        billing_country: editingAddress.billingCountry || null,
        label: editingAddress.label || null,
      })
    }
  }, [isDialogOpen, editingAddress])

  const createMutation = useMutation({
    mutationFn: (data: UserAddressCreate) => addressesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      setIsDialogOpen(false)
      form.reset()
      setEditingAddress(null)
      toast.success("Address added successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to add address", {
        description: error.message,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserAddressUpdate }) =>
      addressesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      setIsDialogOpen(false)
      form.reset()
      setEditingAddress(null)
      toast.success("Address updated successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to update address", {
        description: error.message,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
      setDeletingAddress(null)
      toast.success("Address deleted successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to delete address", {
        description: error.message,
      })
    },
  })

  const handleOpenDialog = (address?: UserAddress) => {
    if (address) {
      setEditingAddress(address)
    } else {
      setEditingAddress(null)
      form.reset({
        type: "BOTH",
        is_default: false,
        phone: null,
        shipping_address: "",
        shipping_city: "",
        shipping_state: null,
        shipping_zip: null,
        shipping_country: "Philippines",
        billing_address: null,
        billing_city: null,
        billing_state: null,
        billing_zip: null,
        billing_country: null,
        label: null,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingAddress(null)
    form.reset()
  }

  const onSubmit = (data: AddressFormData) => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  if (isLoading) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  return (
    <MaxWidthLayout className="py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-muted-foreground mt-1">
              Manage your saved addresses
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">
              Error loading addresses: {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        {addresses && Array.isArray(addresses) && addresses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => (
              <Card key={address.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <IconMapPin className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">
                          {address.label || `${address.type} Address`}
                        </span>
                        {address.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        {address.type}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2 flex-shrink-0"
                      onClick={() => handleOpenDialog(address)}
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {address.phone && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        Phone Number
                      </p>
                      <p className="text-sm">{address.phone}</p>
                    </div>
                  )}

                  {/* Shipping Address */}
                  {(address.type === "SHIPPING" || address.type === "BOTH") && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Shipping Address
                      </p>
                      <div className="text-sm space-y-0.5">
                        <p className="font-medium">{address.shippingAddress}</p>
                        <p className="text-muted-foreground">
                          {address.shippingCity}
                          {address.shippingState && `, ${address.shippingState}`}
                          {address.shippingZip && ` ${address.shippingZip}`}
                        </p>
                        <p className="text-muted-foreground">
                          {address.shippingCountry}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Billing Address */}
                  {(address.type === "BILLING" || address.type === "BOTH") && (
                    <>
                      {(address.type === "BOTH" || address.billingAddress) && (
                        <Separator />
                      )}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Billing Address
                        </p>
                        <div className="text-sm space-y-0.5">
                          {address.type === "BILLING" ? (
                            <>
                              <p className="font-medium">{address.billingAddress || address.shippingAddress}</p>
                              <p className="text-muted-foreground">
                                {address.billingCity || address.shippingCity}
                                {address.billingState && `, ${address.billingState}`}
                                {!address.billingState && address.shippingState && `, ${address.shippingState}`}
                                {address.billingZip && ` ${address.billingZip}`}
                                {!address.billingZip && address.shippingZip && ` ${address.shippingZip}`}
                              </p>
                              <p className="text-muted-foreground">
                                {address.billingCountry || address.shippingCountry}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">
                                {address.billingAddress || address.shippingAddress}
                              </p>
                              <p className="text-muted-foreground">
                                {address.billingCity || address.shippingCity}
                                {address.billingState && `, ${address.billingState}`}
                                {!address.billingState && address.shippingState && `, ${address.shippingState}`}
                                {address.billingZip && ` ${address.billingZip}`}
                                {!address.billingZip && address.shippingZip && ` ${address.shippingZip}`}
                              </p>
                              <p className="text-muted-foreground">
                                {address.billingCountry || address.shippingCountry}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconMapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first address to make checkout faster
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl! h-[90vh]! flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 bg-background px-6 pt-6 pb-4 border-b">
              <DialogTitle>
                {editingAddress ? "Edit Address" : "Add New Address"}
              </DialogTitle>
              <DialogDescription>
                {editingAddress
                  ? "Update your address information"
                  : "Save a new address for faster checkout"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <FieldGroup>
                <Field data-invalid={form.formState.errors.label ? true : undefined}>
                  <FieldLabel htmlFor="label">Label (Optional)</FieldLabel>
                  <div className="space-y-2">
                    <Input
                      id="label"
                      {...form.register("label")}
                      placeholder="e.g., Home, Work, Office"
                    />
                    <div className="flex flex-wrap gap-2">
                      {labelSuggestions.map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant={
                            form.watch("label") === suggestion
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => form.setValue("label", suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {form.formState.errors.label && (
                    <FieldError>{form.formState.errors.label.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={form.formState.errors.type ? true : undefined}>
                  <FieldLabel htmlFor="type">Address Type</FieldLabel>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) =>
                      form.setValue("type", value as "SHIPPING" | "BILLING" | "BOTH")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOTH">Both Shipping & Billing</SelectItem>
                      <SelectItem value="SHIPPING">Shipping Only</SelectItem>
                      <SelectItem value="BILLING">Billing Only</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <FieldError>{form.formState.errors.type.message}</FieldError>
                  )}
                </Field>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_default"
                    checked={form.watch("is_default")}
                    onCheckedChange={(checked) =>
                      form.setValue("is_default", checked as boolean)
                    }
                  />
                  <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
                    Set as default address
                  </Label>
                </div>

                <Field data-invalid={form.formState.errors.phone ? true : undefined}>
                  <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register("phone")}
                    placeholder="+63 912 345 6789"
                  />
                  {form.formState.errors.phone && (
                    <FieldError>{form.formState.errors.phone.message}</FieldError>
                  )}
                </Field>
              </FieldGroup>

              {showShippingAddress && (
                <>
                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                    <FieldGroup>
                      <Field
                        data-invalid={form.formState.errors.shipping_address ? true : undefined}
                      >
                        <FieldLabel htmlFor="shipping_address">Address *</FieldLabel>
                        <Input
                          id="shipping_address"
                          {...form.register("shipping_address")}
                          placeholder="Street address, building, unit"
                        />
                        {form.formState.errors.shipping_address && (
                          <FieldError>
                            {form.formState.errors.shipping_address.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={form.formState.errors.shipping_city ? true : undefined}
                      >
                        <FieldLabel htmlFor="shipping_city">City *</FieldLabel>
                        <Input
                          id="shipping_city"
                          {...form.register("shipping_city")}
                          placeholder="City"
                        />
                        {form.formState.errors.shipping_city && (
                          <FieldError>
                            {form.formState.errors.shipping_city.message}
                          </FieldError>
                        )}
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          data-invalid={form.formState.errors.shipping_state ? true : undefined}
                        >
                          <FieldLabel htmlFor="shipping_state">State/Province</FieldLabel>
                          <Input
                            id="shipping_state"
                            {...form.register("shipping_state")}
                            placeholder="State/Province"
                          />
                          {form.formState.errors.shipping_state && (
                            <FieldError>
                              {form.formState.errors.shipping_state.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field
                          data-invalid={form.formState.errors.shipping_zip ? true : undefined}
                        >
                          <FieldLabel htmlFor="shipping_zip">ZIP Code</FieldLabel>
                          <Input
                            id="shipping_zip"
                            {...form.register("shipping_zip")}
                            placeholder="ZIP Code"
                          />
                          {form.formState.errors.shipping_zip && (
                            <FieldError>
                              {form.formState.errors.shipping_zip.message}
                            </FieldError>
                          )}
                        </Field>
                      </div>

                      <Field
                        data-invalid={form.formState.errors.shipping_country ? true : undefined}
                      >
                        <FieldLabel htmlFor="shipping_country">Country *</FieldLabel>
                        <Input
                          id="shipping_country"
                          {...form.register("shipping_country")}
                          placeholder="Country"
                        />
                        {form.formState.errors.shipping_country && (
                          <FieldError>
                            {form.formState.errors.shipping_country.message}
                          </FieldError>
                        )}
                      </Field>
                    </FieldGroup>
                  </div>
                </>
              )}

              {showBillingAddress && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      {addressType === "BILLING" ? "Billing Address" : "Billing Address (Optional)"}
                    </h3>
                    <FieldGroup>
                      <Field
                        data-invalid={
                          form.formState.errors.billing_address ? true : undefined
                        }
                      >
                        <FieldLabel htmlFor="billing_address">
                          Address{addressType === "BILLING" ? " *" : ""}
                        </FieldLabel>
                        <Input
                          id="billing_address"
                          {...form.register("billing_address")}
                          placeholder="Street address, building, unit"
                        />
                        {form.formState.errors.billing_address && (
                          <FieldError>
                            {form.formState.errors.billing_address.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={form.formState.errors.billing_city ? true : undefined}
                      >
                        <FieldLabel htmlFor="billing_city">
                          City{addressType === "BILLING" ? " *" : ""}
                        </FieldLabel>
                        <Input
                          id="billing_city"
                          {...form.register("billing_city")}
                          placeholder="City"
                        />
                        {form.formState.errors.billing_city && (
                          <FieldError>
                            {form.formState.errors.billing_city.message}
                          </FieldError>
                        )}
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          data-invalid={
                            form.formState.errors.billing_state ? true : undefined
                          }
                        >
                          <FieldLabel htmlFor="billing_state">State/Province</FieldLabel>
                          <Input
                            id="billing_state"
                            {...form.register("billing_state")}
                            placeholder="State/Province"
                          />
                          {form.formState.errors.billing_state && (
                            <FieldError>
                              {form.formState.errors.billing_state.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field
                          data-invalid={form.formState.errors.billing_zip ? true : undefined}
                        >
                          <FieldLabel htmlFor="billing_zip">ZIP Code</FieldLabel>
                          <Input
                            id="billing_zip"
                            {...form.register("billing_zip")}
                            placeholder="ZIP Code"
                          />
                          {form.formState.errors.billing_zip && (
                            <FieldError>
                              {form.formState.errors.billing_zip.message}
                            </FieldError>
                          )}
                        </Field>
                      </div>

                      <Field
                        data-invalid={
                          form.formState.errors.billing_country ? true : undefined
                        }
                      >
                        <FieldLabel htmlFor="billing_country">
                          Country{addressType === "BILLING" ? " *" : ""}
                        </FieldLabel>
                        <Input
                          id="billing_country"
                          {...form.register("billing_country")}
                          placeholder="Country"
                        />
                        {form.formState.errors.billing_country && (
                          <FieldError>
                            {form.formState.errors.billing_country.message}
                          </FieldError>
                        )}
                      </Field>
                    </FieldGroup>
                  </div>
                </>
              )}

              </div>

              <div className="flex-shrink-0 bg-background px-6 py-4 border-t flex justify-between gap-3">
                {editingAddress ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDeletingAddress(editingAddress)
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingAddress ? "Update Address" : "Add Address"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deletingAddress}
          onOpenChange={(open) => {
            // Prevent closing while delete is in progress
            if (!open && !deleteMutation.isPending) {
              setDeletingAddress(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Address?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this address? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={deleteMutation.isPending}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deletingAddress && deleteMutation.mutate(deletingAddress.id)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MaxWidthLayout>
  )
}
