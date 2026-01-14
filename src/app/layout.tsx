import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import { NavigationLoader } from "@/components/ui/navigation-loader";
import { Providers } from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Store",
    template: "%s | Store",
  },
  description: "Your one-stop shop for premium products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader 
          color="#f97316"
          height={4}
          showSpinner={false}
          zIndex={9999}
        />
        <Providers>
          <Suspense fallback={null}>
            <NavigationLoader />
          </Suspense>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
