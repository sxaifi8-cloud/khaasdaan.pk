'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Printer, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KotOrder {
  id: string;
  receipt_series: 'dine_in' | 'online';
  receipt_number: string;
  channel: string;
  order_type: string;
  table_label: string | null;
  customer_name: string | null;
  external_order_id: string | null;
  notes: string | null;
  punched_by: string | null;
  order_items: {
    id: string;
    item_name: string;
    variant_name: string | null;
    kitchen_station: string;
    quantity: number;
    item_notes: string | null;
    kot_printed: boolean;
    kot_status: string;
  }[];
}

function PrintKotContent() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const orderId = params?.orderId;
  const reprintAll = searchParams.get('reprint') === '1';

  const [order, setOrder] = useState<KotOrder | null>(null);
  const [itemsToPrint, setItemsToPrint] = useState<KotOrder['order_items']>([]);
  const [isAddOn, setIsAddOn] = useState(false);
  const [timeNow, setTimeNow] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadAndMarkKot = useCallback(async () => {
    if (!orderId) return;

    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        receipt_series,
        receipt_number,
        channel,
        order_type,
        table_label,
        customer_name,
        external_order_id,
        notes,
        punched_by,
        order_items (
          id,
          item_name,
          variant_name,
          kitchen_station,
          quantity,
          item_notes,
          kot_printed,
          kot_status
        )
      `)
      .eq('id', orderId)
      .single();

    if (data) {
      const typed = data as unknown as KotOrder;
      const activeItems = (typed.order_items || []).filter(
        (i) => i.kot_status !== 'cancelled'
      );
      const unprintedItems = activeItems.filter((i) => !i.kot_printed);
      const alreadyHadPrinted = activeItems.some((i) => i.kot_printed);

      const selected =
        reprintAll || unprintedItems.length === 0 ? activeItems : unprintedItems;

      setOrder(typed);
      setItemsToPrint(selected);
      setIsAddOn(!reprintAll && unprintedItems.length > 0 && alreadyHadPrinted);

      if (unprintedItems.length > 0) {
        await supabase
          .from('order_items')
          .update({ kot_printed: true })
          .in(
            'id',
            unprintedItems.map((i) => i.id)
          );
      }
    }
    setLoading(false);
  }, [orderId, reprintAll]);

  useEffect(() => {
    setTimeNow(
      new Date().toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
    loadAndMarkKot();
  }, [loadAndMarkKot]);

  if (loading) {
    return <div className="p-6 text-xs text-slate-600">Preparing Kitchen KOT...</div>;
  }

  if (!order) {
    return <div className="p-6 text-xs text-rose-600">Order not found for KOT.</div>;
  }

  const isDineIn = order.receipt_series === 'dine_in';
  const headerBanner = isDineIn
    ? isAddOn
      ? 'KOT - ADD-ON ITEMS (DINE-IN)'
      : 'KITCHEN ORDER TICKET (DINE-IN)'
    : order.order_type === 'takeaway'
    ? 'KOT - TAKEAWAY / COLLECTION'
    : `KOT - ONLINE (${order.channel.toUpperCase()})`;

  return (
    <div className="min-h-screen bg-slate-200 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex w-[80mm] items-center justify-between gap-2 print:hidden">
        <a
          href={`/print/kot/${order.id}?reprint=1`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reprint Full KOT</span>
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print KOT</span>
        </button>
      </div>

      <div className="mx-auto w-[80mm] bg-white p-3 font-mono text-black shadow print:shadow-none">
        <div className="border-2 border-black bg-black py-1.5 text-center text-xs font-extrabold tracking-wide text-white print:bg-white print:text-black">
          {headerBanner}
        </div>

        <div className="mt-2 border-b-2 border-black pb-2 text-center">
          <div className="text-lg font-black tracking-tight">
            {isDineIn
              ? order.table_label || 'DINE-IN'
              : order.customer_name || order.channel.toUpperCase()}
          </div>
          <div className="text-xs font-bold">
            {order.receipt_number} {timeNow ? `• Time: ${timeNow}` : ''}
          </div>
          {order.external_order_id && (
            <div className="text-xs font-bold">Ref: #{order.external_order_id}</div>
          )}
        </div>

        {order.notes && (
          <div className="border-b border-dashed border-black py-1.5 text-xs font-bold">
            ORDER NOTE: {order.notes}
          </div>
        )}

        <div className="py-2.5 space-y-2.5">
          {itemsToPrint.map((item) => (
            <div key={item.id} className="border-b border-dashed border-black pb-2">
              <div className="flex items-start gap-2 text-sm font-black leading-tight">
                <span className="rounded border-2 border-black px-1.5 py-0.5 text-base">
                  {item.quantity}x
                </span>
                <div className="flex-1">
                  <div>
                    {item.item_name}
                    {item.variant_name ? ` (${item.variant_name})` : ''}
                  </div>
                  <div className="text-[10px] font-bold uppercase">
                    [{item.kitchen_station}]
                  </div>
                </div>
              </div>

              {item.item_notes && (
                <div className="mt-1 pl-9 text-xs font-extrabold">
                  &gt;&gt; {item.item_notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-1 text-center text-[10px] font-bold">
          Punched by: {order.punched_by || 'Counter'} • KHAASDAAN KITCHEN
        </div>
      </div>
    </div>
  );
}

export default function PrintKotPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-600">Preparing Kitchen KOT...</div>}>
      <PrintKotContent />
    </Suspense>
  );
}