import { StoreNavbar } from "@/components/store/navbar"
import { StoreFooter } from "@/components/store/footer"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <StoreNavbar />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  )
}
