'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Globe,
  Plus,
  Printer,
  Truck,
  CheckCircle2,
  X,
  ChefHat,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  offlineDb,
  flushSyncOutbox,
  type LocalOrderRecord,
} from '@/lib/offlineDb';

interface OnlineOrderRow {
  id: string;
  receipt_number: string;
  channel: string;
  order_type: string;
  external_order_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  platform_commission: number;
  total_amount: number;
  created_at: string;
}

interface ChannelOption {
  code: string;
  name: string;
  default_type: 'delivery' | 'takeaway';
}

const DEFAULT_CHANNELS: ChannelOption[] = [
  { code: 'website', name: 'Website', default_type: 'delivery' },
  { code: 'whatsapp', name: 'WhatsApp', default_type: 'delivery' },
  { code: 'foodpanda', name: 'Foodpanda', default_type: 'delivery' },
  { code: 'thespfood', name: 'The SP Food', default_type: 'delivery' },
  { code: 'other_app', name: 'Other App', default_type: 'delivery' },
  { code: 'phone', name: 'Phone', default_type: 'delivery' },
];

const NEXT_STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'completed',
];

function normalizeChannelCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function createLocalUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `onl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function OnlineOrdersDeskPage() {
  const [orders, setOrders] = useState<OnlineOrderRow[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>(DEFAULT_CHANNELS);
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showAddPlatform, setShowAddPlatform] = useState<boolean>(false);
  const [newPlatformName, setNewPlatformName] = useState<string>('');
  const [savingPlatform, setSavingPlatform] = useState<boolean>(false);

  const [channel, setChannel] = useState<string>('foodpanda');
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [externalOrderId, setExternalOrderId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [itemSummaryName, setItemSummaryName] = useState<string>('');
  const [orderAmount, setOrderAmount] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [commission, setCommission] = useState<string>('0');
  const [saving, setSaving] = useState<boolean>(false);

  const loadChannels = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const { data, error } = await supabase
      .from('order_channels')
      .select('code, name, default_type')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      setChannels(data as ChannelOption[]);
    }
  }, []);

  const loadOnlineOrders = useCallback(async () => {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    const localOnlineOrders = await offlineDb.local_orders
      .where('receipt_series')
      .equals('online')
      .toArray();

    if (isOnline) {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, receipt_number, channel, order_type, external_order_id, customer_name, customer_phone, delivery_address, status, payment_status, subtotal, delivery_fee, platform_commission, total_amount, created_at'
        )
        .eq('receipt_series', 'online')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFetchError(null);
        const cloudRows = data as OnlineOrderRow[];
        const cloudIds = new Set(cloudRows.map((r) => r.id));
        const unsyncedLocalAsRows: OnlineOrderRow[] = localOnlineOrders
          .filter((lo) => !cloudIds.has(lo.id))
          .map((lo) => ({
            id: lo.id,
            receipt_number: lo.receipt_number,
            channel: lo.channel,
            order_type: lo.order_type,
            external_order_id: lo.external_order_id || null,
            customer_name: lo.customer_name,
            customer_phone: lo.customer_phone || null,
            delivery_address: lo.delivery_address || null,
            status: lo.status,
            payment_status: lo.payment_status,
            subtotal: lo.subtotal,
            delivery_fee: lo.delivery_fee,
            platform_commission: lo.platform_commission,
            total_amount: lo.total_amount,
            created_at: lo.created_at,
          }));

        setOrders([...unsyncedLocalAsRows, ...cloudRows]);
        setLoading(false);
        return;
      }

      if (error) {
        setFetchError(error.message);
      }
    }

    const mappedLocal: OnlineOrderRow[] = localOnlineOrders
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((lo) => ({
        id: lo.id,
        receipt_number: lo.receipt_number,
        channel: lo.channel,
        order_type: lo.order_type,
        external_order_id: lo.external_order_id || null,
        customer_name: lo.customer_name,
        customer_phone: lo.customer_phone || null,
        delivery_address: lo.delivery_address || null,
        status: lo.status,
        payment_status: lo.payment_status,
        subtotal: lo.subtotal,
        delivery_fee: lo.delivery_fee,
        platform_commission: lo.platform_commission,
        total_amount: lo.total_amount,
        created_at: lo.created_at,
      }));
    setOrders(mappedLocal);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushSyncOutbox().then(() => {
        loadChannels();
        loadOnlineOrders();
      });
    } else {
      loadOnlineOrders();
    }

    const channelSub = supabase
      .channel('online-orders-desk-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOnlineOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [loadChannels, loadOnlineOrders]);

  const handleAddCustomPlatform = async () => {
    const code = normalizeChannelCode(newPlatformName);
    if (!code) return;

    setSavingPlatform(true);
    try {
      const { error } = await supabase
        .from('order_channels')
        .upsert(
          {
            code,
            name: newPlatformName.trim(),
            default_type: orderType,
            is_active: true,
          },
          { onConflict: 'code' }
        );

      if (error) throw error;

      setChannel(code);
      setNewPlatformName('');
      setShowAddPlatform(false);
      await loadChannels();
    } catch (err: any) {
      alert(err.message || 'Could not add platform');
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleCreateOnlineOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseSub = Number(orderAmount || 0);
    const delFee = Number(deliveryFee || 0);
    const comm = Number(commission || 0);
    if (!itemSummaryName.trim() || baseSub <= 0) return;

    setSaving(true);

    try {
      const isAggregator = !['website', 'whatsapp', 'phone'].includes(channel);
      const total = baseSub + delFee;
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

      if (isOnline) {
        const { data: inserted, error: ordErr } = await supabase
          .from('orders')
          .insert({
            receipt_series: 'online',
            channel,
            order_type: orderType,
            external_order_id: externalOrderId.trim() || null,
            customer_name: customerName.trim() || `${channel.toUpperCase()} Order`,
            customer_phone: customerPhone.trim() || null,
            delivery_address: deliveryAddress.trim() || null,
            status: 'confirmed',
            subtotal: baseSub,
            delivery_fee: delFee,
            platform_commission: comm,
            total_amount: total,
            payment_status: isAggregator ? 'paid' : 'unpaid',
            payment_method: isAggregator ? 'aggregator_payout' : 'cash',
            punched_by: 'Online Desk',
          })
          .select('id')
          .single();

        if (ordErr) throw ordErr;

        const { error: itemErr } = await supabase.from('order_items').insert({
          order_id: inserted.id,
          item_name: itemSummaryName.trim(),
          variant_name: channel.toUpperCase(),
          modifiers: [],
          kitchen_station: 'main',
          quantity: 1,
          unit_price: baseSub,
          modifiers_total: 0,
          punched_by: 'Online Desk',
        });

        if (itemErr) throw itemErr;
      } else {
        const localId = createLocalUuid();
        const nowIso = new Date().toISOString();
        const receiptNum = `ONL-OFF-${String(Date.now()).slice(-5)}`;
        const resolvedCustomer = customerName.trim() || `${channel.toUpperCase()} Order`;

        const localOrder: LocalOrderRecord = {
          id: localId,
          receipt_series: 'online',
          receipt_number: receiptNum,
          channel,
          order_type: orderType,
          table_id: null,
          table_label: null,
          customer_name: resolvedCustomer,
          customer_phone: customerPhone.trim() || null,
          delivery_address: deliveryAddress.trim() || null,
          external_order_id: externalOrderId.trim() || null,
          status: 'confirmed',
          payment_status: isAggregator ? 'paid' : 'unpaid',
          payment_method: isAggregator ? 'aggregator_payout' : 'cash',
          subtotal: baseSub,
          discount_amount: 0,
          service_charge: 0,
          delivery_fee: delFee,
          tax_amount: 0,
          platform_commission: comm,
          total_amount: total,
          punched_by: 'Online Desk (Offline)',
          opened_at: nowIso,
          created_at: nowIso,
          items: [
            {
              id: createLocalUuid(),
              item_name: itemSummaryName.trim(),
              variant_name: channel.toUpperCase(),
              kitchen_station: 'main',
              quantity: 1,
              unit_price: baseSub,
              line_total: baseSub,
              item_notes: null,
              kot_printed: false,
              kot_status: 'queued',
            },
          ],
        };

        await offlineDb.local_orders.put(localOrder);
        await offlineDb.sync_outbox.add({
          action_type: 'CREATE_ONLINE_ORDER',
          payload: {
            orderRow: {
              id: localId,
              receipt_series: 'online',
              channel,
              order_type: orderType,
              external_order_id: externalOrderId.trim() || null,
              customer_name: resolvedCustomer,
              customer_phone: customerPhone.trim() || null,
              delivery_address: deliveryAddress.trim() || null,
              status: 'confirmed',
              subtotal: baseSub,
              delivery_fee: delFee,
              platform_commission: comm,
              total_amount: total,
              payment_status: isAggregator ? 'paid' : 'unpaid',
              payment_method: isAggregator ? 'aggregator_payout' : 'cash',
              punched_by: 'Online Desk',
              created_at: nowIso,
            },
            itemRow: {
              order_id: localId,
              item_name: itemSummaryName.trim(),
              variant_name: channel.toUpperCase(),
              modifiers: [],
              kitchen_station: 'main',
              quantity: 1,
              unit_price: baseSub,
              modifiers_total: 0,
              punched_by: 'Online Desk',
            },
          },
          status: 'pending',
          created_at: nowIso,
        });
      }

      setExternalOrderId('');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setItemSummaryName('');
      setOrderAmount('');
      setDeliveryFee('0');
      setCommission('0');
      setShowNewModal(false);
      await loadOnlineOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to create online order');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    const localOrd = await offlineDb.local_orders.get(orderId);
    if (localOrd) {
      await offlineDb.local_orders.update(orderId, {
        status: nextStatus,
        payment_status: nextStatus === 'completed' ? 'paid' : localOrd.payment_status,
      });
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await supabase
        .from('orders')
        .update({
          status: nextStatus,
          payment_status: nextStatus === 'completed' ? 'paid' : undefined,
          closed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', orderId);
    }

    loadOnlineOrders();
  };

  const visibleOrders = orders.filter((o) => {
    const matchChan = channelFilter === 'ALL' || o.channel === channelFilter;
    const matchStat = statusFilter === 'ALL' || o.status === statusFilter;
    return matchChan && matchStat;
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Online &amp; Delivery Orders Desk (ONL-)
            </h1>
            <p className="text-xs text-slate-500">
              Manage Website, WhatsApp, Foodpanda, The SP Food &amp; Delivery orders with separate ONL- receipts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 text-emerald-400" />
          <span>Log Online / Platform Order</span>
        </button>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          Database Error: {fetchError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setChannelFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${
              channelFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Channels
          </button>

          {channels.map((ch) => (
            <button
              key={ch.code}
              type="button"
              onClick={() => setChannelFilter(ch.code)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${
                channelFilter === ch.code
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
        >
          <option value="ALL">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading online orders...</div>
        ) : visibleOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No online orders match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Customer / Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.map((ord) => {
                  const currentIdx = NEXT_STATUS_FLOW.indexOf(ord.status);
                  const nextStatus =
                    currentIdx >= 0 && currentIdx < NEXT_STATUS_FLOW.length - 1
                      ? NEXT_STATUS_FLOW[currentIdx + 1]
                      : null;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {ord.receipt_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-800">
                          {ord.channel.replace('_', ' ')} • {ord.order_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {ord.customer_name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ord.external_order_id ? `Ref: ${ord.external_order_id} • ` : ''}
                          {ord.customer_phone || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-800">
                          <Truck className="h-3 w-3 text-emerald-600" />
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        Rs. {Number(ord.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {nextStatus && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, nextStatus)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark {nextStatus.replace('_', ' ')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `/print/kot/${ord.id}`,
                                '_blank',
                                'width=380,height=600'
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            <ChefHat className="h-3 w-3" />
                            <span>KOT</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `/print/online/${ord.id}`,
                                '_blank',
                                'width=380,height=650'
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
                          >
                            <Printer className="h-3 w-3" />
                            <span>ONL Receipt</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Log Online / Platform Order
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOnlineOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">Source Channel</label>
                    <button
                      type="button"
                      onClick={() => setShowAddPlatform((prev) => !prev)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      {showAddPlatform ? 'Cancel' : '+ New Platform'}
                    </button>
                  </div>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 font-semibold"
                  >
                    {channels.map((ch) => (
                      <option key={ch.code} value={ch.code}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Fulfillment</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as 'delivery' | 'takeaway')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 font-semibold"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="takeaway">Takeaway</option>
                  </select>
                </div>
              </div>

              {showAddPlatform && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                  <input
                    type="text"
                    placeholder="e.g. The SP Food or bykea"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={savingPlatform || !newPlatformName.trim()}
                    onClick={handleAddCustomPlatform}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingPlatform ? 'Adding...' : 'Save'}
                  </button>
                </div>
              )}

              <input
                type="text"
                placeholder="Platform / App Order ID (optional)"
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="tel"
                  placeholder="Customer Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <input
                type="text"
                placeholder="Delivery Address (if delivery)"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />

              <input
                required
                type="text"
                placeholder="Items Summary (e.g. 1x Chicken Karahi Full, 4x Naan) *"
                value={itemSummaryName}
                onChange={(e) => setItemSummaryName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700">Items Subtotal *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    placeholder="1850"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">Delivery Fee</label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">App Commission</label>
                  <input
                    type="number"
                    min={0}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700"
              >
                {saving ? 'Saving...' : 'Create Online Order (ONL-)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}