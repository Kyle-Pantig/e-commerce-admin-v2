"use client"

import dynamic from "next/dynamic"
import { LoadingState } from "@/components/ui/loading-state"

const InventoryDashboard = dynamic(
  () => import("./inventory-dashboard").then((mod) => mod.InventoryDashboard),
  {
    ssr: false,
    loading: () => <LoadingState variant="centered" text="Loading inventory..." />,
  }
)

interface InventoryWrapperProps {
  canEdit?: boolean
}

export function InventoryWrapper({ canEdit = true }: InventoryWrapperProps) {
  return <InventoryDashboard canEdit={canEdit} />
}

