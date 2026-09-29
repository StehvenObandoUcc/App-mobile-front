import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  IconButton,
  SettingsSection,
  SettingsRow,
  OptionSheet,
  AvoidIngredientsSheet,
  M3Dialog,
} from '../src/components';
import { useAuth } from '../src/hooks/useAuth';
import { useReduceMotion } from '../src/hooks/useReduceMotion';
import { useOutboxStatus, getLastSyncAt } from '../src/hooks/useOutboxStatus';
import { LocalStorage } from '../src/storage/local-storage';
import { loadAppSettings, saveAppSettings, type AppSettings, DEFAULT_APP_SETTINGS } from '../src/storage/app-settings';
import { getTestPhotoCount, MAX_TEST_PHOTOS } from '../src/services/scan-limit';
import { LEGAL_CONTACT } from '../src/content/legal';
import { DIETARY_OPTIONS, DietaryPreference } from '../src/types';
import {
  areNotificationsAvailable,
  countScheduledExpiryReminders,
  getNotificationPermissionInfo,
  requestNotificationPermissionNow,
  sendTestExpiryNotification,
  syncExpiryReminders,
  type NotificationPermissionInfo,
} from '../src/services/expiry-notifications';
import { colors, spacing } from '../src/theme';

/**
 * Configuración (Configuracion.dc.html): Cuenta · Preferencias de cocina · Despensa y avisos ·
 * Sincronización · Permisos y escaneo · Accesibilidad · Información · Pruebas (BETA) · Zona de datos.
 */
const TEST_DELAY_SECONDS = 10;
const NOTIFICATIONS_AVAILABLE = areNotificationsAvailable();

const T = {
  ai: { background: colors.tertiaryContainer, text: colors.onTertiaryContainer },
  neutral: { background: colors.m3.surfaceContainer, text: colors.functional.unknown.text },
  fresh: colors.functional.fresh,
  peach: { background: colors.primaryContainer, text: colors.onPrimaryContainer },
  danger: { background: colors.m3.errorContainer, text: colors.m3.error },
  warn: colors.functional.expiringSoon,
  dairy: colors.categories.dairy,
};

type Sheet = null | 'diet' | 'servings' | 'avoid' | 'days' | 'shelf';
type Confirm = null | 'logout' | 'wipe' | 'deleteAccount';

function timeAgo(ts: number | null): string {
  if (!ts) return 'Tus cambios se guardan en la nube';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'Última vez: hace un momento';
  if (min < 60) return `Última vez: hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Última vez: hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Última vez: hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const reduceMotion = useReduceMotion();
  const { pendingCount, stuckCount, isRetrying, retryNow } = useOutboxStatus();
  const [camera] = useCameraPermissions();
  const [media] = ImagePicker.useMediaLibraryPermissions();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermissionInfo>({ granted: false, canAskAgain: true });
  const [scheduledCount, setScheduledCount] = useState(0);
  const [photos, setPhotos] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<{ title: string; emphasis: string; message: string; type: 'success' | 'warning' } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const refresh = useCallback(async () => {
    const [s, p, n, c, ls] = await Promise.all([
      loadAppSettings(),
      getNotificationPermissionInfo(),
      countScheduledExpiryReminders(),
      getTestPhotoCount(),
      getLastSyncAt(),
    ]);
    setSettings(s);
    setPermission(p);
    setScheduledCount(n);
    setPhotos(c);
    setLastSync(ls);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pendingCount]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const apply = async (patch: Partial<AppSettings>) => {
    const next = await saveAppSettings(patch);
    setSettings(next);
    if ('expiryAlertsEnabled' in patch || 'expiryDaysBefore' in patch) {
      await syncExpiryReminders();
      setScheduledCount(await countScheduledExpiryReminders());
    }
  };

  const handleNotifPermission = async () => {
    if (permission.canAskAgain) {
      if (await requestNotificationPermissionNow()) await syncExpiryReminders();
      await refresh();
    } else Linking.openSettings();
  };

  const handleTest = async () => {
    setIsSendingTest(true);
    const ok = await sendTestExpiryNotification(TEST_DELAY_SECONDS);
    setIsSendingTest(false);
    setNotice(
      ok
        ? { title: 'Aviso de prueba', emphasis: 'enviado', message: `Llegará en ${TEST_DELAY_SECONDS} segundos. Puedes salir de la app para verlo.`, type: 'success' }
        : { title: 'No se pudo', emphasis: 'enviar', message: 'Revisa que las notificaciones estén permitidas.', type: 'warning' }
    );
  };

  const version = Constants.expoConfig?.version ?? '—';
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || 'Chef';
  const dietLabel = DIETARY_OPTIONS.find((d) => d.key === settings.defaultDiet)?.label ?? 'Cualquiera';
  const avoidLabel =
    settings.avoidIngredients.length === 0
      ? 'Ninguno'
      : settings.avoidIngredients.length === 1
        ? settings.avoidIngredients[0]
        : `${settings.avoidIngredients.length}`;
  const permLabel = (granted?: boolean) => (granted ? 'Permitido' : 'No permitido');
  const syncTitle = stuckCount > 0 ? 'Cambios con problemas' : pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : 'Todo sincronizado';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 48 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton iconName="chevron-back" variant="white" accessibilityLabel="Volver al inicio" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {'Tu '}
            <AppText weight="semibold">configuración</AppText>
          </AppText>
        </View>

        <SettingsSection title="Cuenta">
          <SettingsRow iconName="person-outline" tone={T.ai} title="Mi perfil" subtitle={`Chef ${firstName} · ${user?.email ?? ''}`} onPress={() => router.push('/profile')} divider />
          <SettingsRow iconName="log-out-outline" tone={T.neutral} title="Cerrar sesión" onPress={() => setConfirm('logout')} />
        </SettingsSection>

        <SettingsSection title="Preferencias de cocina">
          <SettingsRow iconName="leaf-outline" tone={T.fresh} title="Dieta por defecto" subtitle="La usa el Chef IA al generar" trailing={{ type: 'value', text: dietLabel }} onPress={() => setSheet('diet')} divider />
          <SettingsRow iconName="people-outline" tone={T.peach} title="Porciones por defecto" trailing={{ type: 'value', text: String(settings.defaultServings) }} onPress={() => setSheet('servings')} divider />
          <SettingsRow iconName="alert-circle-outline" tone={T.danger} title="Ingredientes a evitar" subtitle="Alergias o cosas que no comes" trailing={{ type: 'value', text: avoidLabel }} onPress={() => setSheet('avoid')} />
        </SettingsSection>

        <SettingsSection title="Despensa y avisos">
          <SettingsRow
            iconName="notifications-outline"
            tone={T.warn}
            title="Avisos de vencimiento"
            subtitle={NOTIFICATIONS_AVAILABLE ? 'Notificación antes de que algo venza' : 'No funcionan en Expo Go; usa un build de desarrollo'}
            trailing={{ type: 'toggle', value: settings.expiryAlertsEnabled && NOTIFICATIONS_AVAILABLE, onChange: (v) => apply({ expiryAlertsEnabled: v }), disabled: !NOTIFICATIONS_AVAILABLE }}
            divider
          />
          {NOTIFICATIONS_AVAILABLE && !permission.granted && (
            <SettingsRow
              iconName="notifications-off-outline"
              tone={T.danger}
              title="Notificaciones desactivadas"
              subtitle="Actívalas para recibir los avisos"
              trailing={{ type: 'button', label: permission.canAskAgain ? 'Permitir' : 'Ajustes', onPress: handleNotifPermission }}
              divider
            />
          )}
          <SettingsRow
            iconName="calendar-outline"
            tone={T.warn}
            title="Avisar con"
            trailing={{ type: 'value', text: settings.expiryDaysBefore === 1 ? '1 día antes' : `${settings.expiryDaysBefore} días antes` }}
            onPress={() => setSheet('days')}
            divider
          />
          <SettingsRow
            iconName="basket-outline"
            tone={T.fresh}
            title="Vencimiento al pasar compras"
            subtitle="Días estimados si el producto no tiene fecha"
            trailing={{ type: 'value', text: settings.shoppingShelfDays ? `${settings.shoppingShelfDays} días` : 'Automático' }}
            onPress={() => setSheet('shelf')}
          />
        </SettingsSection>

        <SettingsSection title="Sincronización">
          <SettingsRow
            iconName="sync-outline"
            tone={T.dairy}
            title={syncTitle}
            subtitle={pendingCount > 0 ? 'Se enviarán al volver la conexión' : timeAgo(lastSync)}
            trailing={{ type: 'button', label: 'Sincronizar', onPress: retryNow, busy: isRetrying }}
          />
        </SettingsSection>

        <SettingsSection title="Permisos y escaneo">
          <SettingsRow iconName="camera-outline" tone={T.peach} title="Cámara" subtitle={`${permLabel(camera?.granted)} · para escanear alimentos`} onPress={() => Linking.openSettings()} divider />
          <SettingsRow iconName="images-outline" tone={T.neutral} title="Fotos de la galería" subtitle={`${permLabel(media?.granted)} · para escoger fotos`} onPress={() => Linking.openSettings()} divider />
          <SettingsRow iconName="scan-outline" tone={T.ai} title="Fotos de prueba" subtitle={`Usaste ${Math.min(photos, MAX_TEST_PHOTOS)} de ${MAX_TEST_PHOTOS}`} trailing={{ type: 'none' }} />
        </SettingsSection>

        <SettingsSection title="Accesibilidad">
          <SettingsRow
            iconName="pulse-outline"
            tone={T.neutral}
            title="Reducir animaciones"
            subtitle="Sigue la opción del sistema"
            trailing={{ type: 'toggle', value: reduceMotion, disabled: true }}
            accessibilityHint="Se cambia en los ajustes de accesibilidad del teléfono"
          />
        </SettingsSection>

        <SettingsSection title="Información">
          <SettingsRow iconName="document-text-outline" tone={T.neutral} title="Términos y condiciones" onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })} divider />
          <SettingsRow iconName="shield-checkmark-outline" tone={T.neutral} title="Política de privacidad" onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })} divider />
          <SettingsRow iconName="information-circle-outline" tone={T.neutral} title="Versión" subtitle={`Food AI ${version}`} trailing={{ type: 'none' }} />
        </SettingsSection>

        <SettingsSection title="Pruebas · BETA">
          <SettingsRow
            iconName="paper-plane-outline"
            tone={T.warn}
            title="Aviso de prueba"
            subtitle={`Avisos programados: ${scheduledCount}`}
            trailing={{ type: 'button', label: 'Enviar', onPress: handleTest, busy: isSendingTest }}
            divider
          />
          <SettingsRow iconName="color-palette-outline" tone={T.ai} title="Catálogo de diseño" onPress={() => router.push('/design-catalog')} />
        </SettingsSection>

        <SettingsSection title="Zona de datos">
          <SettingsRow iconName="trash-outline" tone={T.danger} title="Borrar datos de este teléfono" subtitle="Tu cuenta y tu nube no se tocan" destructive onPress={() => setConfirm('wipe')} divider />
          <SettingsRow iconName="close" tone={T.danger} title="Eliminar mi cuenta" subtitle="Borra tus datos del servidor" destructive onPress={() => setConfirm('deleteAccount')} />
        </SettingsSection>
      </ScrollView>

      <OptionSheet<DietaryPreference>
        visible={sheet === 'diet'}
        title="Dieta por"
        emphasis="defecto"
        description="El Chef IA la trae marcada al generar recetas."
        options={DIETARY_OPTIONS.map((d) => ({ value: d.key, label: d.label }))}
        value={settings.defaultDiet}
        onSelect={(v) => apply({ defaultDiet: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number>
        visible={sheet === 'servings'}
        title="Porciones por"
        emphasis="defecto"
        description="Cuántas personas comen de cada receta."
        options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 1 ? '1 porción' : `${n} porciones` }))}
        value={settings.defaultServings}
        onSelect={(v) => apply({ defaultServings: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number>
        visible={sheet === 'days'}
        title="Avisar"
        emphasis="con"
        options={[1, 2, 3].map((n) => ({ value: n, label: n === 1 ? '1 día antes' : `${n} días antes` }))}
        value={settings.expiryDaysBefore}
        onSelect={(v) => apply({ expiryDaysBefore: v as 1 | 2 | 3 })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number | null>
        visible={sheet === 'shelf'}
        title="Vencimiento al pasar"
        emphasis="compras"
        description="Fecha que se pone a lo que pasas de Compras a tu despensa. Puedes cambiarla después."
        options={[
          { value: null, label: 'Automático', hint: 'Según el tipo de alimento' },
          ...[3, 5, 7, 14, 30].map((n) => ({ value: n, label: `${n} días` })),
        ]}
        value={settings.shoppingShelfDays}
        onSelect={(v) => apply({ shoppingShelfDays: v })}
        onClose={() => setSheet(null)}
      />
      <AvoidIngredientsSheet
        visible={sheet === 'avoid'}
        value={settings.avoidIngredients}
        onSave={(items) => apply({ avoidIngredients: items })}
        onClose={() => setSheet(null)}
      />

      <M3Dialog
        visible={confirm === 'logout'}
        type="warning"
        iconName="log-out-outline"
        title="¿Cerrar"
        titleEmphasis="sesión?"
        message="Tus datos se quedan en tu cuenta. En este teléfono volverás a la bienvenida."
        cancelText="Cancelar"
        onCancel={() => setConfirm(null)}
        confirmText="Cerrar sesión"
        confirmTone="danger"
        onConfirm={async () => {
          setConfirm(null);
          await logout();
          router.replace('/login');
        }}
      />
      <M3Dialog
        visible={confirm === 'wipe'}
        type="error"
        iconName="trash-outline"
        title="¿Borrar los datos de"
        titleEmphasis="este teléfono?"
        message={
          pendingCount > 0
            ? `Tienes ${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} sin sincronizar que se perderán. Lo que ya está en la nube vuelve a descargarse.`
            : 'Se borra la copia local de tu despensa, recetas y compras. Lo que está en tu cuenta vuelve a descargarse.'
        }
        cancelText="Cancelar"
        onCancel={() => setConfirm(null)}
        confirmText="Borrar"
        confirmTone="danger"
        onConfirm={async () => {
          setConfirm(null);
          await LocalStorage.clearAllUserData();
          setNotice({ title: 'Datos del teléfono', emphasis: 'borrados', message: 'Tu información se volverá a descargar de tu cuenta.', type: 'success' });
        }}
      />
      <M3Dialog
        visible={confirm === 'deleteAccount'}
        type="error"
        iconName="close-circle-outline"
        title="¿Eliminar"
        titleEmphasis="tu cuenta?"
        message={`Te abriremos un correo a ${LEGAL_CONTACT} para pedir que borremos tu cuenta y todos tus datos del servidor. Lo hacemos en los plazos de la ley.`}
        cancelText="Cancelar"
        onCancel={() => setConfirm(null)}
        confirmText="Escribir correo"
        confirmTone="danger"
        onConfirm={() => {
          setConfirm(null);
          const subject = encodeURIComponent('Eliminar mi cuenta de Food AI');
          const body = encodeURIComponent(`Hola, quiero eliminar mi cuenta (${user?.email ?? ''}) y todos mis datos.`);
          Linking.openURL(`mailto:${LEGAL_CONTACT}?subject=${subject}&body=${body}`).catch(() =>
            setNotice({ title: 'No hay app de', emphasis: 'correo', message: `Escríbenos a ${LEGAL_CONTACT} desde tu correo.`, type: 'warning' })
          );
        }}
      />
      <M3Dialog
        visible={notice !== null}
        type={notice?.type ?? 'success'}
        title={notice?.title ?? ''}
        titleEmphasis={notice?.emphasis}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
});
