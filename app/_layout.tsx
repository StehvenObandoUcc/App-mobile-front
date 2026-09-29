import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
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

// Avisos de vencimiento: mostrar la notificación también con la app abierta.
configureNotifications();
// Fuente de marca Outfit (Despensa Tonal).
import { useBrandFonts } from '../src/hooks/useBrandFonts';

export default function Layout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const brandFontsReady = useBrandFonts();
  // Si la fuente tarda más de 3 s, se sigue con la del sistema para no bloquear el arranque.
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontWaitExpired(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Mantiene programados los avisos de vencimiento (y los quita al cerrar sesión).
  useExpiryReminderSync(isHydrated && isAuthenticated, pathname);

  useEffect(() => {
    if (!isHydrated) return;

    const inLoginScreen = segments[0] === 'login';

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
  if (!isHydrated || (!brandFontsReady && !fontWaitExpired)) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.iconCircle}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={styles.splashTitle}>Food AI Assistant</Text>
        <Text style={styles.splashSubtitle}>Verificando credenciales seguras...</Text>
      </View>
    );
  }

  const hideBottomNavOn = ['/login', '/scan', '/scan-result', '/recipe-detail', '/settings', '/design-catalog'];
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
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.circular,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  splashTitle: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
  },
});
