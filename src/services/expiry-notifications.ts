import { Platform } from 'react-native';
import { getNotifications } from './notifications-runtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalStorage } from '../storage/local-storage';
import { loadAppSettings } from '../storage/app-settings';
import { buildExpiryReminderPlan } from '../utils/expiry-reminders';
import { colors } from '../theme';

export { areNotificationsAvailable, isExpoGo } from './notifications-runtime';

/**
 * Avisos locales de vencimiento (expo-notifications).
 *
 * - Solo notificaciones LOCALES: no hay push remoto, no se envía nada al servidor.
 * - El plan (qué y cuándo avisar) lo calcula utils/expiry-reminders.ts (función pura con tests).
 * - Cada recálculo cancela únicamente NUESTROS avisos (data.kind) y vuelve a programarlos,
 *   serializado para que dos recálculos seguidos no se pisen.
 */
export const EXPIRY_NOTIFICATION_KIND = 'expiry-reminder';
/** Aviso de prueba (beta): tipo aparte para que un recálculo no lo cancele. */
export const EXPIRY_TEST_NOTIFICATION_KIND = 'expiry-reminder-test';
const CHANNEL_ID = 'vencimientos';
const PERMISSION_ASKED_KEY = '@food_ai_notifications_permission_asked_v1';

let handlerConfigured = false;
let queue: Promise<void> = Promise.resolve();

/** Muestra el aviso aunque la app esté abierta. Se llama una vez al cargar el layout raíz. */
export function configureNotifications(): void {
  const Notifications = getNotifications();
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || Platform.OS !== 'android') return;
  // En Android 13+ el canal debe existir antes de pedir el permiso.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Avisos de vencimiento',
    description: 'Te avisa antes de que un alimento de tu despensa venza.',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.primary,
  });
}

/**
 * Pide el permiso de notificaciones una sola vez por instalación (clave propia, así
 * también se pide en instalaciones que ya pasaron por primeAppPermissionsOnce).
 */
export async function requestNotificationPermissionOnce(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const alreadyAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
    if (alreadyAsked || !current.canAskAgain) return false;
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, String(Date.now()));
    return res.granted;
  } catch (err) {
    console.warn('[Notificaciones] No se pudo pedir el permiso:', err);
    return false;
  }
}

async function cancelOwnReminders(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: string } | null)?.kind === EXPIRY_NOTIFICATION_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function runSync(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await cancelOwnReminders();
  const settings = await loadAppSettings();
  if (!settings.expiryAlertsEnabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureAndroidChannel();

  const items = await LocalStorage.getInventory();
  const plan = buildExpiryReminderPlan(
    items.map((i) => ({ name: i.name, expirationDate: i.expirationDate })),
    { daysBefore: settings.expiryDaysBefore }
  );
  for (const entry of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body: entry.body,
        data: { kind: EXPIRY_NOTIFICATION_KIND, route: '/inventory', filter: 'expiring' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: entry.fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Recalcula los avisos a partir de la despensa guardada en el teléfono. Nunca lanza error. */
export function syncExpiryReminders(): Promise<void> {
  queue = queue
    .then(runSync)
    .catch((err) => console.warn('[Notificaciones] No se pudieron programar los avisos:', err));
  return queue;
}

/** Al cerrar sesión: quita los avisos de ese usuario. */
export function cancelExpiryReminders(): Promise<void> {
  queue = queue
    .then(cancelOwnReminders)
    .catch((err) => console.warn('[Notificaciones] No se pudieron cancelar los avisos:', err));
  return queue;
}

// ─── Funciones para la pantalla de Configuración ─────────────────────────────

export type NotificationPermissionInfo = { granted: boolean; canAskAgain: boolean };

export async function getNotificationPermissionInfo(): Promise<NotificationPermissionInfo> {
  const Notifications = getNotifications();
  if (!Notifications) return { granted: false, canAskAgain: false };
  try {
    const p = await Notifications.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

/** Petición explícita desde Configuración (no depende de la marca de «ya se pidió»). */
export async function requestNotificationPermissionNow(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    await ensureAndroidChannel();
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, String(Date.now()));
    return res.granted;
  } catch (err) {
    console.warn('[Notificaciones] No se pudo pedir el permiso:', err);
    return false;
  }
}

export async function countScheduledExpiryReminders(): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.filter(
      (n) => (n.content.data as { kind?: string } | null)?.kind === EXPIRY_NOTIFICATION_KIND
    ).length;
  } catch {
    return 0;
  }
}

/**
 * BETA · Envía un aviso de prueba en `seconds` segundos para comprobar que las
 * notificaciones funcionan en este teléfono. Usa su propio tipo, así un recálculo
 * de los avisos reales no lo cancela.
 */
export async function sendTestExpiryNotification(seconds = 10): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Prueba · Espinaca vence en 2 días',
        body: 'Así se verán tus avisos de vencimiento. Tócalo para abrir la Despensa.',
        data: { kind: EXPIRY_TEST_NOTIFICATION_KIND, route: '/inventory', filter: 'expiring' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.floor(seconds)),
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch (err) {
    console.warn('[Notificaciones] No se pudo enviar el aviso de prueba:', err);
    return false;
  }
}
