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

    if (!isAuthenticated && !inLoginScreen) {
      // Bloquear acceso no autenticado y redirigir inmediatamente a login
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
  const showBottomNav = isAuthenticated && !hideBottomNavOn.includes(pathname);

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
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="shopping-list"
          options={{ title: 'Lista de Compras' }}
        />
        <Stack.Screen
          name="scan"
          options={{ title: 'Escanear Alimentos' }}
        />
        <Stack.Screen
          name="scan-result"
          options={{ title: 'Revisar Detección' }}
        />
        <Stack.Screen
          name="inventory"
          options={{ title: 'Mi Inventario' }}
        />
        <Stack.Screen
          name="recipes"
          options={{ title: 'Recetas Sugeridas' }}
        />
        <Stack.Screen
          name="recipe-detail"
          options={{ title: 'Preparar Receta' }}
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
