import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DietaryPreference } from '../types';

/**
 * Preferencias locales de la app (pantalla Configuración).
 * Se guardan por dispositivo; no viajan por el Outbox porque no son datos del usuario en la nube.
 */
export type AppSettings = {
  expiryAlertsEnabled: boolean;
  expiryDaysBefore: 1 | 2 | 3;
  /** Dieta que el Chef IA trae marcada al abrir. */
  defaultDiet: DietaryPreference;
  /** Porciones por receta que se piden a la IA. */
  defaultServings: number;
  /** Ingredientes que la IA nunca debe usar (alergias o gustos). */
  avoidIngredients: string[];
  /** Días de vencimiento al pasar compras a la despensa; null = automático según el tipo de alimento. */
  shoppingShelfDays: number | null;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  expiryAlertsEnabled: true,
  expiryDaysBefore: 2,
  defaultDiet: 'any',
  defaultServings: 2,
  avoidIngredients: [],
  shoppingShelfDays: null,
};

const DIETS: DietaryPreference[] = ['any', 'vegetarian', 'vegan', 'keto', 'gluten_free', 'low_carb'] as DietaryPreference[];

const KEY = '@food_ai_app_settings_v1';

export function sanitizeSettings(parsed: Partial<AppSettings>): AppSettings {
  const d = DEFAULT_APP_SETTINGS;
  const days = parsed.expiryDaysBefore;
  const servings = Number(parsed.defaultServings);
  const shelf = parsed.shoppingShelfDays;
  return {
    expiryAlertsEnabled: typeof parsed.expiryAlertsEnabled === 'boolean' ? parsed.expiryAlertsEnabled : d.expiryAlertsEnabled,
    expiryDaysBefore: days === 1 || days === 2 || days === 3 ? days : d.expiryDaysBefore,
    defaultDiet: DIETS.includes(parsed.defaultDiet as DietaryPreference) ? (parsed.defaultDiet as DietaryPreference) : d.defaultDiet,
    defaultServings: Number.isInteger(servings) && servings >= 1 && servings <= 12 ? servings : d.defaultServings,
    avoidIngredients: Array.isArray(parsed.avoidIngredients)
      ? parsed.avoidIngredients.map((x) => String(x).trim()).filter(Boolean).slice(0, 20)
      : d.avoidIngredients,
    shoppingShelfDays: typeof shelf === 'number' && shelf >= 1 && shelf <= 60 ? shelf : null,
  };
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    return sanitizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = sanitizeSettings({ ...(await loadAppSettings()), ...patch });
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[AppSettings] No se pudo guardar la configuración:', err);
  }
  return next;
}
