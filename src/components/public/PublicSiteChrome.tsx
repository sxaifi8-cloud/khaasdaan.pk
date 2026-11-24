'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  Menu,
  X,
} from 'lucide-react';

const PUBLIC_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'Order Online', href: '/order' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasLogoFile, setHasLogoFile] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-slate-900">
      {/* Top Announcement Bar */}
      <div className="bg-amber-500 px-4 py-1.5 text-center text-[11px] font-extrabold text-slate-950">
        Authentic Desi Karahi, Charcoal BBQ &amp; Family Dastarkhwan • Free Delivery in Faisalabad on Orders Above Rs. 2,500
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Brand Logo (No broken img placeholder if public/logo.png is not added yet) */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Khaasdaan Faisalabad Logo"
              onLoad={() => setHasLogoFile(true)}
              onError={() => setHasLogoFile(false)}
              className={
                hasLogoFile
                  ? 'h-10 w-10 rounded-xl object-contain bg-amber-500 p-1'
                  : 'hidden'
              }
            />
            {!hasLogoFile && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-lg text-slate-950 shadow">
                K
              </div>
            )}
            <div>
              <div className="text-base font-black tracking-wider text-white">
                KHAASDAAN
              </div>
              <div className="text-[10px] font-medium text-amber-300">
                www.khaasdaan.pk
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {PUBLIC_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-extrabold uppercase tracking-wider transition ${
                    active
                      ? 'text-amber-400'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Header CTA Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            <a
              href="tel:+923001234567"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-amber-400 hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              <span>Call to Order</span>
            </a>

            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Order Online</span>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/order"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Order</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-200"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2 md:hidden">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-xs font-extrabold uppercase ${
                  pathname === link.href
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Page Body */}
      <main className="flex-1">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 font-black text-slate-950">
                K
              </div>
              <span className="text-base font-black tracking-wider text-white">
                KHAASDAAN
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Authentic Pakistani Karahi, charcoal-grilled BBQ, and traditional Dastarkhwan platters crafted fresh to order in Faisalabad.
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs">
              {PUBLIC_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-amber-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Delivery Areas in Faisalabad
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              D Ground • Kohinoor City • People&apos;s Colony 1 &amp; 2 • Satiana Road • Madina Town • Canal Road &amp; Susan Road, Faisalabad.
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Visit &amp; Hours
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span><span> Main Satiana Road, Near McDonalds, 1122 Office, Faisalabad, Pakistan</span> </span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Daily: 12:00 PM – 1:00 AM</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>+92 300 1234567</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 px-4 py-4 text-center text-[11px] text-slate-500">
          © 2026 Khaasdaan (www.khaasdaan.pk). All rights reserved. •{' '}
          <Link href="/pos" className="text-slate-600 hover:text-amber-400">
            Staff POS
          </Link>
        </div>
      </footer>
    </div>
  );
}