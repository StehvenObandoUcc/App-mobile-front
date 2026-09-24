import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, Animated, Easing } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../hooks/useShoppingList';
import { colors, typography, spacing, radii, elevations } from '../theme';
import {
  MAIN_TABS,
  setSwipeNavigation,
  getSwipeTransition,
} from '../utils/tabSwipeState';

export const NAV_HEIGHT = 64;
export const NAV_BOTTOM_OFFSET = 12;

export const getBottomContentPadding = (bottomInset: number) =>
  NAV_HEIGHT + Math.max(bottomInset, 0) + NAV_BOTTOM_OFFSET + 16;

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { pendingItems } = useShoppingList();
  const isNavigatingRef = useRef(false);

  // Micro-animación nativa y suave para la píldora activa de navegación
  const pillScale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(1)).current;

  // Arrastre interactivo en la barra con traslación e inclinación elástica suave
  const navDragX = useRef(new Animated.Value(0)).current;

  const navDragTilt = navDragX.interpolate({
    inputRange: [-60, 0, 60],
    outputRange: ['-1.8deg', '0deg', '1.8deg'],
    extrapolate: 'clamp',
  });

  const navDragScale = navDragX.interpolate({
    inputRange: [-60, 0, 60],
    outputRange: [0.985, 1, 0.985],
    extrapolate: 'clamp',
  });

  const isHome = pathname === '/' || pathname === '/index' || pathname === '';
  const isInventory = pathname.startsWith('/inventory');
  const isRecipes = pathname.startsWith('/recipes');
  const isShopping = pathname.startsWith('/shopping-list');

  const currentTabIndex = isHome ? 0 : isInventory ? 1 : isRecipes ? 2 : isShopping ? 3 : -1;
  const currentTabIndexRef = useRef(currentTabIndex);
  currentTabIndexRef.current = currentTabIndex;

  useEffect(() => {
    isNavigatingRef.current = false;
    const { isSwipe } = getSwipeTransition();

    if (isSwipe) {
      // Micro-animación pop suave (escala 0.88 -> 1.0) al cambiar de pestaña mediante swipe
      pillScale.setValue(0.88);
      pillOpacity.setValue(0.7);
      Animated.parallel([
        Animated.spring(pillScale, {
          toValue: 1,
          tension: 180,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(pillOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Si fue una pulsación directa sin deslizar (ej. Inicio a Recetas),
      // se establece inmediatamente sin animación para máxima rapidez y limpieza.
      pillScale.setValue(1);
      pillOpacity.setValue(1);
    }
  }, [pathname, pillScale, pillOpacity]);

  const navigateToTab = (targetIndex: number) => {
    const curr = currentTabIndexRef.current;
    if (targetIndex < 0 || targetIndex >= MAIN_TABS.length) return;
    if (targetIndex === curr) return;
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    router.push(MAIN_TABS[targetIndex] as any);

    // Timeout de seguridad que previene bloqueos bajo cualquier circunstancia
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 280);
  };

  const navPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // No capturar en capture phase para no bloquear los eventos de pulsación normal sobre las pestañas
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (currentTabIndexRef.current === -1 || isNavigatingRef.current) return false;
        const { dx, dy } = gestureState;
        // Solo captura deslizamiento horizontal claro sobre la barra (umbral de 24px con ángulo horizontal dominante)
        return Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.4;
      },
      onPanResponderGrant: () => {
        navDragX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (currentTabIndexRef.current === -1 || isNavigatingRef.current) return;
        const rawDx = gestureState.dx;
        const curr = currentTabIndexRef.current;
        if (curr === 0 && rawDx > 0) {
          navDragX.setValue(Math.min(rawDx * 0.15, 10));
          return;
        }
        if (curr === MAIN_TABS.length - 1 && rawDx < 0) {
          navDragX.setValue(Math.max(rawDx * 0.15, -10));
          return;
        }
        const clamped = Math.max(Math.min(rawDx * 0.35, 40), -40);
        navDragX.setValue(clamped);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        Animated.spring(navDragX, {
          toValue: 0,
          tension: 200,
          friction: 12,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderRelease: (_, gestureState) => {
        if (currentTabIndexRef.current === -1 || isNavigatingRef.current) return;
        const { dx, vx } = gestureState;
        const curr = currentTabIndexRef.current;

        // Deslizar con intención hacia la izquierda -> Pestaña siguiente
        if ((dx < -35 || (dx < -20 && vx < -0.35)) && curr < MAIN_TABS.length - 1) {
          setSwipeNavigation(1);
          navigateToTab(curr + 1);
          Animated.spring(navDragX, {
            toValue: 0,
            tension: 200,
            friction: 14,
            useNativeDriver: true,
          }).start();
        }
        // Deslizar con intención hacia la derecha -> Pestaña anterior
        else if ((dx > 35 || (dx > 20 && vx > 0.35)) && curr > 0) {
          setSwipeNavigation(-1);
          navigateToTab(curr - 1);
          Animated.spring(navDragX, {
            toValue: 0,
            tension: 200,
            friction: 14,
            useNativeDriver: true,
          }).start();
        } else {
          // Rebote elástico si no superó el umbral
          Animated.spring(navDragX, {
            toValue: 0,
            tension: 200,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const bottomInset = Math.max(insets.bottom, 0);
  const bottomPosition = bottomInset + NAV_BOTTOM_OFFSET;

  return (
    <View
      style={[
        styles.bottomNavWrapper,
        {
          bottom: bottomPosition,
        },
      ]}
      {...navPanResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.bottomNavContainer,
          {
            transform: [
              { translateX: navDragX },
              { rotate: navDragTilt },
              { scale: navDragScale },
            ],
          },
        ]}
      >
        {/* 1. Inicio */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => navigateToTab(0)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isHome }}
          accessibilityLabel="Inicio"
        >
          {isHome ? (
            <Animated.View
              style={[
                styles.navActivePill,
                { transform: [{ scale: pillScale }], opacity: pillOpacity },
              ]}
            >
              <Ionicons name="home" size={20} color={colors.primary} />
            </Animated.View>
          ) : (
            <Ionicons name="home-outline" size={22} color={colors.textSecondary} />
          )}
          <Text style={isHome ? styles.navLabelActive : styles.navLabel}>Inicio</Text>
        </Pressable>

        {/* 2. Despensa */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => navigateToTab(1)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isInventory }}
          accessibilityLabel="Despensa"
        >
          {isInventory ? (
            <Animated.View
              style={[
                styles.navActivePill,
                { transform: [{ scale: pillScale }], opacity: pillOpacity },
              ]}
            >
              <Ionicons name="basket" size={20} color={colors.primary} />
            </Animated.View>
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
          onPress={() => navigateToTab(2)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isRecipes }}
          accessibilityLabel="Recetas"
        >
          {isRecipes ? (
            <Animated.View
              style={[
                styles.navActivePill,
                { transform: [{ scale: pillScale }], opacity: pillOpacity },
              ]}
            >
              <Ionicons name="restaurant" size={20} color={colors.primary} />
            </Animated.View>
          ) : (
            <Ionicons name="restaurant-outline" size={22} color={colors.textSecondary} />
          )}
          <Text style={isRecipes ? styles.navLabelActive : styles.navLabel}>Recetas</Text>
        </Pressable>

        {/* 5. Compras */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.cardPressed]}
          onPress={() => navigateToTab(3)}
          accessibilityRole="tab"
          accessibilityState={{ selected: isShopping }}
          accessibilityLabel="Lista de Compras"
        >
          <View style={{ position: 'relative' }}>
            {isShopping ? (
              <Animated.View
                style={[
                  styles.navActivePill,
                  { transform: [{ scale: pillScale }], opacity: pillOpacity },
                ]}
              >
                <Ionicons name="cart" size={20} color={colors.primary} />
              </Animated.View>
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
      </Animated.View>
    </View>
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
