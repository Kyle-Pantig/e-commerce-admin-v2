"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { addressesApi, usersApi, type UserAddress, type UserAddressCreate, type UserAddressUpdate } from "@/lib/api"
import { MaxWidthLayout } from "@/components/store"
import { Button } from "@/components/ui/button"
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
  IconUser,
  IconLock,
  IconPackage,
  IconChevronRight,
} from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// Schemas
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

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type AddressFormData = z.infer<typeof addressSchema>
type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

type Section = "profile" | "addresses" | "password"

const sidebarNavItems = [
  {
    id: "profile" as const,
    label: "Profile",
    icon: IconUser,
    description: "Manage your profile information",
  },
  {
    id: "addresses" as const,
    label: "Addresses",
    icon: IconMapPin,
    description: "Manage your saved addresses",
  },
  {
    id: "password" as const,
    label: "Change Password",
    icon: IconLock,
    description: "Update your password",
  },
]

export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const currentSection = (searchParams.get("section") as Section) || "profile"

  const setSection = (section: Section) => {
    router.push(`/account?section=${section}`)
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/account")
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <MaxWidthLayout className="py-8">
        <div className="flex gap-8">
          <div className="w-64 shrink-0">
            <Skeleton className="h-32 w-full mb-6" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <MaxWidthLayout className="py-8">
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 pb-6 lg:pb-0 lg:pr-8">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconUser className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  currentSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}

            <Separator className="my-2" />

            {/* My Orders Link */}
            <Link
              href="/account/orders"
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <IconPackage className="h-5 w-5 shrink-0" />
                <span className="font-medium">My Orders</span>
              </div>
              <IconChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </nav>
        </aside>

        {/* Vertical Divider - only on desktop */}
        <div className="hidden lg:block w-px bg-border shrink-0" />

        {/* Mobile Divider */}
        <Separator className="lg:hidden mb-6" />

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:pl-8">
          {currentSection === "profile" && <ProfileSection user={user} refreshUser={refreshUser} />}
          {currentSection === "addresses" && <AddressesSection />}
          {currentSection === "password" && <PasswordSection />}
        </main>
      </div>
    </MaxWidthLayout>
  )
}

// Profile Section Component
function ProfileSection({ user, refreshUser }: { user: { name: string; email: string | undefined }; refreshUser: () => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClient()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
    },
  })

  useEffect(() => {
    form.reset({ name: user.name })
  }, [user.name, form])

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.name }
      })
      if (error) throw error

      // Also update in backend if the endpoint exists
      try {
        await usersApi.updateProfile({ full_name: data.name })
      } catch {
        // Backend update is optional
      }
    },
    onSuccess: async () => {
      await refreshUser()
      setIsEditing(false)
      toast.success("Profile updated successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      })
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <IconEdit className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div>
        {isEditing ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <Field data-invalid={form.formState.errors.name ? true : undefined}>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter your full name"
              />
              {form.formState.errors.name && (
                <FieldError>{form.formState.errors.name.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email address cannot be changed
              </p>
            </Field>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  form.reset({ name: user.name })
                }}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div>
              <Label className="text-muted-foreground text-sm">Full Name</Label>
              <p className="font-medium mt-1">{user.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Email Address</Label>
              <p className="font-medium mt-1">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Password Section Component
function PasswordSection() {
  const supabase = createClient()

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("User not found")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      })
      if (signInError) throw new Error("Current password is incorrect")

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })
      if (error) throw error
    },
    onSuccess: () => {
      form.reset()
      toast.success("Password updated successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to update password", {
        description: error.message,
      })
    },
  })

  const onSubmit = (data: PasswordFormData) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Change Password</h1>
        <p className="text-muted-foreground">Update your password to keep your account secure</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <Field data-invalid={form.formState.errors.currentPassword ? true : undefined}>
          <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
          <Input
            id="currentPassword"
            type="password"
            {...form.register("currentPassword")}
            placeholder="Enter current password"
          />
          {form.formState.errors.currentPassword && (
            <FieldError>{form.formState.errors.currentPassword.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={form.formState.errors.newPassword ? true : undefined}>
          <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
          <Input
            id="newPassword"
            type="password"
            {...form.register("newPassword")}
            placeholder="Enter new password"
          />
          {form.formState.errors.newPassword && (
            <FieldError>{form.formState.errors.newPassword.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={form.formState.errors.confirmPassword ? true : undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            placeholder="Confirm new password"
          />
          {form.formState.errors.confirmPassword && (
            <FieldError>{form.formState.errors.confirmPassword.message}</FieldError>
          )}
        </Field>

        <Button type="submit" disabled={updateMutation.isPending} className="mt-2">
          {updateMutation.isPending && (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Update Password
        </Button>
      </form>
    </div>
  )
}

// Addresses Section Component
function AddressesSection() {
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
  
  const labelSuggestions = ["Home", "Work", "Office", "Other"]

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
  }, [isDialogOpen, editingAddress, form])

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Addresses</h1>
          <p className="text-muted-foreground">Manage your saved addresses for faster checkout</p>
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
        <div className="divide-y border-b">
          {addresses.map((address) => (
            <div key={address.id} className="py-4 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <IconMapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="font-medium truncate">
                      {address.label || `${address.type} Address`}
                    </span>
                    {address.isDefault && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ({address.type})
                    </span>
                  </div>

                  <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 text-sm mt-2">
                    {address.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p>{address.phone}</p>
                      </div>
                    )}

                    {(address.type === "SHIPPING" || address.type === "BOTH") && (
                      <div>
                        <p className="text-xs text-muted-foreground">Shipping</p>
                        <p>{address.shippingAddress}</p>
                        <p className="text-muted-foreground">
                          {address.shippingCity}
                          {address.shippingState && `, ${address.shippingState}`}
                          {address.shippingZip && ` ${address.shippingZip}`}
                        </p>
                        <p className="text-muted-foreground">{address.shippingCountry}</p>
                      </div>
                    )}

                    {(address.type === "BILLING" || address.type === "BOTH") && address.billingAddress && (
                      <div>
                        <p className="text-xs text-muted-foreground">Billing</p>
                        <p>{address.billingAddress}</p>
                        <p className="text-muted-foreground">
                          {address.billingCity}
                          {address.billingState && `, ${address.billingState}`}
                          {address.billingZip && ` ${address.billingZip}`}
                        </p>
                        <p className="text-muted-foreground">{address.billingCountry}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => handleOpenDialog(address)}
                >
                  <IconEdit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconMapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
          <p className="text-muted-foreground mb-4">
            Add your first address to make checkout faster
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        </div>
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
            <AlertDialogCancel disabled={deleteMutation.isPending}>
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
  )
}
