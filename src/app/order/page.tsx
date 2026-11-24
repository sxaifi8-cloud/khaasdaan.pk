'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Truck,
  Store,
  CheckCircle2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PublicSiteChrome from '@/components/public/PublicSiteChrome';

interface StoreVariant {
  id: string;
  label: string;
  price: number;
}

interface StoreMenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  kitchen_station: string;
  base_price: number;
  image_url: string | null;
  is_deal: boolean;
  variants: StoreVariant[];
}

interface StoreCartItem {
  key: string;
  menu_item_id: string | null;
  variant_id: string | null;
  deal_id: string | null;
  item_name: string;
  variant_name: string | null;
  kitchen_station: string;
  quantity: number;
  unit_price: number;
}

interface PlacedOnlineOrder {
  id: string;
  receipt_number: string;
  order_type: string;
  status: string;
  total_amount: number;
  customer_name: string | null;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Karahi & Handi':
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
  'BBQ & Grill':
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
  'Fast Food':
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  Deals:
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_STORE_IMAGE =
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80';

const FALLBACK_STORE_ITEMS: StoreMenuItem[] = [
  {
    id: 'store-karahi',
    name: 'Khaasdaan Chicken Karahi',
    category: 'Karahi & Handi',
    description: 'Traditional wok-cooked chicken karahi with fresh ginger & green chilies.',
    kitchen_station: 'grill',
    base_price: 1650,
    image_url: null,
    is_deal: false,
    variants: [
      { id: 'sv-1', label: 'Half', price: 1650 },
      { id: 'sv-2', label: 'Full', price: 3100 },
    ],
  },
  {
    id: 'store-bbq',
    name: 'Malai Boti Platter',
    category: 'BBQ & Grill',
    description: 'Creamy marinated charcoal-grilled boti served hot.',
    kitchen_station: 'grill',
    base_price: 1250,
    image_url: null,
    is_deal: false,
    variants: [
      { id: 'sv-3', label: '8 Pcs', price: 1250 },
      { id: 'sv-4', label: '16 Pcs', price: 2350 },
    ],
  },
  {
    id: 'store-deal',
    name: 'Family Dastarkhwan Deal',
    category: 'Deals',
    description: 'Full Karahi + 6 Roghni Naan + 1.5L Drink.',
    kitchen_station: 'main',
    base_price: 3990,
    image_url: null,
    is_deal: true,
    variants: [{ id: 'sv-5', label: 'Complete Deal', price: 3990 }],
  },
];

export default function CustomerStorefrontPage() {
  const [menu, setMenu] = useState<StoreMenuItem[]>(FALLBACK_STORE_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [chosenVariantByItem, setChosenVariantByItem] = useState<Record<string, string>>({});

  const [cart, setCart] = useState<StoreCartItem[]>([]);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryArea, setDeliveryArea] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<PlacedOnlineOrder | null>(null);

  const loadStoreMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        category,
        description,
        kitchen_station,
        base_price,
        image_url,
        is_deal,
        item_variants (
          id,
          label,
          price,
          sort_order
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped: StoreMenuItem[] = data.map((row: any) => {
        const sortedVars = (row.item_variants || []).sort(
          (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        return {
          id: row.id,
          name: row.name,
          category: row.category || 'General',
          description: row.description || null,
          kitchen_station: row.kitchen_station || 'main',
          base_price: Number(row.base_price || 0),
          image_url: row.image_url || null,
          is_deal: Boolean(row.is_deal),
          variants:
            sortedVars.length > 0
              ? sortedVars.map((v: any) => ({
                  id: v.id,
                  label: v.label,
                  price: Number(v.price),
                }))
              : [
                  {
                    id: `${row.id}-std`,
                    label: 'Standard',
                    price: Number(row.base_price || 0),
                  },
                ],
        };
      });
      setMenu(mapped);
    }
  }, []);

  useEffect(() => {
    loadStoreMenu();
  }, [loadStoreMenu]);

  useEffect(() => {
    if (!placedOrder?.id) return;

    const channel = supabase
      .channel(`customer-order-${placedOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${placedOrder.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setPlacedOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: updated.status,
                  total_amount: Number(updated.total_amount),
                }
              : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placedOrder?.id]);

  const categories = ['ALL', ...Array.from(new Set(menu.map((m) => m.category)))];

  const filteredMenu = menu.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: StoreMenuItem) => {
    const varId = chosenVariantByItem[item.id] || item.variants[0]?.id;
    const variant = item.variants.find((v) => v.id === varId) || item.variants[0];
    const price = variant ? variant.price : item.base_price;
    const isRealUuid = !item.id.startsWith('store-');
    const isRealVarUuid =
      variant && !variant.id.startsWith('sv-') && !variant.id.endsWith('-std');
    const key = `${item.id}-${variant?.id || 'base'}`;

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          menu_item_id: isRealUuid ? item.id : null,
          variant_id: isRealVarUuid ? variant.id : null,
          deal_id: isRealUuid && item.is_deal ? item.id : null,
          item_name: item.name,
          variant_name: variant ? variant.label : null,
          kitchen_station: item.kitchen_station,
          quantity: 1,
          unit_price: price,
        },
      ];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const deliveryFee = orderType === 'delivery' && subtotal > 0 ? 150 : 0;
  const grandTotal = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg('Your bag is empty. Add items from the menu first.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('Please enter your name and phone number.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          receipt_series: 'online',
          channel: 'website',
          order_type: orderType,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          delivery_area: orderType === 'delivery' ? deliveryArea.trim() || null : null,
          delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
          status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: grandTotal,
          payment_status: 'unpaid',
          notes: notes.trim() || null,
          punched_by: 'website_customer',
        })
        .select('id, receipt_number, order_type, status, total_amount, customer_name')
        .single();

      if (orderError) throw orderError;

      const lineRows = cart.map((line) => ({
        order_id: createdOrder.id,
        menu_item_id: line.menu_item_id,
        variant_id: line.variant_id,
        deal_id: line.deal_id,
        item_name: line.item_name,
        variant_name: line.variant_name,
        modifiers: [],
        kitchen_station: line.kitchen_station,
        quantity: line.quantity,
        unit_price: line.unit_price,
        modifiers_total: 0,
        punched_by: 'website_customer',
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(lineRows);
      if (itemsError) throw itemsError;

      setPlacedOrder({
        id: createdOrder.id,
        receipt_number: createdOrder.receipt_number,
        order_type: createdOrder.order_type,
        status: createdOrder.status,
        total_amount: Number(createdOrder.total_amount),
        customer_name: createdOrder.customer_name,
      });

      setCart([]);
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not submit order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicSiteChrome>
      <div className="bg-stone-50 text-slate-900">
        {/* Storefront Sub-Header */}
        <div className="border-b border-stone-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                www.khaasdaan.pk • Online Ordering
              </span>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">
                Khaasdaan Online Menu &amp; Delivery
              </h1>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  orderType === 'delivery'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  orderType === 'takeaway'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Takeaway</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          {placedOrder && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>
                    Order Placed! Tracking ID:{' '}
                    <span className="font-mono">{placedOrder.receipt_number}</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Thank you, <strong>{placedOrder.customer_name}</strong> • Total:{' '}
                  <strong>Rs. {placedOrder.total_amount.toLocaleString()}</strong> • Mode:{' '}
                  <strong className="uppercase">{placedOrder.order_type}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-emerald-200">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-600">Live Status:</span>
                <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-extrabold uppercase text-white">
                  {placedOrder.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Menu Catalog */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dishes, karahi, BBQ, deals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Items' : cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {filteredMenu.map((item) => {
                  const activeVarId = chosenVariantByItem[item.id] || item.variants[0]?.id;
                  const currentVar =
                    item.variants.find((v) => v.id === activeVarId) || item.variants[0];
                  const imgSrc =
                    item.image_url ||
                    CATEGORY_FALLBACK_IMAGES[item.category] ||
                    DEFAULT_STORE_IMAGE;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs"
                    >
                      <div>
                        <div className="flex gap-3">
                          <img
                            src={imgSrc}
                            alt={`${item.name} - Khaasdaan Faisalabad`}
                            className="h-16 w-16 shrink-0 rounded-xl object-cover border border-stone-200"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                              {item.is_deal && (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  <Sparkles className="h-2.5 w-2.5" /> Deal
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.variants.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.variants.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() =>
                                  setChosenVariantByItem((prev) => ({
                                    ...prev,
                                    [item.id]: v.id,
                                  }))
                                }
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                  v.id === currentVar?.id
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-stone-200 bg-stone-50 text-slate-700 hover:bg-stone-100'
                                }`}
                              >
                                {v.label} • Rs. {v.price.toLocaleString()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                        <span className="text-sm font-extrabold text-slate-900">
                          Rs. {Number(currentVar?.price ?? item.base_price).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to Bag</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkout Bag Form */}
            <form
              onSubmit={handlePlaceOrder}
              className="lg:col-span-4 rounded-xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4 h-fit"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">Your Order Bag</h2>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>

              {cart.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Select items from the menu to place an online order.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cart.map((line) => (
                    <div
                      key={line.key}
                      className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-2.5 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {line.item_name}
                          {line.variant_name ? ` (${line.variant_name})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rs. {(line.unit_price * line.quantity).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQty(line.key, -1)}
                          className="rounded border bg-white p-1"
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="h-3 w-3 text-rose-600" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </button>
                        <span className="w-5 text-center font-bold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(line.key, 1)}
                          className="rounded border bg-white p-1"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2.5 border-t border-stone-100 pt-3 text-xs">
                <input
                  required
                  type="text"
                  placeholder="Your Full Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
                <input
                  required
                  type="tel"
                  placeholder="Mobile / WhatsApp Number *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
                {orderType === 'delivery' && (
                  <>
                    <input
                      type="text"
                      placeholder="Area / Block (e.g. D Ground, Kohinoor)"
                      value={deliveryArea}
                      onChange={(e) => setDeliveryArea(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    />
                    <textarea
                      required
                      rows={2}
                      placeholder="Complete Delivery Address *"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    />
                  </>
                )}
                <input
                  type="text"
                  placeholder="Special instructions (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-stone-200 pt-1.5 text-sm font-extrabold text-slate-900">
                  <span>Total Payable:</span>
                  <span>Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Placing Order...' : 'Place Online Order'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicSiteChrome>
  );
}