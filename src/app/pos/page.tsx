'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Globe,
  ChefHat,
  BarChart3,
  ShieldCheck,
  Store,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Plus,
  Receipt,
  Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardMetrics {
  occupiedTables: number;
  totalTables: number;
  activeOnlineOrders: number;
  kitchenPending: number;
  todayDineInSales: number;
  todayOnlineSales: number;
}

interface RecentOrder {
  id: string;
  receipt_number: string;
  receipt_series: 'dine_in' | 'online';
  channel: string;
  table_label: string | null;
  customer_name: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function PosCommandCenterPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    occupiedTables: 0,
    totalTables: 0,
    activeOnlineOrders: 0,
    kitchenPending: 0,
    todayDineInSales: 0,
    todayOnlineSales: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [tablesRes, ordersRes] = await Promise.all([
        supabase.from('restaurant_tables').select('id, status').eq('is_active', true),
        supabase
          .from('orders')
          .select(
            'id, receipt_number, receipt_series, channel, table_label, customer_name, status, payment_status, total_amount, created_at'
          )
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false }),
      ]);

      const tables = tablesRes.data || [];
      const orders = ordersRes.data || [];

      const occupiedTables = tables.filter(
        (t) => t.status !== 'available' && t.status !== 'free'
      ).length;
      const activeOnlineOrders = orders.filter(
        (o) =>
          o.receipt_series === 'online' &&
          !['completed', 'cancelled'].includes(o.status)
      ).length;
      const kitchenPending = orders.filter((o) =>
        ['open', 'pending', 'confirmed', 'preparing'].includes(o.status)
      ).length;

      const todayDineInSales = orders
        .filter((o) => o.receipt_series === 'dine_in' && o.payment_status === 'paid')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const todayOnlineSales = orders
        .filter((o) => o.receipt_series === 'online' && o.payment_status === 'paid')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      setMetrics({
        occupiedTables,
        totalTables: tables.length,
        activeOnlineOrders,
        kitchenPending,
        todayDineInSales,
        todayOnlineSales,
      });

      setRecentOrders(orders.slice(0, 6) as RecentOrder[]);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    const channel = supabase
      .channel('pos-command-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () =>
        loadDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      clearInterval(clockInterval);
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  const modules = [
    {
      title: 'Dine-In Table Floor',
      subtitle: 'Table-wise punching, table shifting & DIN- billing',
      href: '/pos/tables',
      icon: UtensilsCrossed,
      accent: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: `${metrics.occupiedTables}/${metrics.totalTables} Active`,
      shortcut: 'F1',
    },
    {
      title: 'Online & Delivery Desk',
      subtitle: 'Website, WhatsApp & Foodpanda orders (ONL- series)',
      href: '/pos/online',
      icon: Globe,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: `${metrics.activeOnlineOrders} Live`,
      shortcut: 'F2',
    },
    {
      title: 'Kitchen Display (KDS)',
      subtitle: 'Real-time station tickets & prep status progression',
      href: '/kitchen',
      icon: ChefHat,
      accent: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: `${metrics.kitchenPending} In Queue`,
      shortcut: 'F3',
    },
    {
      title: 'Menu, Variants & Deals',
      subtitle: 'Product photos, sizes, add-ons, combos & stock toggle',
      href: '/admin/menu',
      icon: Layers,
      accent: 'text-sky-600 bg-sky-50 border-sky-200',
      badge: 'Catalog',
      shortcut: 'F4',
    },
    {
      title: 'Sales & Financial Reports',
      subtitle: 'Separate Dine-In vs. Online, Foodpanda & Tax ledgers',
      href: '/admin/reports',
      icon: BarChart3,
      accent: 'text-violet-600 bg-violet-50 border-violet-200',
      badge: 'Audit Ready',
      shortcut: 'F5',
    },
    {
      title: 'Role Settings & PINs',
      subtitle: 'Manage staff accounts, roles & 4–6 digit login PINs',
      href: '/admin/settings',
      icon: ShieldCheck,
      accent: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: 'Staff PINs',
      shortcut: 'F6',
    },
    {
      title: 'Public Website (khaasdaan.pk)',
      subtitle: 'Live customer ordering storefront & menu preview',
      href: '/',
      icon: Store,
      accent: 'text-slate-700 bg-slate-100 border-slate-300',
      badge: 'khaasdaan.pk',
      shortcut: 'F7',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Enterprise Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-3.5 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-black text-amber-400 text-lg">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  KHAASDAAN POS
                </h1>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                  khaasdaan.pk
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Main Branch • Unified Dine-In &amp; Multi-Channel Dispatch Terminal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span>{connected ? 'Supabase Realtime Synced' : 'Offline'}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{currentTime || '--:--:--'}</span>
            </div>

            <Link
              href="/pos/tables"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              <span>Open POS Floor</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
        {/* Live KPI Strip */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Occupied Tables
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">
                {metrics.occupiedTables}{' '}
                <span className="text-sm font-medium text-slate-400">
                  / {metrics.totalTables}
                </span>
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                Dine-In
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Online Orders
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">
                {metrics.activeOnlineOrders}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                ONL- Queue
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today Dine-In Settled
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">
                Rs. {metrics.todayDineInSales.toLocaleString()}
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                DIN-
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today Online Settled
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">
                Rs. {metrics.todayOnlineSales.toLocaleString()}
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                ONL-
              </span>
            </div>
          </div>
        </section>

        {/* Terminal Modules Grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Terminal Modules
            </h2>
            <span className="text-xs text-slate-400">
              Click any module to launch workspace
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${mod.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {mod.badge}
                        </span>
                        <span className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                          {mod.shortcut}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 flex items-center justify-between text-base font-bold text-slate-900">
                      <span>{mod.title}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-900" />
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {mod.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Live Today's Orders Feed (Dine-In DIN- vs Online ONL-) */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Recent Orders Today (Live Stream)
              </h2>
            </div>
            <Link
              href="/admin/reports"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              View Full Ledger →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No orders punched today yet. Open <strong>Dine-In Table Floor</strong> or{' '}
              <strong>Online &amp; Delivery Desk</strong> to create your first order.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5">Receipt #</th>
                    <th className="px-5 py-2.5">Series</th>
                    <th className="px-5 py-2.5">Table / Customer</th>
                    <th className="px-5 py-2.5">Channel</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {order.receipt_number}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            order.receipt_series === 'dine_in'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {order.receipt_series === 'dine_in' ? 'Dine-In' : 'Online'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {order.table_label || order.customer_name || 'Walk-In / Guest'}
                      </td>
                      <td className="px-5 py-3 uppercase text-slate-500">
                        {order.channel.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold capitalize text-slate-700">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">
                        Rs. {Number(order.total_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}