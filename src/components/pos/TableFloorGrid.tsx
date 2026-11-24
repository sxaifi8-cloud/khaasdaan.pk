'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ArrowRightLeft,
  Printer,
  PlusCircle,
  UtensilsCrossed,
  Plus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ShiftTableModal, { RestaurantTable } from './ShiftTableModal';

interface TableWithOrder extends RestaurantTable {
  orders?: {
    id: string;
    receipt_number: string;
    total_amount: number;
    opened_at: string;
  } | null;
}

export default function TableFloorGrid({ staffName = 'Cashier' }: { staffName?: string }) {
  const router = useRouter();
  const [tables, setTables] = useState<TableWithOrder[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [shiftSourceTable, setShiftSourceTable] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Table Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('Main Hall');
  const [newCapacity, setNewCapacity] = useState(4);
  const [savingTable, setSavingTable] = useState(false);

  const fetchTables = useCallback(async () => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select(`
        id,
        table_number,
        table_name,
        floor_area,
        capacity,
        status,
        active_order_id,
        orders:active_order_id (
          id,
          receipt_number,
          total_amount,
          opened_at
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTables(data as unknown as TableWithOrder[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel('pos-tables-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables' },
        () => fetchTables()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchTables()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !newName.trim()) return;
    setSavingTable(true);

    const { error } = await supabase.from('restaurant_tables').insert({
      table_number: newNumber.trim().toUpperCase(),
      table_name: newName.trim(),
      floor_area: newArea.trim() || 'Main Hall',
      capacity: newCapacity,
      sort_order: tables.length + 1,
    });

    setSavingTable(false);
    if (!error) {
      setNewNumber('');
      setNewName('');
      setShowAddModal(false);
      fetchTables();
    } else {
      alert(error.message);
    }
  };

  const areas = ['ALL', ...Array.from(new Set(tables.map((t) => t.floor_area || 'Main Hall')))];
  const filteredTables =
    selectedArea === 'ALL'
      ? tables
      : tables.filter((t) => (t.floor_area || 'Main Hall') === selectedArea);

  const statusStyles: Record<string, string> = {
    available: 'border-emerald-300 bg-white hover:border-emerald-500',
    occupied: 'border-rose-400 bg-rose-50/70 hover:border-rose-600',
    bill_requested: 'border-amber-400 bg-amber-50 hover:border-amber-600',
    reserved: 'border-indigo-300 bg-indigo-50/60 hover:border-indigo-500',
  };

  const badgeStyles: Record<string, string> = {
    available: 'bg-emerald-600 text-white',
    occupied: 'bg-rose-600 text-white',
    bill_requested: 'bg-amber-600 text-white',
    reserved: 'bg-indigo-600 text-white',
  };

  return (
    <div className="space-y-5">
      {/* Header & Area Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Dine-In Table Floor
            </h1>
            <p className="text-xs text-slate-500">
              Select a table to punch items, shift tables, or print DIN- receipts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                selectedArea === area
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {area === 'ALL' ? `All Tables (${tables.length})` : area}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading tables...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filteredTables.map((table) => {
            const isOccupied = Boolean(table.active_order_id);
            return (
              <div
                key={table.id}
                className={`flex flex-col justify-between rounded-xl border-2 p-4 shadow-2xs transition ${
                  statusStyles[table.status] || statusStyles.available
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-lg font-extrabold text-slate-900">
                      {table.table_number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        badgeStyles[table.status] || badgeStyles.available
                      }`}
                    >
                      {table.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs font-semibold text-slate-700">
                    {table.table_name}
                  </p>
                  <p className="text-[11px] text-slate-400">{table.floor_area}</p>

                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{table.capacity} Seats</span>
                  </div>

                  {isOccupied && table.orders && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-white p-2.5">
                      <div className="font-mono text-[11px] font-bold text-rose-700">
                        {table.orders.receipt_number}
                      </div>
                      <div className="text-base font-extrabold text-slate-900">
                        Rs. {Number(table.orders.total_amount).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/pos/punch?tableId=${table.id}`)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span>{isOccupied ? 'Add Items / Settle' : 'Punch Order'}</span>
                  </button>

                  {isOccupied && table.active_order_id && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShiftSourceTable(table)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-amber-400 bg-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>Shift</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/print/dine-in/${table.active_order_id}`,
                            '_blank',
                            'width=380,height=650'
                          )
                        }
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shift Table Modal */}
      <ShiftTableModal
        isOpen={Boolean(shiftSourceTable)}
        sourceTable={shiftSourceTable}
        allTables={tables}
        staffName={staffName}
        onClose={() => setShiftSourceTable(null)}
        onSuccess={fetchTables}
      />

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">Add New Table</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddTable} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Table Code (e.g. T-05, VIP-1)
                </label>
                <input
                  required
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="T-05"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Table Name
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Table 5"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Floor / Hall</label>
                  <input
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Main Hall"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Seats</label>
                  <input
                    type="number"
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingTable}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                {savingTable ? 'Saving...' : 'Save Table'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}