'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  UtensilsCrossed,
  Globe,
  Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KitchenItem {
  id: string;
  item_name: string;
  variant_name: string | null;
  kitchen_station: string;
  quantity: number;
  item_notes: string | null;
  kot_status: 'queued' | 'preparing' | 'ready' | 'served' | 'cancelled';
  created_at: string;
}

interface KitchenTicket {
  id: string;
  receipt_series: 'dine_in' | 'online';
  receipt_number: string;
  channel: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  table_label: string | null;
  customer_name: string | null;
  external_order_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  order_items: KitchenItem[];
}

export default function KitchenDisplayPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [nowTick, setNowTick] = useState<number>(0);
  const prevCountRef = useRef<number>(0);

  // Simple Web Audio chime for new incoming tickets
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Ignore autoplay restrictions before first user click
    }
  }, [soundEnabled]);

  const loadKitchenTickets = useCallback(async () => {
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
        notes,
        created_at,
        order_items (
          id,
          item_name,
          variant_name,
          kitchen_station,
          quantity,
          item_notes,
          kot_status,
          created_at
        )
      `)
      .in('status', ['open', 'pending', 'confirmed', 'preparing'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      const activeTickets = (data as unknown as KitchenTicket[]).filter((t) =>
        (t.order_items || []).some((i) => i.kot_status !== 'cancelled' && i.kot_status !== 'served')
      );

      if (prevCountRef.current > 0 && activeTickets.length > prevCountRef.current) {
        playChime();
      }
      prevCountRef.current = activeTickets.length;
      setTickets(activeTickets);
    }
    setLoading(false);
  }, [playChime]);

  useEffect(() => {
    loadKitchenTickets();

    setNowTick(Date.now());
    const timer = setInterval(() => setNowTick(Date.now()), 15000);

    const channel = supabase
      .channel('khaasdaan-kds-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadKitchenTickets()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => loadKitchenTickets()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadKitchenTickets]);

  const cycleItemStatus = async (item: KitchenItem, ticketId: string) => {
    const nextMap: Record<string, KitchenItem['kot_status']> = {
      queued: 'preparing',
      preparing: 'ready',
      ready: 'served',
      served: 'queued',
    };
    const nextStatus = nextMap[item.kot_status] || 'preparing';

    await supabase
      .from('order_items')
      .update({ kot_status: nextStatus })
      .eq('id', item.id);

    if (nextStatus === 'preparing') {
      await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', ticketId)
        .in('status', ['pending', 'confirmed']);
    }

    loadKitchenTickets();
  };

  const bumpEntireTicketReady = async (ticket: KitchenTicket) => {
    const activeItemIds = ticket.order_items
      .filter((i) => i.kot_status !== 'cancelled')
      .map((i) => i.id);

    if (activeItemIds.length > 0) {
      await supabase
        .from('order_items')
        .update({ kot_status: ticket.receipt_series === 'dine_in' ? 'served' : 'ready' })
        .in('id', activeItemIds);
    }

    if (ticket.receipt_series === 'online') {
      await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', ticket.id);
    }

    loadKitchenTickets();
  };

  const getElapsedMinutes = (iso: string) => {
    if (!nowTick) return 0;
    const diff = Math.max(0, nowTick - new Date(iso).getTime());
    return Math.floor(diff / 60000);
  };

  const filteredTickets = tickets
    .filter((t) => {
      if (typeFilter === 'DINE_IN') return t.order_type === 'dine_in';
      if (typeFilter === 'ONLINE') return t.order_type === 'delivery';
      if (typeFilter === 'TAKEAWAY') return t.order_type === 'takeaway';
      return true;
    })
    .map((t) => ({
      ...t,
      order_items: t.order_items.filter(
        (i) =>
          i.kot_status !== 'cancelled' &&
          (stationFilter === 'ALL' || i.kitchen_station === stationFilter)
      ),
    }))
    .filter((t) => t.order_items.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100 space-y-5">
      {/* KDS Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-wide text-white">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-slate-400">
              Live Dine-In (DIN-) &amp; Online / Takeaway (ONL-) preparation queue
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold ${
              soundEnabled
                ? 'border-emerald-700 bg-emerald-950 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={loadKitchenTickets}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Station & Order Mode Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All Stations' },
            { id: 'main', label: 'Main Kitchen' },
            { id: 'grill', label: 'BBQ / Grill' },
            { id: 'fryer', label: 'Fryer / Fast Food' },
            { id: 'drinks', label: 'Beverages' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStationFilter(st.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                stationFilter === st.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: `All (${tickets.length})` },
            { id: 'DINE_IN', label: 'Dine-In' },
            { id: 'ONLINE', label: 'Online Delivery' },
            { id: 'TAKEAWAY', label: 'Takeaway' },
          ].map((tp) => (
            <button
              key={tp.id}
              type="button"
              onClick={() => setTypeFilter(tp.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                typeFilter === tp.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Tickets Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Loading kitchen tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 py-16 text-center">
          <ChefHat className="mx-auto mb-2 h-8 w-8 text-slate-600" />
          <p className="text-sm font-bold text-slate-300">Kitchen Queue Clear</p>
          <p className="mt-1 text-xs text-slate-500">
            New Dine-In punches and Online orders will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTickets.map((ticket) => {
            const mins = getElapsedMinutes(ticket.created_at);
            const isDelayed = mins >= 15;
            const isDineIn = ticket.receipt_series === 'dine_in';

            return (
              <div
                key={ticket.id}
                className={`flex flex-col justify-between rounded-xl border-2 bg-slate-900 p-4 shadow-lg ${
                  isDelayed
                    ? 'border-rose-500'
                    : isDineIn
                    ? 'border-amber-500/70'
                    : 'border-emerald-500/70'
                }`}
              >
                <div>
                  {/* Ticket Top Banner */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          isDineIn
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isDineIn ? (
                          <>
                            <UtensilsCrossed className="h-3 w-3" /> Dine-In
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />{' '}
                            {ticket.order_type === 'takeaway'
                              ? 'Takeaway'
                              : ticket.channel.toUpperCase()}
                          </>
                        )}
                      </span>
                      <div className="mt-1 font-mono text-sm font-extrabold text-white">
                        {ticket.receipt_number}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/print/kot/${ticket.id}?reprint=1`,
                            '_blank',
                            'width=380,height=600'
                          )
                        }
                        title="Print Hard-Copy KOT"
                        className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      <div
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                          isDelayed
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{mins}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Table or Customer Header */}
                  <div className="mt-2 rounded-lg bg-slate-950/70 px-2.5 py-1.5 text-xs">
                    {isDineIn ? (
                      <span className="font-bold text-amber-300">
                        {ticket.table_label || 'Table Order'}
                      </span>
                    ) : (
                      <div className="font-bold text-emerald-300">
                        {ticket.customer_name || 'Online Guest'}
                        {ticket.external_order_id ? ` • #${ticket.external_order_id}` : ''}
                      </div>
                    )}
                    {ticket.notes && (
                      <div className="mt-0.5 text-[11px] text-rose-300">
                        Order Note: {ticket.notes}
                      </div>
                    )}
                  </div>

                  {/* Ticket Line Items */}
                  <div className="mt-3 space-y-2">
                    {ticket.order_items.map((item) => {
                      const statusPill: Record<string, string> = {
                        queued: 'bg-slate-800 text-slate-300 border-slate-700',
                        preparing: 'bg-amber-950 text-amber-300 border-amber-700',
                        ready: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                        served: 'bg-slate-800/50 text-slate-500 border-slate-800 line-through',
                      };

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => cycleItemStatus(item, ticket.id)}
                          className={`w-full rounded-lg border p-2.5 text-left transition hover:brightness-110 ${
                            statusPill[item.kot_status] || statusPill.queued
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold">
                              {item.quantity}× {item.item_name}
                              {item.variant_name ? ` (${item.variant_name})` : ''}
                            </span>
                            <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                              {item.kot_status}
                            </span>
                          </div>
                          {item.item_notes && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                              <Flame className="h-3 w-3 shrink-0" />
                              <span>{item.item_notes}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bump Full Ticket Button */}
                <button
                  type="button"
                  onClick={() => bumpEntireTicketReady(ticket)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isDineIn ? 'Mark All Served' : 'Mark Order Ready'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}