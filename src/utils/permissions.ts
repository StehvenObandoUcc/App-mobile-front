import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const PRIMED_KEY = '@food_ai_permissions_primed_v1';

/**
 * Solicita de una sola vez, al arrancar la app (buena práctica de Android/iOS), todos los
 * permisos que Food AI necesita: cámara (escaneo de alimentos) y galería (elegir foto o avatar).
 *
 * Se ejecuta una única vez por instalación (marcada en AsyncStorage), ya que el sistema
 * operativo solo muestra el diálogo nativo cuando el estado del permiso está "sin determinar";
 * si el usuario ya lo concedió o lo negó antes, volver a llamar es inofensivo pero innecesario.
 *
 * Si el usuario niega un permiso aquí, no se le vuelve a molestar hasta que intente usar
 * la funcionalidad correspondiente (cámara o galería), donde esa pantalla reactiva la
 * solicitud automáticamente.
 */
export async function primeAppPermissionsOnce(): Promise<void> {
  try {
    const alreadyPrimed = await AsyncStorage.getItem(PRIMED_KEY);
    if (alreadyPrimed) return;

    await Promise.allSettled([
      Camera.requestCameraPermissionsAsync(),
      ImagePicker.requestMediaLibraryPermissionsAsync(),
    ]);

    await AsyncStorage.setItem(PRIMED_KEY, String(Date.now()));
  } catch (err) {
    // No bloquear el arranque de la app si el priming de permisos falla por cualquier razón
    console.warn('[Permissions] Error solicitando permisos iniciales:', err);
  }
}
