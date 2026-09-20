import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../hooks/useShoppingList';

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { pendingItems } = useShoppingList();

  const isHome = pathname === '/' || pathname === '/index';
  const isInventory = pathname.startsWith('/inventory');
  const isRecipes = pathname.startsWith('/recipes');
  const isShopping = pathname.startsWith('/shopping-list');

  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.bottomNavWrapper, { bottom: bottomInset }]}>
      <View style={styles.bottomNavContainer}>
        {/* 1. Inicio */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isHome) router.push('/');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ir a Inicio"
        >
          {isHome ? (
            <View style={styles.navActivePill}>
              <Ionicons name="home" size={20} color="#B94E35" />
            </View>
          ) : (
            <Ionicons name="home-outline" size={22} color="#66534A" />
          )}
          <Text style={isHome ? styles.navLabelActive : styles.navLabel}>Inicio</Text>
        </Pressable>

        {/* 2. Despensa */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isInventory) router.push('/inventory');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ir a Despensa"
        >
          {isInventory ? (
            <View style={styles.navActivePill}>
              <Ionicons name="basket" size={20} color="#B94E35" />
            </View>
          ) : (
            <Ionicons name="basket-outline" size={22} color="#66534A" />
          )}
          <Text style={isInventory ? styles.navLabelActive : styles.navLabel}>Despensa</Text>
        </Pressable>

        {/* 3. Escanear Alimentos (FAB Central) */}
        <Pressable
          style={({ pressed }) => [styles.navFabItem, pressed && styles.cardPressed]}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Escanear alimentos con la cámara"
        >
          <View style={styles.navFabCircle}>
            <Ionicons name="camera" size={22} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* 4. Recetas */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isRecipes) router.push('/recipes');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ir a Recetas"
        >
          {isRecipes ? (
            <View style={styles.navActivePill}>
              <Ionicons name="restaurant" size={20} color="#B94E35" />
            </View>
          ) : (
            <Ionicons name="restaurant-outline" size={22} color="#66534A" />
          )}
          <Text style={isRecipes ? styles.navLabelActive : styles.navLabel}>Recetas</Text>
        </Pressable>

        {/* 5. Compras */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isShopping) router.push('/shopping-list');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ir a Lista de Compras"
        >
          <View style={{ position: 'relative' }}>
            {isShopping ? (
              <View style={styles.navActivePill}>
                <Ionicons name="cart" size={20} color="#B94E35" />
              </View>
            ) : (
              <Ionicons name="cart-outline" size={22} color="#66534A" />
            )}
            {pendingItems.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{pendingItems.length}</Text>
              </View>
            )}
          </View>
          <Text style={isShopping ? styles.navLabelActive : styles.navLabel}>Compras</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F0E4D8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#2B211D',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  navActivePill: {
    backgroundColor: '#FBE9E2',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 11,
    color: '#66534A',
    fontWeight: '500',
    marginTop: 2,
  },
  navLabelActive: {
    fontSize: 11,
    color: '#B94E35',
    fontWeight: '700',
    marginTop: 2,
  },
  navFabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  navFabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B94E35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B94E35',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#B94E35',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
