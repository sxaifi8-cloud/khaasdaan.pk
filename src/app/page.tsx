'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Truck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PublicSiteChrome from '@/components/public/PublicSiteChrome';

interface FeaturedDish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  image_url: string | null;
  is_deal: boolean;
}

const FOOD_SECTIONS = [
  {
    title: 'Karahi & Handi',
    subtitle: 'Wok-tossed Chicken & Mutton Shinwari Karahi',
    image:
      'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Charcoal BBQ & Grill',
    subtitle: 'Creamy Malai Boti, Seekh Kabab & Tikka',
    image:
      'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Family Dastarkhwan Deals',
    subtitle: 'Complete platters for 4 to 8 guests',
    image:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Burgers & Fast Food',
    subtitle: 'Crispy Zinger Burgers & Loaded Platters',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
];

const DEFAULT_FOOD_IMG =
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80';

export default function HomePage() {
  const [featured, setFeatured] = useState<FeaturedDish[]>([]);

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, name, description, category, base_price, image_url, is_deal')
      .eq('is_available', true)
      .order('created_at', { ascending: true })
      .limit(6)
      .then(({ data }) => {
        if (data) setFeatured(data as FeaturedDish[]);
      });
  }, []);

  return (
    <PublicSiteChrome>
      {/* Hero Section with High-Impact Food Visual */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20">
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300">
              <Flame className="h-3.5 w-3.5" />
              <span>Best Karahi &amp; Charcoal BBQ Restaurant in Faisalabad</span>
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Rich Flavors, Crafted Fresh at{' '}
              <span className="text-amber-400">Khaasdaan</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Experience authentic Pakistani Karahi, smoky live charcoal BBQ, and generous family Dastarkhwan deals in D Ground, Faisalabad—available for family dine-in, takeaway, and fast doorstep delivery.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/order"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-lg hover:bg-amber-400"
              >
                <span>Order Online Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/menu"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3.5 text-xs font-bold text-white hover:border-amber-400"
              >
                <span>Browse Full Menu</span>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-black text-amber-400">35–45 Mins</div>
                <div className="text-[11px] text-slate-400">Hot Delivery</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-black text-emerald-400">100% Fresh</div>
                <div className="text-[11px] text-slate-400">Cooked on Order</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-black text-sky-400">No Markups</div>
                <div className="text-[11px] text-slate-400">Direct Menu Prices</div>
              </div>
            </div>
          </div>

          {/* Right Hero Food Showcase Image */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=85"
                alt="Khaasdaan Special Chicken Karahi & Charcoal BBQ Faisalabad"
                className="h-[340px] w-full object-cover sm:h-[420px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" /> House Signature
                    </span>
                    <h2 className="text-lg font-black text-white">
                      Khaasdaan Special Chicken &amp; Mutton Karahi
                    </h2>
                  </div>
                  <Link
                    href="/order"
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                  >
                    Order Rs. 1,650+
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Food Categories Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
              Curated Categories
            </span>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Explore Our Food Sections
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 hover:underline"
          >
            <span>See All Categories</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FOOD_SECTIONS.map((sec) => (
            <Link
              key={sec.title}
              href="/menu"
              className="group relative h-64 overflow-hidden rounded-2xl border border-stone-200 bg-slate-900 shadow-sm"
            >
              <img
                src={sec.image}
                alt={`${sec.title} at Khaasdaan Faisalabad`}
                className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h3 className="text-base font-black">{sec.title}</h3>
                <p className="mt-0.5 text-xs text-slate-200">{sec.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Dishes from Live Menu */}
      <section className="bg-white border-y border-stone-200 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                Most Ordered in Faisalabad
              </span>
              <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                Signature Dishes &amp; Deals
              </h2>
            </div>

            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800"
            >
              <span>Order Online</span>
              <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((dish) => (
              <div
                key={dish.id}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-2xs transition hover:border-amber-400 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-stone-200">
                    <img
                      src={dish.image_url || DEFAULT_FOOD_IMG}
                      alt={`${dish.name} - Khaasdaan Faisalabad`}
                      className="h-full w-full object-cover"
                    />
                    {dish.is_deal && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
                        <Sparkles className="h-3 w-3" /> Deal
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      {dish.category}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {dish.name}
                    </h3>
                    {dish.description && (
                      <p className="line-clamp-2 text-xs text-slate-600">
                        {dish.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-200 bg-white px-4 py-3">
                  <span className="text-sm font-black text-slate-900">
                    From Rs. {Number(dish.base_price).toLocaleString()}
                  </span>
                  <Link
                    href="/order"
                    className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                  >
                    Order Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Faisalabad SEO & Delivery Coverage Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 rounded-3xl bg-slate-950 p-8 text-white lg:grid-cols-12 lg:items-center">
          <div className="space-y-3 lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
              <MapPin className="h-4 w-4" />
              <span>Faisalabad Dine-In &amp; Home Delivery</span>
            </span>
            <h2 className="text-2xl font-black sm:text-3xl">
              Hot Desi Food Delivered Across Faisalabad
            </h2>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Looking for the best Chicken Karahi, Mutton Shinwari, or Charcoal BBQ in Faisalabad? Khaasdaan delivers fresh, hygienically packed meals across <strong>D Ground</strong>, <strong>Kohinoor City</strong>, <strong>People&apos;s Colony 1 &amp; 2</strong>, <strong>Satiana Road</strong>, <strong>Madina Town</strong>, and <strong>Canal Road</strong>.
            </p>
          </div>

          <div className="space-y-3 lg:col-span-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <Truck className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <div className="font-extrabold text-white">Free Delivery Over Rs. 2,500</div>
                <div className="text-slate-400">Standard delivery Rs. 150 anywhere in city zones</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <Clock className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <div className="font-extrabold text-white">Open Late Till 1:00 AM</div>
                <div className="text-slate-400">Lunch, dinner &amp; midnight cravings covered daily</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
              <ShieldCheck className="h-5 w-5 shrink-0 text-sky-400" />
              <div>
                <div className="font-extrabold text-white">Cash on Delivery &amp; Self-Pickup</div>
                <div className="text-slate-400">Instant confirmation straight to our kitchen screen</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}