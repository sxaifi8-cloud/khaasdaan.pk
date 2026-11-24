'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { offlineDb, flushSyncOutbox, hydrateLocalCacheFromCloud } from '@/lib/offlineDb';

export default function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  const refreshQueueCount = useCallback(async () => {
    const count = await offlineDb.sync_outbox.count();
    setPendingCount(count);
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    await flushSyncOutbox();
    await refreshQueueCount();
    setSyncing(false);
  }, [refreshQueueCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    hydrateLocalCacheFromCloud();
    runSync();

    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      refreshQueueCount();
      if (navigator.onLine) {
        flushSyncOutbox().then(refreshQueueCount);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshQueueCount, runSync]);

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
        isOnline
          ? pendingCount > 0
            ? 'bg-amber-100 text-amber-900 border border-amber-300'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-rose-100 text-rose-900 border border-rose-300'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        <span>
          {!isOnline
            ? `Offline Mode (${pendingCount} queued)`
            : pendingCount > 0
            ? `Syncing ${pendingCount} offline order(s)...`
            : 'Cloud Synced'}
        </span>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      )}
    </div>
  );
}