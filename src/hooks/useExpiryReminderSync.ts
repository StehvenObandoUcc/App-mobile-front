import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { getNotifications } from '../services/notifications-runtime';
import {
  EXPIRY_NOTIFICATION_KIND,
  EXPIRY_TEST_NOTIFICATION_KIND,
  cancelExpiryReminders,
  syncExpiryReminders,
} from '../services/expiry-notifications';

/**
 * Mantiene los avisos de vencimiento al día. Se monta una sola vez en app/_layout.tsx.
 *
 * No usa useInventory(): cada pantalla tiene su propio estado y este hook no se enteraría
 * de los cambios. En su lugar recalcula desde el almacenamiento local cuando:
 *  - cambia la pantalla (al salir de Despensa, Escaneo o Compras ya se guardaron los cambios),
 *  - la app pasa a segundo plano o vuelve al frente.
 */
export function useExpiryReminderSync(isActive: boolean, pathname: string) {
  const router = useRouter();

  // Tocar el aviso abre la Despensa filtrada en «Por vencer» (el filtro ya existe).
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return; // Expo Go en Android: sin avisos, la app sigue funcionando
    const open = (response: NotificationResponse | null) => {
      const data = response?.notification.request.content.data as { kind?: string } | undefined;
      if (data?.kind === EXPIRY_NOTIFICATION_KIND || data?.kind === EXPIRY_TEST_NOTIFICATION_KIND) {
        router.push({ pathname: '/inventory', params: { filter: 'expiring' } });
      }
    };
    if (isActive) {
      // App abierta desde cero tocando un aviso.
      Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [isActive, router]);

  // Recalcular al cambiar de pantalla (con un pequeño retraso para agrupar cambios).
  useEffect(() => {
    if (!isActive) {
      cancelExpiryReminders();
      return;
    }
    const t = setTimeout(() => {
      syncExpiryReminders();
    }, 1500);
    return () => clearTimeout(t);
  }, [isActive, pathname]);

  // Recalcular al ir a segundo plano o volver.
  useEffect(() => {
    if (!isActive) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'active') syncExpiryReminders();
    });
    return () => sub.remove();
  }, [isActive]);
}
