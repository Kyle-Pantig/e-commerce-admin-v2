import { MaxWidthLayout, HeroBanner, ShopByCategory, FeaturedProducts, NewArrivals } from "@/components/store"

export default function HomePage() {
  return (
    <>
      {/* Hero Banners - Fetched from Site Settings */}
      <HeroBanner />

      <MaxWidthLayout className="py-12">
        {/* Shop by Category - Fetched from API */}
        <ShopByCategory />

        {/* Featured Products - Fetched from API */}
        <FeaturedProducts />

        {/* New Arrivals - Fetched from API */}
        <NewArrivals />
      </MaxWidthLayout>
    </>
  )
}
