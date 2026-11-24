'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface RestaurantTable {
  id: string;
  table_number: string;
  table_name: string;
  floor_area: string;
  capacity: number;
  status: 'available' | 'occupied' | 'bill_requested' | 'reserved';
  active_order_id: string | null;
}

interface ShiftTableModalProps {
  isOpen: boolean;
  sourceTable: RestaurantTable | null;
  allTables: RestaurantTable[];
  staffName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShiftTableModal({
  isOpen,
  sourceTable,
  allTables,
  staffName,
  onClose,
  onSuccess,
}: ShiftTableModalProps) {
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [allowMerge, setAllowMerge] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !sourceTable) return null;

  const candidateTables = allTables.filter((t) => t.id !== sourceTable.id);
  const selectedTarget = candidateTables.find((t) => t.id === targetTableId);
  const targetIsOccupied = Boolean(selectedTarget?.active_order_id);

  const handleShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      setErrorMsg('Please select a destination table.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.rpc('shift_table_order', {
      p_from_table_id: sourceTable.id,
      p_to_table_id: targetTableId,
      p_shifted_by: staffName || 'Cashier',
      p_reason: reason.trim() || null,
      p_allow_merge: targetIsOccupied ? allowMerge : false,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setTargetTableId('');
    setReason('');
    setAllowMerge(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Shift Table Order
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleShift} className="mt-4 space-y-4">
          <div className="rounded-lg bg-slate-100 p-3 text-sm">
            <span className="text-slate-500">Moving from: </span>
            <strong className="text-slate-900">
              {sourceTable.table_number} — {sourceTable.table_name} ({sourceTable.floor_area})
            </strong>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Destination Table
            </label>
            <select
              value={targetTableId}
              onChange={(e) => {
                setTargetTableId(e.target.value);
                setAllowMerge(false);
                setErrorMsg(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">-- Select Target Table --</option>
              {candidateTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.table_number} ({table.table_name}) —{' '}
                  {table.active_order_id ? 'OCCUPIED' : 'AVAILABLE'}
                </option>
              ))}
            </select>
          </div>

          {targetIsOccupied && (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Target table already has an active bill!</span>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowMerge}
                  onChange={(e) => setAllowMerge(e.target.checked)}
                  className="rounded border-amber-400"
                />
                <span>
                  Merge items into {selectedTarget?.table_number}&apos;s active bill
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Guest moved to Family Hall"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (targetIsOccupied && !allowMerge)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Shifting...' : 'Confirm Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}