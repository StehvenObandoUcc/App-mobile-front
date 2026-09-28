import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preferencias locales de la app (pantalla Configuración).
 * Se guardan por dispositivo; no viajan por el Outbox porque no son datos del usuario en la nube.
 */
export type AppSettings = {
  expiryAlertsEnabled: boolean;
  expiryDaysBefore: 1 | 2 | 3;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  expiryAlertsEnabled: true,
  expiryDaysBefore: 2,
};

const KEY = '@food_ai_app_settings_v1';

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const days = parsed.expiryDaysBefore;
    return {
      expiryAlertsEnabled:
        typeof parsed.expiryAlertsEnabled === 'boolean'
          ? parsed.expiryAlertsEnabled
          : DEFAULT_APP_SETTINGS.expiryAlertsEnabled,
      expiryDaysBefore: days === 1 || days === 2 || days === 3 ? days : DEFAULT_APP_SETTINGS.expiryDaysBefore,
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await loadAppSettings()), ...patch };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[AppSettings] No se pudo guardar la configuración:', err);
  }
  return next;
}
