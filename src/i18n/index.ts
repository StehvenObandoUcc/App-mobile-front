import { useSyncExternalStore } from 'react';
import type { LanguageSetting } from '../storage/app-settings';
import { es } from './es';
import { en } from './en';

/**
 * Idiomas de la app (español / inglés) sin dependencias externas.
 *
 * En componentes:   const { t, lang } = useI18n();   t('settings.title')
 * Fuera de React:   import { t } from '../i18n';      (notificaciones, mensajes de error)
 * Variables:        t('home.greeting', { name: 'Ana' })  →  «Hola, Ana»  (texto: 'Hola, {name}')
 * Plurales:         tp('inventory.items', 3)  usa la clave 'items_one' o 'items_other'.
 *
 * Los textos viven en src/i18n/es/<zona>.ts y src/i18n/en/<zona>.ts. El inglés está tipado con la
 * forma del español: si falta una clave, TypeScript avisa.
 */
export type Language = 'es' | 'en';

const DICTS: Record<Language, unknown> = { es, en };

export function detectSystemLanguage(): Language {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return loc.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

let active: Language = detectSystemLanguage();
const listeners = new Set<() => void>();

/**
 * Copia del idioma activo en `globalThis.__appLanguage` para las utilidades puras
 * (src/utils/dates.ts y otras con pruebas en Node) que no pueden importar este módulo.
 * Ellas lo leen así:  ((globalThis as { __appLanguage?: 'es' | 'en' }).__appLanguage ?? 'es')
 */
function publishLanguage(lang: Language) {
  (globalThis as { __appLanguage?: Language }).__appLanguage = lang;
}
publishLanguage(active);

/** Lo llama AppPreferences al arrancar y cuando el usuario cambia el idioma. */
export function setActiveLanguageSetting(setting: LanguageSetting): void {
  const next: Language = setting === 'system' ? detectSystemLanguage() : setting;
  if (next === active) return;
  active = next;
  publishLanguage(next);
  listeners.forEach((l) => l());
}

export function getLanguage(): Language {
  return active;
}

/** Locale para fechas y números (Intl / toLocaleString). */
export function getLocale(): string {
  return active === 'en' ? 'en-US' : 'es-CO';
}

function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TParams = Record<string, string | number>;

export function t(key: string, params?: TParams): string {
  const raw = lookup(DICTS[active], key) ?? lookup(DICTS.es, key);
  if (raw === undefined) {
    if (__DEV__) console.warn(`[i18n] Falta la clave «${key}»`);
    return key;
  }
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** Plural simple: elige `<key>_one` si count === 1, si no `<key>_other`. `{count}` queda disponible. */
export function tp(key: string, count: number, params?: TParams): string {
  return t(`${key}_${count === 1 ? 'one' : 'other'}`, { count, ...params });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Hook para componentes: se vuelven a pintar cuando cambia el idioma. */
export function useI18n(): { t: typeof t; tp: typeof tp; lang: Language; locale: string } {
  const lang = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { t, tp, lang, locale: lang === 'en' ? 'en-US' : 'es-CO' };
}
