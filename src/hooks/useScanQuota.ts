import { useEffect, useState } from 'react';
import { getTestPhotoCount, subscribeTestPhotoCount, MAX_TEST_PHOTOS } from '../services/scan-limit';

/**
 * Fotos de prueba que quedan para escanear (fase de pruebas: MAX_TEST_PHOTOS por dispositivo).
 * `loaded` evita mostrar «te quedan 5» un instante antes de leer el conteo real.
 */
export function useScanQuota() {
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getTestPhotoCount().then((n) => alive && setUsed(n));
    const unsubscribe = subscribeTestPhotoCount((n) => setUsed(n));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const count = used ?? 0;
  return {
    loaded: used !== null,
    used: Math.min(count, MAX_TEST_PHOTOS),
    max: MAX_TEST_PHOTOS,
    remaining: Math.max(0, MAX_TEST_PHOTOS - count),
    exhausted: used !== null && count >= MAX_TEST_PHOTOS,
  };
}
