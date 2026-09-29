import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Switch, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { AppScreen, Chip, SecondaryButton, Text } from '../src/components';
import { colors, typography, spacing, radii } from '../src/theme';
import { loadAppSettings, saveAppSettings, type AppSettings, DEFAULT_APP_SETTINGS } from '../src/storage/app-settings';
import {
  areNotificationsAvailable,
  countScheduledExpiryReminders,
  getNotificationPermissionInfo,
  requestNotificationPermissionNow,
  sendTestExpiryNotification,
  syncExpiryReminders,
  type NotificationPermissionInfo,
} from '../src/services/expiry-notifications';

const DAY_OPTIONS: AppSettings['expiryDaysBefore'][] = [1, 2, 3];
const TEST_DELAY_SECONDS = 10;
/** false en Expo Go (Android): expo-notifications no funciona ahí; hace falta un build de desarrollo. */
const NOTIFICATIONS_AVAILABLE = areNotificationsAvailable();

/**
 * Configuración (primera versión en código).
 * Incluye los avisos de vencimiento y una sección BETA para probarlos.
 * El resto de ajustes del diseño (tablero 28) se agregará por etapas.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermissionInfo>({ granted: false, canAskAgain: true });
  const [scheduledCount, setScheduledCount] = useState(0);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const refresh = useCallback(async () => {
    const [s, p, n] = await Promise.all([
      loadAppSettings(),
      getNotificationPermissionInfo(),
      countScheduledExpiryReminders(),
    ]);
    setSettings(s);
    setPermission(p);
    setScheduledCount(n);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Al volver de los ajustes del sistema, el permiso pudo cambiar.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const applySettings = async (patch: Partial<AppSettings>) => {
    const next = await saveAppSettings(patch);
    setSettings(next);
    await syncExpiryReminders();
    setScheduledCount(await countScheduledExpiryReminders());
  };

  const handlePermission = async () => {
    if (permission.canAskAgain) {
      const granted = await requestNotificationPermissionNow();
      if (granted) await syncExpiryReminders();
      await refresh();
    } else {
      Linking.openSettings();
    }
  };

  const handleTest = async () => {
    setIsSendingTest(true);
    const ok = await sendTestExpiryNotification(TEST_DELAY_SECONDS);
    setIsSendingTest(false);
    setTestMessage(
      ok
        ? `Listo: el aviso de prueba llegará en ${TEST_DELAY_SECONDS} segundos. Puedes salir de la app para verlo.`
        : 'No se pudo enviar. Revisa que las notificaciones estén permitidas.'
    );
  };

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <AppScreen scrollable contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Tu <Text style={styles.titleStrong}>configuración</Text>
        </Text>
      </View>

      {/* ── Avisos de vencimiento ── */}
      <Text style={styles.sectionLabel}>Despensa y avisos</Text>
      <View style={styles.card}>
        {!NOTIFICATIONS_AVAILABLE && (
          <View style={[styles.row, styles.rowColumn]}>
            <Text style={styles.warningText}>
              Los avisos no funcionan en Expo Go. Para probarlos abre la app con un build de desarrollo
              (npx expo run:android) o instala la APK.
            </Text>
          </View>
        )}
        <View style={[styles.row, !NOTIFICATIONS_AVAILABLE && styles.rowDivider]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.functional.expiringSoon.background }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.functional.expiringSoon.text} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Avisos de vencimiento</Text>
            <Text style={styles.rowSub}>Notificación antes de que algo venza</Text>
          </View>
          <Switch
            value={settings.expiryAlertsEnabled}
            onValueChange={(v) => applySettings({ expiryAlertsEnabled: v })}
            disabled={!NOTIFICATIONS_AVAILABLE}
            trackColor={{ false: colors.m3.surfaceContainerHighest, true: colors.ink }}
            thumbColor={colors.surface}
            accessibilityLabel="Avisos de vencimiento"
          />
        </View>

        <View style={[styles.row, styles.rowColumn, styles.rowDivider]}>
          <Text style={styles.rowTitle}>Avisar con</Text>
          <View style={styles.chipsRow}>
            {DAY_OPTIONS.map((d) => (
              <Chip
                key={d}
                variant="filter"
                label={d === 1 ? '1 día antes' : `${d} días antes`}
                selected={settings.expiryDaysBefore === d}
                disabled={!settings.expiryAlertsEnabled}
                onPress={() => applySettings({ expiryDaysBefore: d })}
              />
            ))}
          </View>
        </View>

        {NOTIFICATIONS_AVAILABLE && !permission.granted && (
          <View style={[styles.row, styles.rowColumn, styles.rowDivider]}>
            <Text style={styles.warningText}>
              Las notificaciones están desactivadas para Food AI en este teléfono.
            </Text>
            <SecondaryButton
              title={permission.canAskAgain ? 'Permitir notificaciones' : 'Abrir ajustes del teléfono'}
              iconName={permission.canAskAgain ? 'notifications-outline' : 'settings-outline'}
              onPress={handlePermission}
            />
          </View>
        )}
      </View>

      {/* ── BETA · Pruebas ── */}
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>Pruebas</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
      </View>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowColumn]}>
          <Text style={styles.rowSub}>
            Envía un aviso de ejemplo para comprobar que las notificaciones funcionan en este teléfono.
          </Text>
          <SecondaryButton
            title={`Enviar aviso de prueba (${TEST_DELAY_SECONDS} s)`}
            iconName="paper-plane-outline"
            onPress={handleTest}
            isLoading={isSendingTest}
            disabled={!NOTIFICATIONS_AVAILABLE || !permission.granted}
          />
          {testMessage && (
            <Text style={styles.testMessage} accessibilityLiveRegion="polite">
              {testMessage}
            </Text>
          )}
          <Text style={styles.rowSub}>Avisos reales programados: {scheduledCount}</Text>
          <SecondaryButton
            title="Ver catálogo de diseño"
            iconName="color-palette-outline"
            variant="outline"
            onPress={() => router.push('/design-catalog')}
          />
        </View>
      </View>

      {/* ── Información ── */}
      <Text style={styles.sectionLabel}>Información</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Versión</Text>
            <Text style={styles.rowSub}>Food AI {version}</Text>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  title: {
    fontSize: typography.sizes.headline + 4,
    lineHeight: typography.lineHeights.headline + 4,
    fontWeight: typography.weights.light,
    color: colors.textPrimary,
  },
  titleStrong: { fontWeight: typography.weights.semibold },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  sectionLabel: {
    marginTop: spacing.lg,
    paddingLeft: spacing.xs,
    fontSize: typography.sizes.metadata,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.overline,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  betaBadge: {
    marginTop: spacing.lg,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.m3.tertiaryContainer,
    justifyContent: 'center',
  },
  betaText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    color: colors.m3.onTertiaryContainer,
    letterSpacing: typography.letterSpacing.label,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    paddingHorizontal: spacing.lg,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowColumn: { flexDirection: 'column', alignItems: 'stretch' },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.buttons,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: typography.sizes.metadata,
    lineHeight: typography.lineHeights.metadata,
    color: colors.textSecondary,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  warningText: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: typography.lineHeights.bodySmall,
    color: colors.functional.expiringSoon.text,
  },
  testMessage: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: typography.lineHeights.bodySmall,
    color: colors.functional.fresh.text,
  },
});
