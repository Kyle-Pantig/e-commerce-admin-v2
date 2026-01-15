import { StoreNavbar } from "@/components/store/navbar"
import { StoreFooter } from "@/components/store/footer"
import { StoreProviders } from "@/components/store/store-providers"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StoreProviders>
      <div className="flex min-h-screen flex-col">
        <StoreNavbar />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </StoreProviders>
  )
}
