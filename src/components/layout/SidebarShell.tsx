'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  PlusCircle,
  Globe,
  ChefHat,
  Layers,
  BarChart3,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Command Center', href: '/', icon: LayoutDashboard },
  { label: 'Dine-In Tables', href: '/pos/tables', icon: UtensilsCrossed },
  { label: 'Table Order Punch', href: '/pos/punch', icon: PlusCircle },
  { label: 'Online & Foodpanda', href: '/pos/online', icon: Globe },
  { label: 'Kitchen Display (KDS)', href: '/kitchen', icon: ChefHat },
  { label: 'Menu, Variants & Deals', href: '/admin/menu', icon: Layers },
  { label: 'Sales & Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Customer Website', href: '/order', icon: Store },
];

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keyboard shortcut: Ctrl + B toggles the sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hide sidebar completely on 80mm thermal print routes
  if (pathname?.startsWith('/print')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Left Navigation Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950 text-slate-200 transition-all duration-200 lg:static ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header + Hide/Collapse Button */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-3.5">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 font-black text-slate-950">
                K
              </div>
              <div className="truncate">
                <div className="text-sm font-extrabold tracking-wide text-white">
                  KHAASDAAN
                </div>
                <div className="text-[10px] font-medium text-slate-400">
                  khaasdaan.pk POS
                </div>
              </div>
            </Link>
          )}

          {/* Desktop Collapse / Hide Bar Button */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Hide Sidebar (Ctrl+B)'}
            className={`hidden lg:flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition ${
              collapsed ? 'mx-auto' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-amber-400" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Hide Bar Button & Shortcut Hint */}
        <div className="border-t border-slate-800 p-2.5">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className={`hidden lg:flex w-full items-center gap-2.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition ${
              collapsed ? 'justify-center px-2' : 'justify-between'
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-amber-400" />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <PanelLeftClose className="h-4 w-4" />
                  <span>Hide Sidebar</span>
                </span>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                  Ctrl+B
                </kbd>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar Toggle */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
          <span className="text-xs font-extrabold tracking-wide text-slate-900">
            KHAASDAAN.PK
          </span>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}