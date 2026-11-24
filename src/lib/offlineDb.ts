import Dexie, { type Table } from 'dexie';
import { supabase } from './supabase';

export interface CachedMenuItem {
  id: string;
  name: string;
  category: string;
  kitchen_station: string;
  base_price: number;
  image_url: string | null;
  is_deal: boolean;
  is_available: boolean;
  variants: { id: string; label: string; price: number; sort_order?: number }[];
}

export interface CachedTable {
  id: string;
  table_number: string;
  table_name: string;
  floor_area: string;
  status: string;
  active_order_id: string | null;
}

export interface LocalOrderRecord {
  id: string; // UUID generated client-side so KOT & Bill print work offline
  receipt_series: 'dine_in' | 'online';
  receipt_number: string;
  channel: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  table_id?: string | null;
  table_label: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  external_order_id?: string | null;
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
  punched_by: string | null;
  opened_at: string;
  created_at: string;
  items: {
    id: string;
    item_name: string;
    variant_name: string | null;
    kitchen_station: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_notes: string | null;
    kot_printed: boolean;
    kot_status: string;
  }[];
}

export interface SyncOutboxEntry {
  id?: number;
  action_type: 'PUNCH_TABLE' | 'CLOSE_TABLE' | 'CREATE_ONLINE_ORDER';
  payload: any;
  status: 'pending' | 'syncing' | 'failed';
  error_message?: string;
  created_at: string;
}

class KhaasdaanOfflineDB extends Dexie {
  menu_items!: Table<CachedMenuItem, string>;
  restaurant_tables!: Table<CachedTable, string>;
  local_orders!: Table<LocalOrderRecord, string>;
  sync_outbox!: Table<SyncOutboxEntry, number>;

  constructor() {
    super('khaasdaan_pos_offline_v1');
    this.version(1).stores({
      menu_items: 'id, category, is_available',
      restaurant_tables: 'id, table_number, status',
      local_orders: 'id, receipt_series, receipt_number, table_id, status',
      sync_outbox: '++id, status, action_type, created_at',
    });
  }
}

export const offlineDb = new KhaasdaanOfflineDB();

// Pull fresh master data from Supabase into IndexedDB whenever online
export async function hydrateLocalCacheFromCloud() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const [menuRes, tablesRes] = await Promise.all([
    supabase
      .from('menu_items')
      .select(`
        id, name, category, kitchen_station, base_price, image_url, is_deal, is_available,
        item_variants ( id, label, price, sort_order )
      `)
      .eq('is_available', true),
    supabase
      .from('restaurant_tables')
      .select('id, table_number, table_name, floor_area, status, active_order_id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (!menuRes.error && menuRes.data) {
    const mapped: CachedMenuItem[] = menuRes.data.map((m: any) => ({
      id: m.id,
      name: m.name,
      category: m.category || 'General',
      kitchen_station: m.kitchen_station || 'main',
      base_price: Number(m.base_price || 0),
      image_url: m.image_url || null,
      is_deal: Boolean(m.is_deal),
      is_available: Boolean(m.is_available),
      variants: (m.item_variants || []).sort(
        (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
      ),
    }));
    await offlineDb.menu_items.clear();
    await offlineDb.menu_items.bulkPut(mapped);
  }

  // Only overwrite tables if there are no unsynced local table mutations pending
  const pendingCount = await offlineDb.sync_outbox.where('status').equals('pending').count();
  if (pendingCount === 0 && !tablesRes.error && tablesRes.data) {
    await offlineDb.restaurant_tables.clear();
    await offlineDb.restaurant_tables.bulkPut(tablesRes.data as CachedTable[]);
  }
}

// Replay queued offline actions to Supabase in exact FIFO order
let isSyncRunning = false;

export async function flushSyncOutbox(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const remaining = await offlineDb.sync_outbox.where('status').notEqual('syncing').count();
    return { synced: 0, remaining };
  }

  if (isSyncRunning) {
    const remaining = await offlineDb.sync_outbox.count();
    return { synced: 0, remaining };
  }

  isSyncRunning = true;
  let syncedCount = 0;

  try {
    const pendingJobs = await offlineDb.sync_outbox.orderBy('id').toArray();

    for (const job of pendingJobs) {
      if (!job.id) continue;
      await offlineDb.sync_outbox.update(job.id, { status: 'syncing' });

      try {
        if (job.action_type === 'PUNCH_TABLE') {
          const { error } = await supabase.rpc('punch_table_items', job.payload);
          if (error) throw error;
        } else if (job.action_type === 'CLOSE_TABLE') {
          const { error } = await supabase.rpc('close_table_order', job.payload);
          if (error) throw error;
        } else if (job.action_type === 'CREATE_ONLINE_ORDER') {
          const { orderRow, itemRow } = job.payload;
          const { error: ordErr } = await supabase.from('orders').upsert(orderRow);
          if (ordErr) throw ordErr;
          const { error: itemErr } = await supabase.from('order_items').upsert(itemRow);
          if (itemErr) throw itemErr;
        }

        await offlineDb.sync_outbox.delete(job.id);
        syncedCount += 1;
      } catch (err: any) {
        await offlineDb.sync_outbox.update(job.id, {
          status: 'failed',
          error_message: err?.message || 'Sync error',
        });
        break; // Stop FIFO queue on error to preserve order integrity
      }
    }

    if (syncedCount > 0) {
      await hydrateLocalCacheFromCloud();
    }
  } finally {
    isSyncRunning = false;
  }

  const remaining = await offlineDb.sync_outbox.count();
  return { synced: syncedCount, remaining };
}