import type { Metadata } from "next";
import React, { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarShell from "@/components/layout/SidebarShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.khaasdaan.pk"),
  title: {
    default:
      "Khaasdaan | Best Karahi, Charcoal BBQ & Online Food Delivery in Faisalabad",
    template: "%s | Khaasdaan Faisalabad",
  },
  description:
    "Order authentic Chicken & Mutton Karahi, live Charcoal BBQ, Malai Boti & Family Dastarkhwan deals online from Khaasdaan Faisalabad. Fast delivery in D Ground, Kohinoor, People's Colony, Satiana Road & Madina Town.",
  keywords: [
    "Khaasdaan Faisalabad",
    "Best Karahi in Faisalabad",
    "BBQ restaurant D Ground Faisalabad",
    "Online food delivery Faisalabad",
    "Mutton Shinwari Karahi Faisalabad",
    "Desi restaurant Faisalabad",
  ],
  alternates: {
    canonical: "https://www.khaasdaan.pk",
  },
  openGraph: {
    title: "Khaasdaan | Authentic Karahi & BBQ in Faisalabad",
    description:
      "Freshly wok-tossed Karahi, smoky BBQ & family deals delivered hot across Faisalabad. Order directly at www.khaasdaan.pk.",
    url: "https://www.khaasdaan.pk",
    siteName: "Khaasdaan",
    locale: "en_PK",
    type: "website",
  },
};

const RESTAURANT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Khaasdaan",
  url: "https://www.khaasdaan.pk",
  telephone: "+92-300-1234567",
  servesCuisine: ["Pakistani", "Desi", "Karahi", "BBQ", "Grill"],
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "D Ground Commercial Area",
    addressLocality: "Faisalabad",
    addressRegion: "Punjab",
    addressCountry: "PK",
  },
  areaServed: [
    "D Ground",
    "Kohinoor City",
    "People's Colony",
    "Satiana Road",
    "Madina Town",
    "Faisalabad",
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "12:00",
      closes: "01:00",
    },
  ],
  hasMenu: "https://www.khaasdaan.pk/menu",
  acceptsReservations: "True",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(RESTAURANT_SCHEMA) }}
        />
        <Suspense fallback={<div className="min-h-full flex-1">{children}</div>}>
          <SidebarShell>{children}</SidebarShell>
        </Suspense>
      </body>
    </html>
  );
}