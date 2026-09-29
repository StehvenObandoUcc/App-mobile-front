import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../src/hooks/useAuth';
import { AppBottomNav, Text } from '../src/components';
import { colors, typography, spacing, radii } from '../src/theme';
import { primeAppPermissionsOnce } from '../src/utils/permissions';
import { useExpiryReminderSync } from '../src/hooks/useExpiryReminderSync';
import {
  configureNotifications,
  requestNotificationPermissionOnce,
  syncExpiryReminders,
} from '../src/services/expiry-notifications';

// Splash nativo (logo «A · Lente» sobre avena): queda visible hasta que la app está lista.
// Se llama en el ámbito global, sin await, como indica la documentación de expo-splash-screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 200 });

// Avisos de vencimiento: mostrar la notificación también con la app abierta.
configureNotifications();
// Fuente de marca Outfit (Despensa Tonal).
import { useBrandFonts } from '../src/hooks/useBrandFonts';
import { LOGO_MARK_URI } from '../src/theme/logoMark';

export default function Layout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const brandFontsReady = useBrandFonts();
  // Si la fuente tarda más de 1,2 s, se sigue con la del sistema para no bloquear el arranque.
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  useEffect(() => {
    // En el APK la fuente va incrustada y carga al instante; en Expo Go viene por red desde Metro.
    const t = setTimeout(() => setFontWaitExpired(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const appReady = isHydrated && (brandFontsReady || fontWaitExpired);
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  // Mantiene programados los avisos de vencimiento (y los quita al cerrar sesión).
  useExpiryReminderSync(isHydrated && isAuthenticated, pathname);

  useEffect(() => {
    if (!isHydrated) return;

    // Sin sesión solo se puede estar en la bienvenida/login o leer los textos legales.
    const inLoginScreen = segments[0] === 'login' || segments[0] === 'legal';

    // Punto de entrada natural: si no hay sesión activa ni modo invitado, dirigir a bienvenida/onboarding
    if (!isAuthenticated && !inLoginScreen) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, segments, router]);

  // Buena práctica: solicitar los permisos necesarios (cámara, galería) una sola vez al
  // arrancar la app con sesión activa, en vez de sorprender al usuario a mitad de una tarea.
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      // En secuencia para no mostrar varios diálogos del sistema a la vez.
      primeAppPermissionsOnce()
        .then(() => requestNotificationPermissionOnce())
        .then((granted) => {
          if (granted) syncExpiryReminders();
        })
        .catch(() => {});
    }
  }, [isHydrated, isAuthenticated]);

  // Pantalla de carga para arranque en frío (evita parpadeos de login antes de verificar SecureStore)
  if (!appReady) {
    return (
      // Igual al splash nativo (mismo logo, mismo tamaño y fondo avena): el paso a la app no «salta».
      <View style={styles.splashContainer} accessibilityLabel="Food AI cargando">
        <Image source={{ uri: LOGO_MARK_URI }} style={styles.splashLogo} fadeDuration={0} />
        <ActivityIndicator size="small" color={colors.ink} style={styles.splashSpinner} />
      </View>
    );
  }

  const hideBottomNavOn = ['/login', '/legal', '/profile', '/scan', '/scan-result', '/recipe-detail', '/settings', '/design-catalog'];
  const showBottomNav = !hideBottomNavOn.includes(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: typography.weights.bold, fontSize: typography.sizes.cardTitle },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="design-catalog" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen
          name="inventory"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="recipes"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="shopping-list"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="scan"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="scan-result"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="legal"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="recipe-detail"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
      {showBottomNav && <AppBottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mismo tamaño que el splash nativo: imageWidth 240 × (540/1024) ≈ 127 dp.
  splashLogo: {
    width: 127,
    height: 127,
    borderRadius: 29,
  },
  splashSpinner: {
    position: 'absolute',
    bottom: '22%',
  },
});
