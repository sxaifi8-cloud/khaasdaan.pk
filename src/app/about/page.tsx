import React from 'react';
import Link from 'next/link';
import { Flame, HeartHandshake, Sparkles, UtensilsCrossed, ArrowRight } from 'lucide-react';
import PublicSiteChrome from '@/components/public/PublicSiteChrome';

export default function AboutUsPage() {
  return (
    <PublicSiteChrome>
      <section className="bg-slate-950 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 space-y-3">
          <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
            About Khaasdaan
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Where Traditional Hospitality Meets Authentic Flavor
          </h1>
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Inspired by the warmth of the traditional Pakistani Dastarkhwan, Khaasdaan brings families together over freshly prepared karahis, live charcoal BBQ, and hand-baked breads in Faisalabad.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 space-y-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Flame className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              100% Freshly Wok-Tossed
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Every karahi is prepared fresh to order with hand-ground spices, fresh tomatoes, and quality ingredients.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Family Dine-In &amp; Events
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Enjoy generous portions, welcoming hospitality, and comfortable family seating in Faisalabad.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Hygiene &amp; Quality First
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Prepared under strict cleanliness standards and packed hot for doorstep delivery or takeaway.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-900 p-8 text-white">
          <div className="space-y-1">
            <h3 className="text-xl font-black">Ready to Order from Khaasdaan?</h3>
            <p className="text-xs text-slate-300">
              Browse the menu or place an order for home delivery and takeaway.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Order Online Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicSiteChrome>
  );
}