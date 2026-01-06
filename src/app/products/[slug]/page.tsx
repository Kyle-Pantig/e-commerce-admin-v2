import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { IconEdit } from "@tabler/icons-react"
import Link from "next/link"
import { ProductViewWrapper } from "./product-view-wrapper"

interface ProductPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const user = await getAuthenticatedUser()
  const { slug } = await params

  const editButton = (
    <Button variant="outline" size="sm" asChild className="gap-2">
      <Link href={`/products/${slug}/edit`}>
        <IconEdit className="h-4 w-4" />
        Edit Product
      </Link>
    </Button>
  )

  return (
    <AppLayout
      user={user}
      title="Product Details"
      description="View complete product information"
      actions={editButton}
    >
      <ProductViewWrapper slug={slug} currentUserRole={user.role} />
    </AppLayout>
  )
}

