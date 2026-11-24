'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PrintableOnlineOrder {
  id: string;
  receipt_number: string;
  channel: string;
  order_type: 'delivery' | 'takeaway' | string;
  external_order_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_area: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  order_items: {
    id: string;
    item_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_notes: string | null;
  }[];
}

function PrintOnlineContent() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const [order, setOrder] = useState<PrintableOnlineOrder | null>(null);
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          receipt_number,
          channel,
          order_type,
          external_order_id,
          customer_name,
          customer_phone,
          delivery_area,
          delivery_address,
          notes,
          subtotal,
          discount_amount,
          delivery_fee,
          tax_amount,
          total_amount,
          payment_status,
          payment_method,
          created_at,
          order_items (
            id,
            item_name,
            variant_name,
            quantity,
            unit_price,
            line_total,
            item_notes
          )
        `)
        .eq('id', orderId)
        .single();

      if (data) {
        const typed = data as unknown as PrintableOnlineOrder;
        setOrder(typed);
        setFormattedDate(
          new Date(typed.created_at).toLocaleString('en-PK', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        );
      }
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) {
    return <div className="p-6 text-xs text-slate-600">Loading receipt...</div>;
  }

  if (!order) {
    return <div className="p-6 text-xs text-rose-600">Receipt not found.</div>;
  }

  const isTakeaway = order.order_type === 'takeaway';
  const topBannerLabel = isTakeaway ? 'TAKEAWAY / COLLECTION' : 'ONLINE ORDER';

  return (
    <div className="min-h-screen bg-slate-200 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex w-[80mm] items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print 80mm Receipt</span>
        </button>
      </div>

      <div className="mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <div className="mb-2 border-2 border-black bg-black py-1 text-center text-xs font-extrabold tracking-wider text-white print:bg-white print:text-black">
          *** {topBannerLabel} ***
        </div>

        <div className="border-b border-dashed border-black pb-2 text-center">
          <div className="text-base font-extrabold tracking-wide">KHAASDAAN</div>
          <div className="text-[10px]">khaasdaan.pk</div>
          <div className="mt-1 text-xs font-extrabold">{order.receipt_number}</div>
          {formattedDate && <div className="text-[10px]">{formattedDate}</div>}
        </div>

        <div className="border-b border-dashed border-black py-2 space-y-0.5">
          <div>
            <strong>Source:</strong> {order.channel.replace('_', ' ').toUpperCase()}
          </div>
          <div>
            <strong>Mode:</strong> {isTakeaway ? 'Takeaway / Collection' : 'Home Delivery'}
          </div>
          {order.external_order_id && (
            <div>
              <strong>Platform Ref:</strong> {order.external_order_id}
            </div>
          )}
          {order.customer_name && (
            <div>
              <strong>Customer:</strong> {order.customer_name}
            </div>
          )}
          {order.customer_phone && (
            <div>
              <strong>Phone:</strong> {order.customer_phone}
            </div>
          )}
          {!isTakeaway && order.delivery_area && (
            <div>
              <strong>Area:</strong> {order.delivery_area}
            </div>
          )}
          {!isTakeaway && order.delivery_address && (
            <div>
              <strong>Address:</strong> {order.delivery_address}
            </div>
          )}
          {order.notes && (
            <div>
              <strong>Note:</strong> {order.notes}
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-black py-2 space-y-1.5">
          <div className="flex justify-between border-b border-black pb-1 text-[10px] font-bold">
            <span>ITEM</span>
            <span>AMOUNT</span>
          </div>

          {order.order_items?.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between gap-2">
                <span className="font-bold">
                  {item.quantity}x {item.item_name}
                  {item.variant_name ? ` (${item.variant_name})` : ''}
                </span>
                <span className="shrink-0 font-bold">
                  Rs.{Number(item.line_total).toLocaleString()}
                </span>
              </div>
              {item.item_notes && (
                <div className="pl-3 text-[10px]">* {item.item_notes}</div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs.{Number(order.subtotal).toLocaleString()}</span>
          </div>

          {!isTakeaway && Number(order.delivery_fee) > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>Rs.{Number(order.delivery_fee).toLocaleString()}</span>
            </div>
          )}

          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-Rs.{Number(order.discount_amount).toLocaleString()}</span>
            </div>
          )}

          {Number(order.tax_amount) > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>Rs.{Number(order.tax_amount).toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between border-t-2 border-black pt-1 text-xs font-extrabold">
            <span>TOTAL</span>
            <span>Rs.{Number(order.total_amount).toLocaleString()}</span>
          </div>

          <div className="pt-1 text-[10px]">
            Payment: <strong>{order.payment_status.toUpperCase()}</strong>
            {order.payment_method ? ` (${order.payment_method.replace('_', ' ')})` : ''}
          </div>
        </div>

        <div className="mt-3 border-t border-dashed border-black pt-2 text-center text-[10px]">
          Thank you for ordering from Khaasdaan!
        </div>
      </div>
    </div>
  );
}

export default function PrintOnlineReceiptPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-600">Loading receipt...</div>}>
      <PrintOnlineContent />
    </Suspense>
  );
}