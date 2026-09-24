import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_TEST_PHOTOS = 5;
const STORAGE_KEY = '@food_ai_test_photo_count_v1';

/**
 * Obtiene la cantidad de fotos escaneadas durante la fase de pruebas.
 */
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

/**
 * Incrementa el conteo de fotos de prueba escaneadas tras un escaneo exitoso.
 */
export async function incrementTestPhotoCount(): Promise<number> {
  try {
    const current = await getTestPhotoCount();
    const next = current + 1;
    await AsyncStorage.setItem(STORAGE_KEY, next.toString());
    return next;
  } catch (err) {
    console.warn('[ScanLimit] Error al incrementar el conteo de fotos de prueba:', err);
    return 1;
  }
}

/**
 * Verifica si el usuario aún dispone de cupo para escanear fotos en la fase de pruebas.
 */
export async function canScanPhoto(): Promise<boolean> {
  const current = await getTestPhotoCount();
  return current < MAX_TEST_PHOTOS;
}

/**
 * Reinicia el contador de fotos de prueba (útil para administradores o pruebas locales).
 */
export async function resetTestPhotoCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[ScanLimit] Error al reiniciar conteo de fotos de prueba:', err);
  }
}
