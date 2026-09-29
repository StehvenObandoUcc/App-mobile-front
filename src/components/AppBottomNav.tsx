import React, { useRef, useEffect, useSyncExternalStore } from 'react';
import { View, StyleSheet, Pressable, PanResponder, Animated, Easing } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../hooks/useShoppingList';
import { CountBadge } from './CountBadge';
import { isBottomNavHidden, subscribeBottomNav } from '../utils/nav-visibility';
import { colors, typography, spacing, radii, elevations } from '../theme';
import {
  MAIN_TABS,
  setSwipeNavigation,
  getSwipeTransition,
} from '../utils/tabSwipeState';

import { Text } from './Text';
export const NAV_HEIGHT = 72; // Organismos.dc.html: barra flotante de 72 dp
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

  const navHidden = useSyncExternalStore(subscribeBottomNav, isBottomNavHidden, isBottomNavHidden);
  const bottomInset = Math.max(insets.bottom, 0);
  const bottomPosition = bottomInset + NAV_BOTTOM_OFFSET;

  const tabs: {
    index: number;
    label: string;
    a11y: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    active: boolean;
    badge?: number;
  }[] = [
    { index: 0, label: 'Inicio', a11y: 'Inicio', icon: 'home-outline', iconActive: 'home', active: isHome },
    { index: 1, label: 'Despensa', a11y: 'Despensa', icon: 'basket-outline', iconActive: 'basket', active: isInventory },
    { index: 2, label: 'Recetas', a11y: 'Recetas', icon: 'restaurant-outline', iconActive: 'restaurant', active: isRecipes },
    {
      index: 3,
      label: 'Compras',
      a11y: pendingItems.length > 0 ? `Compras, ${pendingItems.length} pendientes` : 'Compras',
      icon: 'cart-outline',
      iconActive: 'cart',
      active: isShopping,
      badge: pendingItems.length,
    },
  ];

  const renderTab = (t: (typeof tabs)[number]) => (
    <Pressable
      key={t.label}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
      onPress={() => navigateToTab(t.index)}
      accessibilityRole="tab"
      accessibilityState={{ selected: t.active }}
      accessibilityLabel={t.a11y}
    >
      {t.active ? (
        // Pestaña activa: píldora durazno con icono + etiqueta (Organismos.dc.html)
        <Animated.View style={[styles.activePill, { transform: [{ scale: pillScale }], opacity: pillOpacity }]}>
          <Ionicons name={t.iconActive} size={22} color={colors.ink} />
          <Text style={styles.activeLabel} numberOfLines={1}>
            {t.label}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.idleIcon}>
          <Ionicons name={t.icon} size={22} color={colors.navIconIdle} />
          {t.badge !== undefined && t.badge > 0 && (
            <View style={styles.badge} pointerEvents="none">
              <CountBadge count={t.badge} />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );

  // Oculta mientras una pantalla muestra su propia barra flotante (modo selección).
  if (navHidden) return null;

  return (
    <View style={[styles.bottomNavWrapper, { bottom: bottomPosition }]} {...navPanResponder.panHandlers}>
      <Animated.View
        style={[
          styles.bottomNavContainer,
          { transform: [{ translateX: navDragX }, { rotate: navDragTilt }, { scale: navDragScale }] },
        ]}
      >
        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* FAB central de escaneo: squircle tomate con icono cacao */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Escanear alimentos con la cámara"
        >
          {/* Icono del mockup: marco de escaneo + lente circular al centro */}
          <Ionicons name="scan-outline" size={26} color={colors.ink} />
          <View style={styles.fabLens} pointerEvents="none" />
        </Pressable>

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Organismos.dc.html / Despensa.dc.html: barra cacao flotante de 72 dp, radio 36, márgenes 14.
  bottomNavWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999,
  },
  bottomNavContainer: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: radii.floatingNav,
    paddingHorizontal: spacing.sm,
    ...elevations.lg,
  },
  navItem: {
    minWidth: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 25,
    backgroundColor: colors.primaryContainer,
  },
  activeLabel: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLens: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
