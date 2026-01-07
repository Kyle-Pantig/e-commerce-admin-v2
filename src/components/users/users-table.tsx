"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteConfirmDialog } from "@/components/shared"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { IconDots, IconCheck, IconTrash, IconArrowUp, IconArrowDown, IconArrowsSort } from "@tabler/icons-react"

// Import shared API services and types
import { usersApi } from "@/lib/api/services/users"
import type { User, UserRole, StaffPermissions, PermissionModule, PermissionLevel } from "@/lib/api/types"
import { DEFAULT_STAFF_PERMISSIONS, PERMISSION_MODULES, PERMISSION_LABELS } from "@/lib/api/types"
import { Switch } from "@/components/ui/switch"

interface UsersTableProps {
  currentUserRole?: string
  canEdit?: boolean
}

// Role display config
const ROLE_CONFIG: Record<UserRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ADMIN: { label: "Admin", variant: "default" },
  STAFF: { label: "Staff", variant: "secondary" },
  CUSTOMER: { label: "Customer", variant: "outline" },
}

export function UsersTable({ currentUserRole, canEdit = true }: UsersTableProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const hasEditPermission = isAdmin && canEdit
  const router = useRouter()
  const queryClient = useQueryClient()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [updateRoleDialogOpen, setUpdateRoleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>("CUSTOMER")
  const [selectedPermissions, setSelectedPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS)
  const [sorting, setSorting] = useState<SortingState>([])

  // React Query: Fetch users using shared API service
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    retry: 1,
  })

  // React Query: Approve user mutation
  const approveMutation = useMutation({
    mutationFn: ({ userId, role, permissions }: { userId: string; role: UserRole; permissions?: StaffPermissions }) =>
      usersApi.updateApproval(userId, { 
        is_approved: true, 
        role,
        permissions: role === "STAFF" ? permissions : undefined
      }),
    onSuccess: (_, variables) => {
      toast.success(`User approved as ${ROLE_CONFIG[variables.role].label} successfully`)
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setApproveDialogOpen(false)
      setSelectedUserId(null)
      setSelectedPermissions(DEFAULT_STAFF_PERMISSIONS)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve user")
    },
  })

  // React Query: Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role, permissions }: { userId: string; role: UserRole; permissions?: StaffPermissions }) =>
      usersApi.updateApproval(userId, { 
        role,
        permissions: role === "STAFF" ? permissions : undefined
      }),
    onSuccess: (_, variables) => {
      toast.success(`User role updated to ${ROLE_CONFIG[variables.role].label} successfully`)
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setUpdateRoleDialogOpen(false)
      setSelectedUserId(null)
      setSelectedPermissions(DEFAULT_STAFF_PERMISSIONS)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user role")
    },
  })

  // React Query: Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      toast.success("User deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      setSelectedUserId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user")
    },
  })

  const openApproveDialog = (userId: string) => {
    const user = users.find((u: User) => u.id === userId)
    setSelectedUserId(userId)
    setSelectedRole(user?.role || "CUSTOMER")
    setSelectedPermissions(user?.permissions || DEFAULT_STAFF_PERMISSIONS)
    setApproveDialogOpen(true)
  }

  const handleApprove = () => {
    if (!selectedUserId) return
    approveMutation.mutate({ 
      userId: selectedUserId, 
      role: selectedRole,
      permissions: selectedRole === "STAFF" ? selectedPermissions : undefined
    })
  }

  const openUpdateRoleDialog = (userId: string) => {
    const user = users.find((u: User) => u.id === userId)
    setSelectedUserId(userId)
    setSelectedRole(user?.role || "CUSTOMER")
    setSelectedPermissions(user?.permissions || DEFAULT_STAFF_PERMISSIONS)
    setUpdateRoleDialogOpen(true)
  }

  const handleUpdateRole = () => {
    if (!selectedUserId) return
    updateRoleMutation.mutate({ 
      userId: selectedUserId, 
      role: selectedRole,
      permissions: selectedRole === "STAFF" ? selectedPermissions : undefined
    })
  }

  const handlePermissionChange = (module: PermissionModule, level: PermissionLevel) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [module]: level
    }))
  }

  const handleDelete = (userId: string) => {
    const user = users.find((u: User) => u.id === userId)
    setSelectedUser(user || null)
    setSelectedUserId(userId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedUserId) {
      deleteMutation.mutate(selectedUserId)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  // Handle errors
  if (error) {
    if (error.message === "Not authenticated") {
      toast.error("Not authenticated")
      router.push("/login")
      return null
    }
    if (error.message === "Access denied") {
      toast.error("Admin access required")
      router.push("/dashboard")
      return null
    }
  }

  // TanStack Table column definitions
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Email
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.original.email}</div>
      ),
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => row.original.full_name || "—",
    },
    {
      accessorKey: "role",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Role
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const role = row.original.role
        const config = ROLE_CONFIG[role] || ROLE_CONFIG.CUSTOMER
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "is_approved",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Status
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => (
        <Badge variant={row.original.is_approved ? "default" : "destructive"}>
          {row.original.is_approved ? "Approved" : "Pending"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Created
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
    ...(hasEditPermission
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: { original: User } }) => {
              const user = row.original
              const isActionLoading =
                approveMutation.isPending ||
                updateRoleMutation.isPending ||
                deleteMutation.isPending

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isActionLoading}>
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!user.is_approved && (
                      <DropdownMenuItem
                        onClick={() => openApproveDialog(user.id)}
                        disabled={isActionLoading}
                      >
                        <IconCheck className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                    )}
                    {user.is_approved && (
                      <DropdownMenuItem
                        onClick={() => openUpdateRoleDialog(user.id)}
                        disabled={isActionLoading}
                      >
                        <IconCheck className="mr-2 h-4 w-4" />
                        Update Role
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(user.id)}
                      disabled={isActionLoading}
                      className="text-destructive"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]
      : []),
  ]

  // Initialize TanStack Table
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-md border">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-md border">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={hasEditPermission ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Select the role for this user. They will be approved and can log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">User Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value: UserRole) => setSelectedRole(value)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                  <SelectItem value="STAFF">Staff - Controlled permissions</SelectItem>
                  <SelectItem value="CUSTOMER">Customer - E-commerce user</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Permissions Editor */}
            {selectedRole === "STAFF" && (
              <div className="grid gap-3 pt-2">
                <Label className="text-sm font-medium">Staff Permissions</Label>
                <div className="rounded-md border p-3 space-y-3">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module} className="flex items-center justify-between">
                      <span className="text-sm">{PERMISSION_LABELS[module]}</span>
                      <Select
                        value={selectedPermissions[module] || "view"}
                        onValueChange={(value: PermissionLevel) => handlePermissionChange(module, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          {module !== "users" && <SelectItem value="edit">Edit</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Staff can never edit users - only admins can manage user accounts.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false)
                setSelectedUserId(null)
                setSelectedPermissions(DEFAULT_STAFF_PERMISSIONS)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog open={updateRoleDialogOpen} onOpenChange={setUpdateRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role for this approved user. The approval status will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="update-role">User Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value: UserRole) => setSelectedRole(value)}
              >
                <SelectTrigger id="update-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                  <SelectItem value="STAFF">Staff - Controlled permissions</SelectItem>
                  <SelectItem value="CUSTOMER">Customer - E-commerce user</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Permissions Editor */}
            {selectedRole === "STAFF" && (
              <div className="grid gap-3 pt-2">
                <Label className="text-sm font-medium">Staff Permissions</Label>
                <div className="rounded-md border p-3 space-y-3">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module} className="flex items-center justify-between">
                      <span className="text-sm">{PERMISSION_LABELS[module]}</span>
                      <Select
                        value={selectedPermissions[module] || "view"}
                        onValueChange={(value: PermissionLevel) => handlePermissionChange(module, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          {module !== "users" && <SelectItem value="edit">Edit</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Staff can never edit users - only admins can manage user accounts.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateRoleDialogOpen(false)
                setSelectedUserId(null)
                setSelectedPermissions(DEFAULT_STAFF_PERMISSIONS)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setSelectedUser(null)
            setSelectedUserId(null)
          }
        }}
        title="Delete User"
        itemName={selectedUser?.email}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
