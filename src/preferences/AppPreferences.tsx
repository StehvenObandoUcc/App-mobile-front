import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  loadAppSettings,
  saveAppSettings,
  DEFAULT_APP_SETTINGS,
  type ThemeMode,
  type LanguageSetting,
  type ReduceMotionSetting,
} from '../storage/app-settings';
import { setActiveLanguageSetting } from '../i18n';

/**
 * Preferencias de presentación (tema, idioma, reducir animaciones).
 * Se leen una vez al arrancar desde `app-settings` y se guardan al cambiarlas.
 * `ready` permite que el layout espere y no «parpadee» con el tema o idioma equivocado.
 */
type AppPreferences = {
  ready: boolean;
  themeMode: ThemeMode;
  language: LanguageSetting;
  reduceMotion: ReduceMotionSetting;
  setThemeMode: (v: ThemeMode) => void;
  setLanguage: (v: LanguageSetting) => void;
  setReduceMotion: (v: ReduceMotionSetting) => void;
};

const Ctx = createContext<AppPreferences>({
  ready: true,
  themeMode: DEFAULT_APP_SETTINGS.themeMode,
  language: DEFAULT_APP_SETTINGS.language,
  reduceMotion: DEFAULT_APP_SETTINGS.reduceMotion,
  setThemeMode: () => {},
  setLanguage: () => {},
  setReduceMotion: () => {},
});

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_APP_SETTINGS.themeMode);
  const [language, setLanguageState] = useState<LanguageSetting>(DEFAULT_APP_SETTINGS.language);
  const [reduceMotion, setReduceMotionState] = useState<ReduceMotionSetting>(DEFAULT_APP_SETTINGS.reduceMotion);

  useEffect(() => {
    let alive = true;
    loadAppSettings()
      .then((s) => {
        if (!alive) return;
        setThemeModeState(s.themeMode);
        setActiveLanguageSetting(s.language);
        setLanguageState(s.language);
        setReduceMotionState(s.reduceMotion);
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setThemeMode = useCallback((v: ThemeMode) => {
    setThemeModeState(v);
    saveAppSettings({ themeMode: v, themeChosen: true }).catch(() => {});
  }, []);
  const setLanguage = useCallback((v: LanguageSetting) => {
    setActiveLanguageSetting(v);
    setLanguageState(v);
    saveAppSettings({ language: v }).catch(() => {});
  }, []);
  const setReduceMotion = useCallback((v: ReduceMotionSetting) => {
    setReduceMotionState(v);
    saveAppSettings({ reduceMotion: v }).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ready, themeMode, language, reduceMotion, setThemeMode, setLanguage, setReduceMotion }),
    [ready, themeMode, language, reduceMotion, setThemeMode, setLanguage, setReduceMotion]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppPreferences(): AppPreferences {
  return useContext(Ctx);
}
