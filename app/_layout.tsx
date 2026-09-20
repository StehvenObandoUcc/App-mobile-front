import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Layout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
          <ActivityIndicator size="large" color="#B94E35" />
        </View>
        <Text style={styles.splashTitle}>Food AI Assistant</Text>
        <Text style={styles.splashSubtitle}>Verificando credenciales seguras...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFF9F2' },
        headerTintColor: '#2B211D',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#FFF9F2' },
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
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFF9F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2B211D',
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#66534A',
  },
});
