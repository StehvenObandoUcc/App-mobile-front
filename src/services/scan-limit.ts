import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_TEST_PHOTOS = 5;
const STORAGE_KEY = '@food_ai_test_photo_count_v1';

// Avisa a Inicio, la barra inferior y Despensa cuando se gasta una foto (useScanQuota).
const listeners = new Set<(count: number) => void>();
export function subscribeTestPhotoCount(listener: (count: number) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getTestPhotoCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch (err) {
    console.warn('[ScanLimit] Error al leer el conteo de fotos de prueba:', err);
    return 0;
  }
}

export async function incrementTestPhotoCount(): Promise<number> {
  try {
    const current = await getTestPhotoCount();
    const next = current + 1;
    await AsyncStorage.setItem(STORAGE_KEY, next.toString());
    listeners.forEach((l) => l(next));
    return next;
  } catch (err) {
    console.warn('[ScanLimit] Error al incrementar el conteo de fotos de prueba:', err);
    return 1;
  }
}

