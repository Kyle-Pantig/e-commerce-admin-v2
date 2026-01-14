import { MaxWidthLayout, HeroBanner, ShopByCategory } from "@/components/store"

export default function HomePage() {
  return (
    <>
      {/* Hero Banners - Fetched from Site Settings */}
      <HeroBanner />

      <MaxWidthLayout className="py-12">
        {/* Shop by Category - Fetched from API */}
        <ShopByCategory />

        {/* Featured Products - Placeholder */}
        <section className="py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Featured Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group">
                <div className="aspect-square rounded-lg bg-muted mb-3" />
                <h3 className="font-medium">Product Name</h3>
                <p className="text-sm text-muted-foreground">$99.00</p>
              </div>
            ))}
          </div>
        </section>
      </MaxWidthLayout>
    </>
  )
}
