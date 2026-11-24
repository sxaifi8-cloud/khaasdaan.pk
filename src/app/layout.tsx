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
  title: "Khaasdaan POS & Online Ordering | khaasdaan.pk",
  description:
    "Unified restaurant POS, table management, kitchen display, and online ordering system for Khaasdaan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Suspense fallback={<div className="min-h-full flex-1">{children}</div>}>
          <SidebarShell>{children}</SidebarShell>
        </Suspense>
      </body>
    </html>
  );
}