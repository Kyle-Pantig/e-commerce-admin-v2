"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ordersApi } from "@/lib/api/services/orders"
import { MaxWidthLayout } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import {
  IconCheck,
  IconPackage,
  IconMail,
  IconMapPin,
  IconCreditCard,
  IconShoppingBag,
  IconHome,
} from "@tabler/icons-react"

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderNumber = searchParams.get("order")

  // Redirect if no order number
  useEffect(() => {
    if (!orderNumber) {
      router.push("/shop")
    }
  }, [orderNumber, router])

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => ordersApi.getByOrderNumber(orderNumber!),
    enabled: !!orderNumber,
    staleTime: Infinity, // Order won't change
  })

  if (!orderNumber) {
    return null
  }

  if (isLoading) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </MaxWidthLayout>
    )
  }

  if (error || !order) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <IconPackage className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Order Not Found</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t find the order you&apos;re looking for.
          </p>
          <Button onClick={() => router.push("/shop")}>
            Continue Shopping
          </Button>
        </div>
      </MaxWidthLayout>
    )
  }

  return (
    <MaxWidthLayout className="py-12">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <IconCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold">Thank You for Your Order!</h1>
          <p className="text-muted-foreground">
            Your order has been placed successfully. We&apos;ll send you an email confirmation shortly.
          </p>
        </div>

        {/* Order Number Badge */}
        <div className="bg-muted/50 rounded-lg p-4 text-center mb-8">
          <p className="text-sm text-muted-foreground mb-1">Order Number</p>
          <p className="text-2xl font-mono font-bold">{order.order_number}</p>
        </div>

        {/* Order Details */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconMail className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Contact Information</h2>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-muted-foreground">{order.customer_email}</p>
              {order.customer_phone && (
                <p className="text-muted-foreground">{order.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconMapPin className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Shipping Address</h2>
            </div>
            <div className="text-sm space-y-1">
              <p>{order.shipping_address}</p>
              <p>
                {order.shipping_city}
                {order.shipping_state && `, ${order.shipping_state}`}
                {order.shipping_zip && ` ${order.shipping_zip}`}
              </p>
              <p>{order.shipping_country}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconCreditCard className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Payment Method</h2>
            </div>
            <p className="text-sm">
              {order.payment_method === "CASH_ON_DELIVERY"
                ? "Cash on Delivery"
                : order.payment_method === "STRIPE"
                ? "Credit/Debit Card (Stripe)"
                : order.payment_method || "Not specified"}
            </p>
          </div>

          {/* Order Items */}
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconPackage className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Order Items</h2>
            </div>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-muted-foreground text-xs">
                        {item.variant_name}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {formatPrice(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : "Free"}
                </span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.tax_amount)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold pt-1">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/account?section=orders")}
          >
            <IconShoppingBag className="mr-2 h-4 w-4" />
            View My Orders
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push("/shop")}
          >
            <IconHome className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Need help? Contact us at{" "}
          <a href="mailto:support@example.com" className="underline hover:text-foreground">
            support@example.com
          </a>
        </p>
      </div>
    </MaxWidthLayout>
  )
}
