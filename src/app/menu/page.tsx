'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  ArrowRight,
  Flame,
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PublicSiteChrome from '@/components/public/PublicSiteChrome';

interface MenuDish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  image_url: string | null;
  is_deal: boolean;
  item_variants: { id: string; label: string; price: number; sort_order?: number }[];
}

const CATEGORY_BANNERS: Record<string, string> = {
  'Karahi & Handi':
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80',
  'BBQ & Grill':
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80',
  'Fast Food':
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
  Deals:
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
};

const DEFAULT_DISH_IMAGE =
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80';

export default function PublicMenuPage() {
  const [items, setItems] = useState<MenuDish[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('menu_items')
      .select(`
        id, name, description, category, base_price, image_url, is_deal,
        item_variants ( id, label, price, sort_order )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setItems(data as unknown as MenuDish[]);
        setLoading(false);
      });
  }, []);

  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category || 'Specials')))];

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const groupedByCategory = filtered.reduce<Record<string, MenuDish[]>>((acc, item) => {
    const cat = item.category || 'Specials';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <PublicSiteChrome>
      {/* Menu Hero */}
      <section className="bg-slate-950 py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Khaasdaan Faisalabad Complete Menu</span>
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Authentic Karahi, Charcoal BBQ &amp; Family Deals
          </h1>
          <p className="mx-auto max-w-2xl text-xs text-slate-300 sm:text-sm">
            Explore our freshly prepared Pakistani dishes with half &amp; full portion options. Ready to order? Click any dish to add it to your delivery or takeaway bag.
          </p>

          <div className="mx-auto max-w-lg pt-2">
            <div className="relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Chicken Karahi, Mutton Shinwari, Malai Boti, Deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-2.5 pl-11 pr-4 text-xs text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills & Menu Sections */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-10">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white shadow'
                  : 'border border-stone-200 bg-white text-slate-700 hover:bg-stone-100'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading menu...</div>
        ) : Object.keys(groupedByCategory).length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center space-y-3">
            <p className="text-xs text-slate-500">
              No dishes found. Add your dishes in Admin Menu or browse online ordering.
            </p>
            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950"
            >
              <span>Go to Online Ordering</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          Object.entries(groupedByCategory).map(([categoryName, dishes]) => (
            <div key={categoryName} className="space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-600" />
                  <h2 className="text-xl font-black text-slate-900">{categoryName}</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {dishes.length} {dishes.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dishes.map((dish) => {
                  const photo =
                    dish.image_url ||
                    CATEGORY_BANNERS[dish.category] ||
                    DEFAULT_DISH_IMAGE;
                  const variants = (dish.item_variants || []).sort(
                    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                  );

                  return (
                    <article
                      key={dish.id}
                      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                          <img
                            src={photo}
                            alt={`${dish.name} - Khaasdaan Faisalabad`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          {dish.is_deal && (
                            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase text-slate-950 shadow">
                              <Sparkles className="h-3 w-3" /> Special Deal
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {dish.name}
                          </h3>
                          <p className="text-xs leading-relaxed text-slate-500">
                            {dish.description ||
                              'Prepared fresh to order at Khaasdaan Faisalabad with authentic spices.'}
                          </p>

                          {variants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {variants.map((v) => (
                                <span
                                  key={v.id}
                                  className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-slate-700"
                                >
                                  {v.label}: Rs. {Number(v.price).toLocaleString()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5 bg-stone-50/50">
                        <span className="text-base font-black text-slate-900">
                          Rs. {Number(dish.base_price).toLocaleString()}
                        </span>
                        <Link
                          href="/order"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-500 hover:text-slate-950 transition"
                        >
                          <span>Order Online</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </PublicSiteChrome>
  );
}