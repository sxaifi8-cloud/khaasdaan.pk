'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  UtensilsCrossed,
  Search,
  Sparkles,
  ImageIcon,
  ChefHat,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MenuVariant {
  id: string;
  label: string;
  price: number;
  sort_order?: number;
}

interface MenuEntry {
  id: string;
  name: string;
  category: string;
  kitchen_station: 'main' | 'grill' | 'fryer' | 'drinks';
  base_price: number;
  image_url: string | null;
  is_deal?: boolean;
  variants: MenuVariant[];
}

interface CartLine {
  key: string;
  menu_item_id: string | null;
  variant_id: string | null;
  deal_id: string | null;
  item_name: string;
  variant_name: string | null;
  kitchen_station: string;
  quantity: number;
  unit_price: number;
  modifiers_total: number;
  item_notes: string;
}

interface ActiveTableInfo {
  id: string;
  table_number: string;
  table_name: string;
  floor_area: string;
  status: string;
  active_order_id: string | null;
}

interface ActiveOrderRecord {
  id: string;
  receipt_number: string;
  subtotal: number;
  discount_amount: number;
  service_charge: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  items: {
    id: string;
    item_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_notes: string | null;
    kot_status: string;
  }[];
}

const STARTER_MENU: MenuEntry[] = [
  {
    id: 'starter-karahi',
    name: 'Khaasdaan Chicken Karahi',
    category: 'Karahi & Handi',
    kitchen_station: 'grill',
    base_price: 1650,
    image_url: null,
    variants: [
      { id: 'v-half', label: 'Half', price: 1650 },
      { id: 'v-full', label: 'Full', price: 3100 },
    ],
  },
  {
    id: 'starter-mutton',
    name: 'Mutton Shinwari Karahi',
    category: 'Karahi & Handi',
    kitchen_station: 'grill',
    base_price: 2600,
    image_url: null,
    variants: [
      { id: 'v-m-half', label: 'Half', price: 2600 },
      { id: 'v-m-full', label: 'Full', price: 4950 },
    ],
  },
  {
    id: 'starter-bbq',
    name: 'Malai Boti Platter',
    category: 'BBQ & Grill',
    kitchen_station: 'grill',
    base_price: 1250,
    image_url: null,
    variants: [
      { id: 'v-b-8pc', label: '8 Pcs', price: 1250 },
      { id: 'v-b-16pc', label: '16 Pcs', price: 2350 },
    ],
  },
  {
    id: 'starter-burger',
    name: 'Crunch Zinger Burger',
    category: 'Fast Food',
    kitchen_station: 'fryer',
    base_price: 690,
    image_url: null,
    variants: [
      { id: 'v-z-reg', label: 'Regular', price: 690 },
      { id: 'v-z-jumbo', label: 'Cheese Jumbo', price: 890 },
    ],
  },
  {
    id: 'starter-deal1',
    name: 'Family Dastarkhwan Deal',
    category: 'Deals',
    kitchen_station: 'main',
    base_price: 3990,
    image_url: null,
    is_deal: true,
    variants: [
      { id: 'v-d1', label: 'Full Karahi + 6 Naan + 1.5L Drink', price: 3990 },
    ],
  },
  {
    id: 'starter-naan',
    name: 'Roghni Naan / Tandoori Roti',
    category: 'Breads & Sides',
    kitchen_station: 'main',
    base_price: 90,
    image_url: null,
    variants: [
      { id: 'v-roti', label: 'Tandoori Roti', price: 50 },
      { id: 'v-naan', label: 'Roghni Naan', price: 90 },
    ],
  },
  {
    id: 'starter-drink',
    name: 'Cold Drink / Mint Margarita',
    category: 'Beverages',
    kitchen_station: 'drinks',
    base_price: 220,
    image_url: null,
    variants: [
      { id: 'v-can', label: 'Can / Glass', price: 220 },
      { id: 'v-15l', label: '1.5L Bottle', price: 320 },
    ],
  },
];

function PunchOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTableId = searchParams.get('tableId') || '';

  const [tables, setTables] = useState<ActiveTableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderRecord | null>(null);

  const [menuItems, setMenuItems] = useState<MenuEntry[]>(STARTER_MENU);
  const [usingLiveMenu, setUsingLiveMenu] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const [cart, setCart] = useState<CartLine[]>([]);
  const [autoPrintKot, setAutoPrintKot] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [settling, setSettling] = useState<boolean>(false);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_name, floor_area, status, active_order_id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data && data.length > 0) {
      setTables(data as ActiveTableInfo[]);
      if (!selectedTableId && !initialTableId) {
        setSelectedTableId(data[0].id);
      }
    }
  }, [initialTableId, selectedTableId]);

  const loadMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        category,
        kitchen_station,
        base_price,
        image_url,
        is_deal,
        is_available,
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
      const mapped: MenuEntry[] = data.map((row: any) => {
        const sortedVars = (row.item_variants || []).sort(
          (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        return {
          id: row.id,
          name: row.name,
          category: row.category || 'General',
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
                    id: `${row.id}-default`,
                    label: 'Standard',
                    price: Number(row.base_price || 0),
                  },
                ],
        };
      });
      setMenuItems(mapped);
      setUsingLiveMenu(true);
    } else {
      setMenuItems(STARTER_MENU);
      setUsingLiveMenu(false);
    }
  }, []);

  const loadTableOrder = useCallback(async (tableId: string) => {
    if (!tableId) {
      setActiveOrder(null);
      return null;
    }

    const { data: tableRow } = await supabase
      .from('restaurant_tables')
      .select('active_order_id')
      .eq('id', tableId)
      .single();

    if (!tableRow?.active_order_id) {
      setActiveOrder(null);
      return null;
    }

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id, receipt_number, subtotal, discount_amount, service_charge, tax_amount, total_amount, payment_status')
      .eq('id', tableRow.active_order_id)
      .single();

    const { data: itemsRows } = await supabase
      .from('order_items')
      .select('id, item_name, variant_name, quantity, unit_price, line_total, item_notes, kot_status')
      .eq('order_id', tableRow.active_order_id)
      .order('created_at', { ascending: true });

    if (orderRow) {
      const fullOrder: ActiveOrderRecord = {
        ...orderRow,
        items: itemsRows || [],
      };
      setActiveOrder(fullOrder);
      return fullOrder;
    }

    setActiveOrder(null);
    return null;
  }, []);

  useEffect(() => {
    loadTables();
    loadMenu();
  }, [loadTables, loadMenu]);

  useEffect(() => {
    if (initialTableId) {
      setSelectedTableId(initialTableId);
    }
  }, [initialTableId]);

  useEffect(() => {
    if (selectedTableId) {
      loadTableOrder(selectedTableId);
    }
  }, [selectedTableId, loadTableOrder]);

  const categories = ['ALL', ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const visibleMenu = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleAddToCart = (item: MenuEntry) => {
    const chosenVariantId = selectedVariants[item.id] || item.variants[0]?.id;
    const variant = item.variants.find((v) => v.id === chosenVariantId) || item.variants[0];
    const price = variant ? variant.price : item.base_price;
    const variantLabel = variant ? variant.label : null;
    const isRealVariantUuid =
      variant && !variant.id.startsWith('v-') && !variant.id.endsWith('-default');
    const key = `${item.id}-${variant?.id || 'base'}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.key === key);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          key,
          menu_item_id: item.id.startsWith('starter-') ? null : item.id,
          variant_id: isRealVariantUuid ? variant.id : null,
          deal_id: item.is_deal && !item.id.startsWith('starter-') ? item.id : null,
          item_name: item.name,
          variant_name: variantLabel,
          kitchen_station: item.kitchen_station,
          quantity: 1,
          unit_price: price,
          modifiers_total: 0,
          item_notes: '',
        },
      ];
    });
  };

  const updateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + delta } : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const updateCartNote = (key: string, note: string) => {
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, item_notes: note } : line))
    );
  };

  const cartSubtotal = cart.reduce(
    (sum, line) => sum + line.unit_price * line.quantity,
    0
  );

  const openKotWindow = (orderId: string) => {
    window.open(`/print/kot/${orderId}`, '_blank', 'width=380,height=600');
  };

  const handlePunchOrder = async () => {
    if (!selectedTableId) {
      setStatusMessage('Please select a table first.');
      return;
    }
    if (cart.length === 0) {
      setStatusMessage('Add at least one menu item before punching.');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const payload = cart.map((line) => ({
      menu_item_id: line.menu_item_id,
      variant_id: line.variant_id,
      deal_id: line.deal_id,
      item_name: line.item_name,
      variant_name: line.variant_name,
      modifiers: [],
      kitchen_station: line.kitchen_station,
      quantity: line.quantity,
      unit_price: line.unit_price,
      modifiers_total: line.modifiers_total,
      item_notes: line.item_notes || null,
    }));

    const { data: punchedOrderId, error } = await supabase.rpc('punch_table_items', {
      p_table_id: selectedTableId,
      p_punched_by: 'Counter Staff',
      p_items: payload,
    });

    setSubmitting(false);

    if (error) {
      setStatusMessage(`Error punching order: ${error.message}`);
      return;
    }

    setCart([]);
    setStatusMessage('Order punched to table & kitchen KOT ready!');
    const [, updatedOrder] = await Promise.all([
      loadTables(),
      loadTableOrder(selectedTableId),
    ]);

    const targetOrderId = punchedOrderId || updatedOrder?.id;
    if (autoPrintKot && targetOrderId) {
      openKotWindow(targetOrderId);
    }
  };

  const handleSettleBill = async () => {
    if (!selectedTableId || !activeOrder) return;
    setSettling(true);
    setStatusMessage(null);

    const { error } = await supabase.rpc('close_table_order', {
      p_table_id: selectedTableId,
      p_payment_method: paymentMethod,
      p_discount_amount: Number(discountInput || 0),
      p_service_charge: 0,
      p_tax_amount: 0,
    });

    setSettling(false);

    if (error) {
      setStatusMessage(`Error settling bill: ${error.message}`);
      return;
    }

    setDiscountInput(0);
    setStatusMessage(`Bill ${activeOrder.receipt_number} settled & table freed.`);
    await Promise.all([loadTables(), loadTableOrder(selectedTableId)]);
  };

  const currentTable = tables.find((t) => t.id === selectedTableId);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/pos/tables')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Table Floor</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-amber-600" />
              <h1 className="text-base font-extrabold text-slate-900">
                Table Order Punch &amp; Billing
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  usingLiveMenu
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {usingLiveMenu ? 'Live Menu Synced' : 'Sample Menu (Add items in Admin)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Select a table, pick variants/deals, punch items, print hard-copy KOT, and settle DIN- bills
            </p>
          </div>
        </div>

        {/* Table Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Active Table:</label>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
          >
            <option value="">-- Choose Table --</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.table_number} — {t.table_name} ({t.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split: Menu Grid (Left) + Punch Cart & Active Table Bill (Right) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Menu Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search karahi, BBQ, burger, deal, drink..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Menu' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleMenu.map((item) => {
              const activeVarId = selectedVariants[item.id] || item.variants[0]?.id;
              const currentVar =
                item.variants.find((v) => v.id === activeVarId) || item.variants[0];

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                >
                  <div>
                    <div className="flex items-start gap-2.5">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-12 w-12 shrink-0 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-xs font-bold leading-snug text-slate-900">
                            {item.name}
                          </h3>
                          {item.is_deal && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              <Sparkles className="h-2.5 w-2.5" /> Deal
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{item.category}</p>
                      </div>
                    </div>

                    {item.variants.length > 1 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setSelectedVariants((prev) => ({ ...prev, [item.id]: v.id }))
                            }
                            className={`rounded px-2 py-1 text-[11px] font-semibold border ${
                              v.id === currentVar?.id
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-sm font-extrabold text-slate-900">
                      Rs. {Number(currentVar?.price ?? item.base_price).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: New Punch Queue + Existing Table Bill */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  New Items to Punch
                </h2>
                <p className="text-[11px] text-slate-500">
                  {currentTable
                    ? `${currentTable.table_number} — ${currentTable.table_name}`
                    : 'No table selected'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>

            {cart.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Tap &ldquo;Add&rdquo; on menu items to prepare a kitchen KOT punch.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {cart.map((line) => (
                  <div
                    key={line.key}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {line.item_name}
                          {line.variant_name ? ` (${line.variant_name})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rs. {line.unit_price.toLocaleString()} × {line.quantity} ={' '}
                          <strong className="text-slate-800">
                            Rs. {(line.unit_price * line.quantity).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.key, -1)}
                          className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100"
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.key, 1)}
                          className="rounded border border-slate-300 bg-white p-1 text-slate-700 hover:bg-slate-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Kitchen note (e.g. kam mirch, extra raita)..."
                      value={line.item_notes}
                      onChange={(e) => updateCartNote(line.key, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={autoPrintKot}
                onChange={(e) => setAutoPrintKot(e.target.checked)}
                className="rounded border-slate-300"
              />
              <ChefHat className="h-3.5 w-3.5 text-amber-600" />
              <span>Open hard-copy KOT slip automatically after punch</span>
            </label>

            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Punch Subtotal:</span>
              <span className="text-base font-extrabold text-slate-900">
                Rs. {cartSubtotal.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              disabled={submitting || cart.length === 0 || !selectedTableId}
              onClick={handlePunchOrder}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Punching Order...' : 'Punch Order & Generate KOT'}
            </button>
          </div>

          {/* Active Table Bill & Settlement */}
          {activeOrder && (
            <div className="rounded-xl border-2 border-amber-300 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="font-mono text-xs font-extrabold text-amber-700">
                    {activeOrder.receipt_number}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Active Table Bill
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openKotWindow(activeOrder.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                  >
                    <ChefHat className="h-3.5 w-3.5" />
                    <span>Print KOT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `/print/dine-in/${activeOrder.id}`,
                        '_blank',
                        'width=380,height=650'
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Bill</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs max-h-44 overflow-y-auto">
                {activeOrder.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-slate-700">
                    <span>
                      <strong>{it.quantity}×</strong> {it.item_name}
                      {it.variant_name ? ` (${it.variant_name})` : ''}
                    </span>
                    <span className="font-semibold">
                      Rs. {Number(it.line_total).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Bill Total:</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    Rs. {Number(activeOrder.total_amount).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Discount (Rs.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(Number(e.target.value))}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={settling}
                  onClick={handleSettleBill}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{settling ? 'Settling...' : 'Settle & Free Table'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PunchOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading punch screen...</div>}>
      <PunchOrderContent />
    </Suspense>
  );
}