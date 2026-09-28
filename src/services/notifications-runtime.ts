import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Carga perezosa y segura de expo-notifications.
 *
 * En Expo Go para Android (SDK 53+), el solo hecho de IMPORTAR expo-notifications lanza
 * un error que tumba toda la app. Por eso nadie debe importarlo de forma estática:
 * se pide aquí, y en Expo Go devolvemos null (la app funciona, solo sin avisos).
 * En un build de desarrollo o en la APK sí se carga normalmente.
 */
type NotificationsModule = typeof import('expo-notifications');

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: NotificationsModule | null | undefined;

export function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (isExpoGo && Platform.OS === 'android') {
    cached = null;
    return cached;
  }
  try {
    // require dentro de la función: Metro lo empaqueta, pero solo se ejecuta aquí.
    cached = require('expo-notifications') as NotificationsModule;
  } catch (err) {
    console.warn('[Notificaciones] expo-notifications no está disponible en este entorno:', err);
    cached = null;
  }
  return cached;
}

/** true si este entorno puede mostrar avisos (build de desarrollo o APK). */
export function areNotificationsAvailable(): boolean {
  return getNotifications() !== null;
}
