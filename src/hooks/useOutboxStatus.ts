import { useCallback, useEffect, useRef, useState } from 'react';
import { LocalStorage } from '../storage/local-storage';
import { flushOutbox } from '../services/outbox-dispatcher';

/**
 * Estado visible de la cola Outbox (patrón Offline-First) para el OfflineBanner.
 *
 * Sin dependencias nuevas (no usa NetInfo): deduce "sin conexión" de la propia cola.
 * Si hay mutaciones pendientes que ya fallaron de forma transitoria (status 0, 5xx,
 * 408, 429 → reintento con backoff), el usuario está sin red o el servidor no responde.
 * La cola vive en memoria (LocalStorage.getOutboxQueue), así que leerla es O(n) barato.
 */
import type { OutboxBannerState } from '../types';
export type { OutboxBannerState };

type Snapshot = {
  pendingCount: number;
  stuckCount: number;
  retrying: boolean;
  authBlocked: boolean;
};

function readSnapshot(): Snapshot {
  const queue = LocalStorage.getOutboxQueue();
  const active = queue.filter((m) => m.status === 'pending' || m.status === 'processing');
  const blocked = queue.filter((m) => m.status === 'blocked');
  const stuck = queue.filter((m) => m.status === 'failed' || m.status === 'conflict');
  return {
    pendingCount: active.length + blocked.length,
    stuckCount: stuck.length,
    retrying: active.some((m) => m.attemptCount > 0 && Boolean(m.lastError)),
    authBlocked: blocked.length > 0,
  };
}

const SYNCED_VISIBLE_MS = 2000;

export function useOutboxStatus(pollMs = 3000) {
  const [snapshot, setSnapshot] = useState<Snapshot>(readSnapshot);
  const [showSynced, setShowSynced] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const prevPending = useRef(snapshot.pendingCount);

  const refresh = useCallback(() => {
    const next = readSnapshot();
    // Solo actualiza si algo cambió: evita re-renderizar la pantalla en cada sondeo.
    setSnapshot((prev) =>
      prev.pendingCount === next.pendingCount &&
      prev.stuckCount === next.stuckCount &&
      prev.retrying === next.retrying &&
      prev.authBlocked === next.authBlocked
        ? prev
        : next
    );
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  // Mostrar "Todo sincronizado" brevemente cuando la cola se vacía tras tener pendientes.
  useEffect(() => {
    const hadPending = prevPending.current > 0;
    prevPending.current = snapshot.pendingCount;
    if (hadPending && snapshot.pendingCount === 0 && snapshot.stuckCount === 0) {
      setShowSynced(true);
      const t = setTimeout(() => setShowSynced(false), SYNCED_VISIBLE_MS);
      return () => clearTimeout(t);
    }
  }, [snapshot.pendingCount, snapshot.stuckCount]);

  /** Reintento manual: adelanta el backoff de las mutaciones pendientes y vacía la cola. */
  const retryNow = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const pending = LocalStorage.getOutboxQueue().filter((m) => m.status === 'pending');
      await Promise.all(
        pending.map((m) =>
          LocalStorage.updateOutboxMutation(m.operationId, { nextAttemptAt: Date.now() })
        )
      );
      await flushOutbox().catch(() => {});
    } finally {
      setIsRetrying(false);
      refresh();
    }
  }, [isRetrying, refresh]);

  let state: OutboxBannerState = 'hidden';
  if (snapshot.stuckCount > 0) state = 'attention';
  else if (snapshot.authBlocked) state = 'authBlocked';
  else if (snapshot.retrying && snapshot.pendingCount > 0) state = 'offline';
  else if (showSynced) state = 'synced';

  return {
    state,
    pendingCount: snapshot.pendingCount,
    stuckCount: snapshot.stuckCount,
    isRetrying,
    retryNow,
  };
}
