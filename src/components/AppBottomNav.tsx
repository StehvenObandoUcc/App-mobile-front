import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../hooks/useShoppingList';
import { colors, typography, spacing, radii, elevations } from '../theme';

export const NAV_HEIGHT = 64;
export const NAV_BOTTOM_OFFSET = 12;

export const getBottomContentPadding = (bottomInset: number) =>
  NAV_HEIGHT + Math.max(bottomInset, 0) + NAV_BOTTOM_OFFSET + 16;

const MAIN_TABS = ['/', '/inventory', '/recipes', '/shopping-list'];

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { pendingItems } = useShoppingList();
  const isNavigatingRef = useRef(false);
  const dragX = useRef(new Animated.Value(0)).current;

  const isHome = pathname === '/' || pathname === '/index';
  const isInventory = pathname.startsWith('/inventory');
  const isRecipes = pathname.startsWith('/recipes');
  const isShopping = pathname.startsWith('/shopping-list');

  const currentTabIndex = isHome ? 0 : isInventory ? 1 : isRecipes ? 2 : isShopping ? 3 : -1;

  useEffect(() => {
    isNavigatingRef.current = false;
    Animated.spring(dragX, {
      toValue: 0,
      tension: 140,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pathname, dragX]);

  const navPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (currentTabIndex === -1 || isNavigatingRef.current) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.8;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (currentTabIndex === -1 || isNavigatingRef.current) return;
        // Respuesta elástica suave en tiempo real (30% del desplazamiento real)
        dragX.setValue(gestureState.dx * 0.3);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        Animated.spring(dragX, {
          toValue: 0,
          tension: 140,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderRelease: (_, gestureState) => {
        if (currentTabIndex === -1 || isNavigatingRef.current) return;
        const { dx, vx } = gestureState;

        // Deslizar hacia la izquierda -> Siguiente pestaña
        if ((dx < -28 || vx < -0.25) && currentTabIndex < MAIN_TABS.length - 1) {
          isNavigatingRef.current = true;
          Animated.timing(dragX, {
            toValue: -20,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            router.replace(MAIN_TABS[currentTabIndex + 1] as any);
          });
        }
        // Deslizar hacia la derecha -> Pestaña anterior
        else if ((dx > 28 || vx > 0.25) && currentTabIndex > 0) {
          isNavigatingRef.current = true;
          Animated.timing(dragX, {
            toValue: 20,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            router.replace(MAIN_TABS[currentTabIndex - 1] as any);
          });
        } else {
          // Rebote elástico al soltar sin superar el umbral
          Animated.spring(dragX, {
            toValue: 0,
            tension: 140,
            friction: 9,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const bottomInset = Math.max(insets.bottom, 0);
  const bottomPosition = bottomInset + NAV_BOTTOM_OFFSET;

  return (
    <Animated.View
      style={[
        styles.bottomNavWrapper,
        {
          bottom: bottomPosition,
          transform: [{ translateX: dragX }],
        },
      ]}
      {...navPanResponder.panHandlers}
    >
      <View style={styles.bottomNavContainer}>
        {/* 1. Inicio */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isHome) router.push('/');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: isHome }}
          accessibilityLabel="Inicio"
        >
          {isHome ? (
            <View style={styles.navActivePill}>
              <Ionicons name="home" size={20} color={colors.primary} />
            </View>
          ) : (
            <Ionicons name="home-outline" size={22} color={colors.textSecondary} />
          )}
          <Text style={isHome ? styles.navLabelActive : styles.navLabel}>Inicio</Text>
        </Pressable>

        {/* 2. Despensa */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isInventory) router.push('/inventory');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: isInventory }}
          accessibilityLabel="Despensa"
        >
          {isInventory ? (
            <View style={styles.navActivePill}>
              <Ionicons name="basket" size={20} color={colors.primary} />
            </View>
          ) : (
            <Ionicons name="basket-outline" size={22} color={colors.textSecondary} />
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
            <Ionicons name="camera" size={22} color={colors.textInverse} />
          </View>
        </Pressable>

        {/* 4. Recetas */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isRecipes) router.push('/recipes');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: isRecipes }}
          accessibilityLabel="Recetas"
        >
          {isRecipes ? (
            <View style={styles.navActivePill}>
              <Ionicons name="restaurant" size={20} color={colors.primary} />
            </View>
          ) : (
            <Ionicons name="restaurant-outline" size={22} color={colors.textSecondary} />
          )}
          <Text style={isRecipes ? styles.navLabelActive : styles.navLabel}>Recetas</Text>
        </Pressable>

        {/* 5. Compras */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => {
            if (!isShopping) router.push('/shopping-list');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: isShopping }}
          accessibilityLabel="Lista de Compras"
        >
          <View style={{ position: 'relative' }}>
            {isShopping ? (
              <View style={styles.navActivePill}>
                <Ionicons name="cart" size={20} color={colors.primary} />
              </View>
            ) : (
              <Ionicons name="cart-outline" size={22} color={colors.textSecondary} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomNavWrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radii.floatingNav,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    ...elevations.lg,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: spacing.touchTargetMin,
    minHeight: spacing.touchTargetMin,
  },
  navActivePill: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    borderRadius: radii.circular,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  navLabelActive: {
    fontSize: typography.sizes.caption,
    color: colors.primary,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  navFabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: spacing.touchTargetMin,
    minHeight: spacing.touchTargetMin,
  },
  navFabCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.circular,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: radii.circular,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.micro,
    lineHeight: typography.lineHeights.micro,
    fontWeight: typography.weights.bold,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
