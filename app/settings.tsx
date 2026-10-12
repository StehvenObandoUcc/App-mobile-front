import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { AuthService } from '../src/services/auth-service';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  TextInput,
  IconButton,
  SettingsSection,
  SettingsRow,
  OptionSheet,
  AvoidIngredientsSheet,
  M3Dialog,
} from '../src/components';
import { useAuth } from '../src/hooks/useAuth';
import { useSystemReduceMotion } from '../src/hooks/useReduceMotion';
import { useAppPreferences } from '../src/preferences/AppPreferences';
import { useI18n, type t as TFn, type tp as TpFn } from '../src/i18n';
import type { ThemeMode, LanguageSetting, ReduceMotionSetting } from '../src/storage/app-settings';
import { useOutboxStatus, getLastSyncAt } from '../src/hooks/useOutboxStatus';
import { LocalStorage } from '../src/storage/local-storage';
import { loadAppSettings, saveAppSettings, type AppSettings, DEFAULT_APP_SETTINGS } from '../src/storage/app-settings';
import { getTestPhotoCount, MAX_TEST_PHOTOS } from '../src/services/scan-limit';
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
import { spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';

/**
 * Configuración (Configuracion.dc.html): Cuenta · Preferencias de cocina · Despensa y avisos ·
 * Sincronización · Permisos y escaneo · Accesibilidad · Información · Pruebas (BETA) · Zona de datos.
 */
const TEST_DELAY_SECONDS = 10;
const NOTIFICATIONS_AVAILABLE = areNotificationsAvailable();

type Sheet = null | 'diet' | 'servings' | 'avoid' | 'days' | 'shelf' | 'theme' | 'language' | 'motion';
type Confirm = null | 'logout' | 'wipe' | 'deleteAccount';

function timeAgo(ts: number | null, t: typeof TFn, tp: typeof TpFn): string {
  if (!ts) return t('settings.syncNever');
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return t('settings.syncJustNow');
  if (min < 60) return t('settings.syncMinutes', { count: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('settings.syncHours', { count: h });
  return tp('settings.syncDays', Math.floor(h / 24));
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const systemReduceMotion = useSystemReduceMotion();
  const prefs = useAppPreferences();
  const { t, tp } = useI18n();
  const { colors } = useTheme();
  const styles = useStyles();
  // Tonos de los íconos de cada fila: salen del tema activo (claro u oscuro).
  const T = useMemo(
    () => ({
      ai: { background: colors.tertiaryContainer, text: colors.onTertiaryContainer },
      neutral: { background: colors.m3.surfaceContainer, text: colors.functional.unknown.text },
      fresh: colors.functional.fresh,
      peach: { background: colors.primaryContainer, text: colors.onPrimaryContainer },
      danger: { background: colors.m3.errorContainer, text: colors.m3.error },
      warn: colors.functional.expiringSoon,
      dairy: { background: colors.m3.surfaceContainer, text: colors.textPrimary },
    }),
    [colors]
  );
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
  // Eliminar cuenta: contraseña de confirmación, error y estado de envío.
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setConfirm(null);
    setDeletePassword('');
    setDeleteError(null);
  };
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim() || isDeleting) {
      setDeleteError(t('settings.deleteDialog.wrongPassword'));
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await AuthService.deleteAccount(deletePassword, false);
      setIsDeleting(false);
      setConfirm(null);
      setDeletePassword('');
      // Primero se avisa; la sesión y los datos locales se cierran al pulsar «Entendido».
      setAccountDeleted(true);
      setNotice({
        title: t('settings.deleteDialog.doneTitle'),
        emphasis: t('settings.deleteDialog.doneEmphasis'),
        message: t('settings.deleteDialog.doneMessage'),
        type: 'success',
      });
    } catch (err: any) {
      setIsDeleting(false);
      const msg = String(err?.message ?? '');
      setDeleteError(msg === 'wrong_password' ? t('settings.deleteDialog.wrongPassword') : msg || t('data.auth.deleteAccountError'));
    }
  };

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
        ? { title: t('settings.testDialog.sentTitle'), emphasis: t('settings.testDialog.sentEmphasis'), message: t('settings.testDialog.sentMessage', { count: TEST_DELAY_SECONDS }), type: 'success' }
        : { title: t('settings.testDialog.failTitle'), emphasis: t('settings.testDialog.failEmphasis'), message: t('settings.testDialog.failMessage'), type: 'warning' }
    );
  };

  const version = Constants.expoConfig?.version ?? '—';
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || t('settings.chefFallback');
  const dietLabel = t(`common.diets.${settings.defaultDiet}`);
  const avoidLabel =
    settings.avoidIngredients.length === 0
      ? t('settings.avoidNone')
      : settings.avoidIngredients.length === 1
        ? settings.avoidIngredients[0]
        : `${settings.avoidIngredients.length}`;
  const permLabel = (granted?: boolean) => (granted ? t('settings.allowed') : t('settings.notAllowed'));
  const syncTitle = stuckCount > 0 ? t('settings.syncProblems') : pendingCount > 0 ? tp('settings.syncPending', pendingCount) : t('settings.syncAllDone');
  const themeLabel = t(`settings.theme.${prefs.themeMode}`);
  const languageLabel = t(`settings.language.${prefs.language}`);
  const motionLabel =
    prefs.reduceMotion === 'system'
      ? t('settings.reduceMotion.systemNow', { state: t(systemReduceMotion ? 'settings.reduceMotion.stateOn' : 'settings.reduceMotion.stateOff') })
      : t(`settings.reduceMotion.${prefs.reduceMotion}`);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 48 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton iconName="chevron-back" variant="white" accessibilityLabel={t('settings.backA11y')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <AppText weight="light" style={styles.title} accessibilityRole="header">
            {t('settings.titleLight')}
            <AppText weight="semibold">{t('settings.titleBold')}</AppText>
          </AppText>
        </View>

        <SettingsSection title={t('settings.sections.account')}>
          <SettingsRow iconName="person-outline" tone={T.ai} title={t('settings.profile')} subtitle={t('settings.profileSubtitle', { name: firstName, email: user?.email ?? '' })} onPress={() => router.push('/profile')} divider />
          <SettingsRow iconName="log-out-outline" tone={T.neutral} title={t('settings.logout')} onPress={() => setConfirm('logout')} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.appearance')}>
          <SettingsRow iconName="contrast-outline" tone={T.neutral} title={t('settings.theme.title')} subtitle={themeLabel} onPress={() => setSheet('theme')} divider />
          <SettingsRow iconName="language-outline" tone={T.ai} title={t('settings.language.title')} subtitle={languageLabel} onPress={() => setSheet('language')} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.cooking')}>
          <SettingsRow iconName="leaf-outline" tone={T.fresh} title={t('settings.diet')} subtitle={t('settings.dietSubtitle')} trailing={{ type: 'value', text: dietLabel }} onPress={() => setSheet('diet')} divider />
          <SettingsRow iconName="people-outline" tone={T.peach} title={t('settings.servings')} trailing={{ type: 'value', text: String(settings.defaultServings) }} onPress={() => setSheet('servings')} divider />
          <SettingsRow iconName="alert-circle-outline" tone={T.danger} title={t('settings.avoid')} subtitle={t('settings.avoidSubtitle')} trailing={{ type: 'value', text: avoidLabel }} onPress={() => setSheet('avoid')} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.pantry')}>
          <SettingsRow
            iconName="notifications-outline"
            tone={T.warn}
            title={t('settings.expiryAlerts')}
            subtitle={NOTIFICATIONS_AVAILABLE ? t('settings.expiryAlertsSubtitle') : t('settings.expiryAlertsExpoGo')}
            trailing={{ type: 'toggle', value: settings.expiryAlertsEnabled && NOTIFICATIONS_AVAILABLE, onChange: (v) => apply({ expiryAlertsEnabled: v }), disabled: !NOTIFICATIONS_AVAILABLE }}
            divider
          />
          {NOTIFICATIONS_AVAILABLE && !permission.granted && (
            <SettingsRow
              iconName="notifications-off-outline"
              tone={T.danger}
              title={t('settings.notificationsOff')}
              subtitle={t('settings.notificationsOffSubtitle')}
              trailing={{ type: 'button', label: permission.canAskAgain ? t('settings.allow') : t('settings.openSettings'), onPress: handleNotifPermission }}
              divider
            />
          )}
          <SettingsRow
            iconName="calendar-outline"
            tone={T.warn}
            title={t('settings.notifyWith')}
            trailing={{ type: 'value', text: tp('common.daysBefore', settings.expiryDaysBefore) }}
            onPress={() => setSheet('days')}
            divider
          />
          <SettingsRow
            iconName="basket-outline"
            tone={T.fresh}
            title={t('settings.shelf')}
            subtitle={t('settings.shelfSubtitle')}
            trailing={{ type: 'value', text: settings.shoppingShelfDays ? tp('common.days', settings.shoppingShelfDays) : t('settings.automatic') }}
            onPress={() => setSheet('shelf')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.sync')}>
          <SettingsRow
            iconName="sync-outline"
            tone={T.dairy}
            title={syncTitle}
            subtitle={pendingCount > 0 ? t('settings.syncWillSend') : timeAgo(lastSync, t, tp)}
            trailing={{ type: 'button', label: t('settings.syncButton'), onPress: retryNow, busy: isRetrying }}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.permissions')}>
          <SettingsRow iconName="camera-outline" tone={T.peach} title={t('settings.camera')} subtitle={t('settings.cameraSubtitle', { status: permLabel(camera?.granted) })} onPress={() => Linking.openSettings()} divider />
          <SettingsRow iconName="images-outline" tone={T.neutral} title={t('settings.gallery')} subtitle={t('settings.gallerySubtitle', { status: permLabel(media?.granted) })} onPress={() => Linking.openSettings()} divider />
          <SettingsRow iconName="scan-outline" tone={T.ai} title={t('settings.testPhotos')} subtitle={t('settings.testPhotosSubtitle', { used: Math.min(photos, MAX_TEST_PHOTOS), max: MAX_TEST_PHOTOS })} trailing={{ type: 'none' }} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.accessibility')}>
          <SettingsRow
            iconName="pulse-outline"
            tone={T.neutral}
            title={t('settings.reduceMotion.title')}
            subtitle={motionLabel}
            onPress={() => setSheet('motion')}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.info')}>
          <SettingsRow iconName="document-text-outline" tone={T.neutral} title={t('settings.terms')} onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })} divider />
          <SettingsRow iconName="shield-checkmark-outline" tone={T.neutral} title={t('settings.privacy')} onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })} divider />
          <SettingsRow iconName="information-circle-outline" tone={T.neutral} title={t('settings.version')} subtitle={`Food AI ${version}`} trailing={{ type: 'none' }} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.beta')}>
          <SettingsRow
            iconName="paper-plane-outline"
            tone={T.warn}
            title={t('settings.testNotice')}
            subtitle={t('settings.testNoticeSubtitle', { count: scheduledCount })}
            trailing={{ type: 'button', label: t('settings.send'), onPress: handleTest, busy: isSendingTest }}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.dataZone')}>
          <SettingsRow iconName="trash-outline" tone={T.danger} title={t('settings.wipe')} subtitle={t('settings.wipeSubtitle')} destructive onPress={() => setConfirm('wipe')} divider />
          <SettingsRow iconName="close" tone={T.danger} title={t('settings.deleteAccount')} subtitle={t('settings.deleteAccountSubtitle')} destructive onPress={() => setConfirm('deleteAccount')} />
        </SettingsSection>
      </ScrollView>

      <OptionSheet<ThemeMode>
        visible={sheet === 'theme'}
        title={t('settings.theme.sheetTitle')}
        emphasis={t('settings.theme.sheetEmphasis')}
        description={t('settings.theme.sheetDescription')}
        options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
        value={prefs.themeMode}
        onSelect={prefs.setThemeMode}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<LanguageSetting>
        visible={sheet === 'language'}
        title={t('settings.language.sheetTitle')}
        emphasis={t('settings.language.sheetEmphasis')}
        description={t('settings.language.sheetDescription')}
        options={(['system', 'es', 'en'] as const).map((v) => ({ value: v, label: t(`settings.language.${v}`) }))}
        value={prefs.language}
        onSelect={prefs.setLanguage}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<ReduceMotionSetting>
        visible={sheet === 'motion'}
        title={t('settings.reduceMotion.sheetTitle')}
        emphasis={t('settings.reduceMotion.sheetEmphasis')}
        description={t('settings.reduceMotion.sheetDescription')}
        options={(['system', 'on', 'off'] as const).map((v) => ({ value: v, label: t(`settings.reduceMotion.${v}`) }))}
        value={prefs.reduceMotion}
        onSelect={prefs.setReduceMotion}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<DietaryPreference>
        visible={sheet === 'diet'}
        title={t('settings.dietSheet.title')}
        emphasis={t('settings.dietSheet.emphasis')}
        description={t('settings.dietSheet.description')}
        options={DIETARY_OPTIONS.map((d) => ({ value: d.key, label: t(`common.diets.${d.key}`) }))}
        value={settings.defaultDiet}
        onSelect={(v) => apply({ defaultDiet: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number>
        visible={sheet === 'servings'}
        title={t('settings.servingsSheet.title')}
        emphasis={t('settings.servingsSheet.emphasis')}
        description={t('settings.servingsSheet.description')}
        options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: tp('common.servings', n) }))}
        value={settings.defaultServings}
        onSelect={(v) => apply({ defaultServings: v })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number>
        visible={sheet === 'days'}
        title={t('settings.daysSheet.title')}
        emphasis={t('settings.daysSheet.emphasis')}
        options={[1, 2, 3].map((n) => ({ value: n, label: tp('common.daysBefore', n) }))}
        value={settings.expiryDaysBefore}
        onSelect={(v) => apply({ expiryDaysBefore: v as 1 | 2 | 3 })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<number | null>
        visible={sheet === 'shelf'}
        title={t('settings.shelfSheet.title')}
        emphasis={t('settings.shelfSheet.emphasis')}
        description={t('settings.shelfSheet.description')}
        options={[
          { value: null, label: t('settings.automatic'), hint: t('settings.shelfSheet.automaticHint') },
          ...[3, 5, 7, 14, 30].map((n) => ({ value: n, label: tp('common.days', n) })),
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
        title={t('settings.logoutDialog.title')}
        titleEmphasis={t('settings.logoutDialog.emphasis')}
        message={t('settings.logoutDialog.message')}
        cancelText={t('common.cancel')}
        onCancel={() => setConfirm(null)}
        confirmText={t('settings.logout')}
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
        title={t('settings.wipeDialog.title')}
        titleEmphasis={t('settings.wipeDialog.emphasis')}
        message={pendingCount > 0 ? tp('settings.wipeDialog.messagePending', pendingCount) : t('settings.wipeDialog.message')}
        cancelText={t('common.cancel')}
        onCancel={() => setConfirm(null)}
        confirmText={t('settings.wipeDialog.confirm')}
        confirmTone="danger"
        onConfirm={async () => {
          setConfirm(null);
          await LocalStorage.clearAllUserData();
          setNotice({ title: t('settings.wipeDialog.doneTitle'), emphasis: t('settings.wipeDialog.doneEmphasis'), message: t('settings.wipeDialog.doneMessage'), type: 'success' });
        }}
      />
      <M3Dialog
        visible={confirm === 'deleteAccount'}
        type="error"
        iconName="close-circle-outline"
        title={t('settings.deleteDialog.title')}
        titleEmphasis={t('settings.deleteDialog.emphasis')}
        message={t('settings.deleteDialog.message')}
        cancelText={t('common.cancel')}
        onCancel={closeDeleteDialog}
        onDismiss={closeDeleteDialog}
        confirmText={t('settings.deleteDialog.confirm')}
        confirmTone="danger"
        confirmLoading={isDeleting}
        onConfirm={handleDeleteAccount}
      >
        <View style={styles.deleteField}>
          <AppText variant="metadata" weight="semibold" color={colors.textSecondary}>
            {t('settings.deleteDialog.passwordLabel')}
          </AppText>
          <TextInput
            value={deletePassword}
            onChangeText={(v) => {
              setDeletePassword(v);
              if (deleteError) setDeleteError(null);
            }}
            placeholder={t('settings.deleteDialog.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
            accessibilityLabel={t('settings.deleteDialog.passwordLabel')}
            style={[styles.deleteInput, deleteError ? styles.deleteInputError : null]}
          />
          {deleteError ? (
            <AppText variant="bodySmall" color={colors.m3.error} accessibilityLiveRegion="polite">
              {deleteError}
            </AppText>
          ) : null}
        </View>
      </M3Dialog>
      <M3Dialog
        visible={notice !== null}
        type={notice?.type ?? 'success'}
        title={notice?.title ?? ''}
        titleEmphasis={notice?.emphasis}
        message={notice?.message ?? ''}
        onConfirm={async () => {
          setNotice(null);
          if (accountDeleted) {
            await AuthService.finishAccountDeletion();
            router.replace('/login');
          }
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
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
  deleteField: {
    gap: 8,
    marginTop: 4,
  },
  deleteInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceVariant,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  deleteInputError: {
    borderColor: c.m3.error,
  },
}));
