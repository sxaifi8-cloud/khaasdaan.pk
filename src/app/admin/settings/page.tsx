'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen';

interface StaffUserRow {
  id: string;
  full_name: string;
  role: StaffRole | string;
  pin_code: string;
  assigned_station: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner (Full Access)',
  manager: 'Manager (Reports & Menu)',
  cashier: 'Cashier (Tables, Punch & Online)',
  kitchen: 'Kitchen Staff (KDS & KOT)',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-900 border-amber-300',
  manager: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  cashier: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  kitchen: 'bg-sky-100 text-sky-900 border-sky-300',
};

function generateRandomPin(length = 4): string {
  let pin = '';
  for (let i = 0; i < length; i += 1) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

export default function AdminSettingsPage() {
  const [staffList, setStaffList] = useState<StaffUserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit mode state (null = creating new staff member)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [pinCode, setPinCode] = useState<string>('');
  const [assignedStation, setAssignedStation] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Toggle PIN visibility per row
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('staff_users')
      .select('id, full_name, role, pin_code, assigned_station, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else if (data) {
      setStaffList(data as StaffUserRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setRole('cashier');
    setPinCode('');
    setAssignedStation('');
    setIsActive(true);
  };

  const startEditStaff = (member: StaffUserRow) => {
    setEditingId(member.id);
    setFullName(member.full_name);
    setRole((member.role as StaffRole) || 'cashier');
    setPinCode(member.pin_code || '');
    setAssignedStation(member.assigned_station || '');
    setIsActive(Boolean(member.is_active));
    setFeedback(`Editing staff profile for "${member.full_name}".`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanPin = pinCode.trim();

    if (!cleanName) return;
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setErrorMsg('PIN must be 4 to 6 digits (e.g. 1234 or 5829).');
      return;
    }

    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      const payload = {
        full_name: cleanName,
        role,
        pin_code: cleanPin,
        assigned_station: assignedStation.trim() || null,
        is_active: isActive,
      };

      if (editingId) {
        const { error } = await supabase
          .from('staff_users')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setFeedback(`Updated "${cleanName}" (${ROLE_LABELS[role] || role}).`);
      } else {
        const { error } = await supabase.from('staff_users').insert(payload);
        if (error) throw error;
        setFeedback(`Added "${cleanName}" with PIN access.`);
      }

      resetForm();
      await loadStaff();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffUserRow) => {
    setErrorMsg(null);
    const { error } = await supabase
      .from('staff_users')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await loadStaff();
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Remove staff user "${name}"?`)) return;
    setErrorMsg(null);

    const { error } = await supabase.from('staff_users').delete().eq('id', id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }
    await loadStaff();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Staff Roles &amp; PIN Management
            </h1>
            <p className="text-xs text-slate-500">
              Manage POS staff accounts, role permissions, and 4–6 digit login PINs for Khaasdaan.pk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {staffList.filter((s) => s.is_active).length} Active Staff
          </span>
          <button
            type="button"
            onClick={loadStaff}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Add / Edit Staff PIN Form */}
        <form
          onSubmit={handleSaveStaff}
          className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 h-fit"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                {editingId ? 'Edit Staff & PIN' : 'Add Staff Member'}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Staff Full Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Bilal Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Role Permission</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:outline-none"
            >
              <option value="cashier">Cashier — Dine-In Tables, Punch &amp; Online Desk</option>
              <option value="kitchen">Kitchen Staff — KDS Queue &amp; KOT Slips</option>
              <option value="manager">Manager — Operations, Menu &amp; Financial Reports</option>
              <option value="owner">Owner — Full System &amp; PIN Control</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Login PIN (4–6 Digits) *
              </label>
              <button
                type="button"
                onClick={() => setPinCode(generateRandomPin(4))}
                className="text-[11px] font-bold text-amber-700 hover:underline"
              >
                Generate Random PIN
              </button>
            </div>
            <div className="relative mt-1 flex items-center">
              <KeyRound className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
              <input
                required
                type="text"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                placeholder="e.g. 1234"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 font-mono text-xs font-bold tracking-widest focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Assigned Counter / Kitchen Station (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Main Counter, Grill, or Floor 1"
              value={assignedStation}
              onChange={(e) => setAssignedStation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Account Active (Allow POS PIN sign-in)</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : editingId
              ? 'Update Staff & PIN'
              : 'Save Staff Member'}
          </button>
        </form>

        {/* Right: Staff Directory & PINs */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading staff users...</div>
          ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No staff users found yet. Add your first cashier, kitchen staff, or manager on the left.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Staff Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">PIN</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((member) => {
                    const isPinShown = Boolean(visiblePins[member.id]);
                    const roleClass =
                      ROLE_BADGE_STYLES[member.role] ||
                      'bg-slate-100 text-slate-800 border-slate-200';

                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{member.full_name}</div>
                          {member.assigned_station && (
                            <div className="text-[11px] text-slate-500">
                              {member.assigned_station}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase ${roleClass}`}
                          >
                            {member.role}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                            <span>{isPinShown ? member.pin_code : '••••'}</span>
                            <button
                              type="button"
                              onClick={() => togglePinVisibility(member.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title={isPinShown ? 'Hide PIN' : 'Show PIN'}
                            >
                              {isPinShown ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(member)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              member.is_active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {member.is_active ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Disabled</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditStaff(member)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-300"
                              title="Edit Staff"
                            >
                              <Pencil className="h-3 w-3 text-amber-700" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member.id, member.full_name)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete Staff"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </div>
  );
}