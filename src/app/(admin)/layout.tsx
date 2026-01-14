import { getAuthenticatedUser } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect to login if not authenticated
  // and redirect to home if user is CUSTOMER
  await getAuthenticatedUser()
  
  return <>{children}</>
}
