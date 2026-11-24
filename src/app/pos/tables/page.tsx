'use client';

import React, { useEffect } from 'react';
import TableFloorGrid from '@/components/pos/TableFloorGrid';
import { hydrateLocalCacheFromCloud, flushSyncOutbox } from '@/lib/offlineDb';

export default function PosTablesPage() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushSyncOutbox().then(() => hydrateLocalCacheFromCloud());
    }
  }, []);

  return (
    <main className="p-4 md:p-6">
      <TableFloorGrid staffName="Counter Staff" />
    </main>
  );
}