import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { AppBottomNav } from '../src/components';
import { colors, typography, spacing, radii } from '../src/theme';

export default function Layout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;

    const inLoginScreen = segments[0] === 'login';
    const inHomeScreen = !segments[0] || segments[0] === 'index';

    // Permitir acceso libre a Inicio (/); redirigir a login solo en rutas que requieren sesión
    if (!isAuthenticated && !inLoginScreen && !inHomeScreen) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, segments, router]);

  // Pantalla de carga para arranque en frío (evita parpadeos de login antes de verificar SecureStore)
  if (!isHydrated) {
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

  const hideBottomNavOn = ['/login', '/scan', '/scan-result', '/recipe-detail'];
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
          options={{ title: 'Escanear Alimentos', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="scan-result"
          options={{ title: 'Revisar Detección', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="recipe-detail"
          options={{ title: 'Preparar Receta', animation: 'slide_from_right' }}
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
