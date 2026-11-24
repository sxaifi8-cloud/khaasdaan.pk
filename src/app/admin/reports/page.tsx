'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
  RefreshCw,
  UtensilsCrossed,
  Globe,
  Wallet,
  Percent,
  Calendar,
  Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReportOrderRow {
  id: string;
  receipt_series: 'dine_in' | 'online';
  receipt_number: string;
  channel: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  table_label: string | null;
  customer_name: string | null;
  external_order_id: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  discount_amount: number;
  service_charge: number;
  delivery_fee: number;
  tax_amount: number;
  platform_commission: number;
  total_amount: number;
  created_at: string;
  closed_at: string | null;
}

type DatePreset = 'today' | 'yesterday' | '7d' | 'month' | 'all' | 'custom';

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<ReportOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [seriesFilter, setSeriesFilter] = useState<'ALL' | 'dine_in' | 'online' | 'takeaway'>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
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
        status,
        payment_status,
        payment_method,
        subtotal,
        discount_amount,
        service_charge,
        delivery_fee,
        tax_amount,
        platform_commission,
        total_amount,
        created_at,
        closed_at
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else if (data) {
      setOrders(data as ReportOrderRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const todayStr = toInputDate(new Date());
    setStartDate(todayStr);
    setEndDate(todayStr);
    loadOrders();
  }, [loadOrders]);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = toInputDate(now);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toInputDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      setStartDate(toInputDate(s));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toInputDate(firstOfMonth));
      setEndDate(todayStr);
    }
  };

  const availableChannels = useMemo(() => {
    const set = new Set<string>([
      'pos_table',
      'website',
      'whatsapp',
      'foodpanda',
      'thespfood',
      'other_app',
      'phone',
    ]);
    orders.forEach((o) => {
      if (o.channel) set.add(o.channel);
    });
    return ['ALL', ...Array.from(set)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (seriesFilter === 'dine_in' && ord.receipt_series !== 'dine_in') return false;
      if (
        seriesFilter === 'online' &&
        !(ord.receipt_series === 'online' && ord.order_type !== 'takeaway')
      ) {
        return false;
      }
      if (seriesFilter === 'takeaway' && ord.order_type !== 'takeaway') return false;

      if (channelFilter !== 'ALL' && ord.channel !== channelFilter) return false;
      if (paymentFilter !== 'ALL' && ord.payment_status !== paymentFilter) return false;

      if (datePreset !== 'all') {
        const ordLocalDate = toInputDate(new Date(ord.created_at));
        if (startDate && ordLocalDate < startDate) return false;
        if (endDate && ordLocalDate > endDate) return false;
      }

      return true;
    });
  }, [orders, seriesFilter, channelFilter, paymentFilter, datePreset, startDate, endDate]);

  const summary = useMemo(() => {
    let grossTotal = 0;
    let dineInTotal = 0;
    let onlineTotal = 0;
    let discountsTotal = 0;
    let commissionsTotal = 0;
    const byChannel: Record<string, { count: number; revenue: number; commission: number }> = {};

    for (const o of filteredOrders) {
      const amt = Number(o.total_amount || 0);
      const disc = Number(o.discount_amount || 0);
      const comm = Number(o.platform_commission || 0);

      grossTotal += amt;
      discountsTotal += disc;
      commissionsTotal += comm;

      if (o.receipt_series === 'dine_in') {
        dineInTotal += amt;
      } else {
        onlineTotal += amt;
      }

      const ch = o.channel || 'other';
      if (!byChannel[ch]) {
        byChannel[ch] = { count: 0, revenue: 0, commission: 0 };
      }
      byChannel[ch].count += 1;
      byChannel[ch].revenue += amt;
      byChannel[ch].commission += comm;
    }

    const netAfterCommission = grossTotal - commissionsTotal;

    return {
      orderCount: filteredOrders.length,
      grossTotal,
      dineInTotal,
      onlineTotal,
      discountsTotal,
      commissionsTotal,
      netAfterCommission,
      byChannel,
    };
  }, [filteredOrders]);

  const handleExportCsv = () => {
    const headers = [
      'Receipt Number',
      'Series',
      'Channel',
      'Order Type',
      'Table / Customer',
      'Status',
      'Payment Status',
      'Subtotal',
      'Discount',
      'Delivery Fee',
      'Commission',
      'Total Amount',
      'Created At',
    ];

    const rows = filteredOrders.map((o) => [
      o.receipt_number,
      o.receipt_series,
      o.channel,
      o.order_type,
      o.receipt_series === 'dine_in' ? o.table_label || '' : o.customer_name || '',
      o.status,
      o.payment_status,
      o.subtotal,
      o.discount_amount,
      o.delivery_fee,
      o.platform_commission,
      o.total_amount,
      o.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((r) => r.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const exportStamp = toInputDate(new Date());
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khaasdaan-sales-report-${exportStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Sales &amp; Financial Reports
            </h1>
            <p className="text-xs text-slate-500">
              Filter revenue by Dine-In (DIN-) vs. Online (ONL-), platform channel, and date range
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'dine_in', label: 'Dine-In (DIN-)' },
              { id: 'online', label: 'Online Delivery (ONL-)' },
              { id: 'takeaway', label: 'Takeaway / Collection' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSeriesFilter(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  seriesFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-800"
            >
              <option value="ALL">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid / Pending</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold uppercase text-slate-800"
            >
              {availableChannels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === 'ALL' ? 'All Channels' : ch.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7d', label: '7 Days' },
                { id: 'month', label: 'This Month' },
              ] as { id: DatePreset; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  datePreset === p.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Gross Filtered Sales</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            Rs. {summary.grossTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.orderCount} orders • Net after app fees: Rs.{' '}
            {summary.netAfterCommission.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Dine-In Revenue (DIN-)</span>
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            Rs. {summary.dineInTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Table orders</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Online &amp; Takeaway (ONL-)</span>
            <Globe className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            Rs. {summary.onlineTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Website, WhatsApp, Foodpanda &amp; Delivery
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Discounts &amp; App Fees</span>
            <Percent className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            Rs. {(summary.discountsTotal + summary.commissionsTotal).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Disc: Rs. {summary.discountsTotal.toLocaleString()} • Comm: Rs.{' '}
            {summary.commissionsTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Channel Breakdown Strip */}
      {Object.keys(summary.byChannel).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-3">
            Channel Breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(summary.byChannel).map(([ch, stat]) => (
              <div
                key={ch}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-slate-800">
                    {ch.replace('_', ' ')}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {stat.count} orders
                  </span>
                </div>
                <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                  Rs. {stat.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Orders Ledger */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading financial ledger...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No orders match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Table / Customer</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const isDineIn = ord.receipt_series === 'dine_in';
                  const printPath = isDineIn
                    ? `/print/dine-in/${ord.id}`
                    : `/print/online/${ord.id}`;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {ord.receipt_number}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            isDineIn
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ord.channel.replace('_', ' ')} • {ord.order_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {isDineIn
                          ? ord.table_label || 'Dine-In Table'
                          : ord.customer_name || 'Online Guest'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        Rs. {Number(ord.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(printPath, '_blank', 'width=380,height=650')
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}