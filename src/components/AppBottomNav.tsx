import React, { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { View, StyleSheet, Pressable, PanResponder, Animated, Easing, LayoutAnimation, LayoutChangeEvent } from 'react-native';
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

import { AppText } from './AppText';
import { useReduceMotion } from '../hooks/useReduceMotion';
export const NAV_HEIGHT = 72; // Organismos.dc.html: barra flotante de 72 dp
export const NAV_BOTTOM_OFFSET = 12;

export const getBottomContentPadding = (bottomInset: number) =>
  NAV_HEIGHT + Math.max(bottomInset, 0) + NAV_BOTTOM_OFFSET + 16;

const PILL_H = 50;
const MID_BASE = 100; // ancho base del centro de la píldora; se estira con scaleX
const SLIDE_MS = 280;
const EASE = Easing.bezier(0.2, 0, 0, 1);

/** Icono de pestaña: fundido de claro (contorno) a cacao (relleno). */
function TabIcon({
  icon,
  iconActive,
  active,
  reduceMotion,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  active: boolean;
  reduceMotion: boolean;
}) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) v.setValue(active ? 1 : 0);
    else Animated.timing(v, { toValue: active ? 1 : 0, duration: SLIDE_MS, easing: EASE, useNativeDriver: true }).start();
  }, [active, reduceMotion, v]);
  return (
    <View style={styles.iconBox}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Ionicons name={icon} size={22} color={colors.navIconIdle} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: v }]}>
        <Ionicons name={iconActive} size={22} color={colors.ink} />
      </Animated.View>
    </View>
  );
}

/** Etiqueta de la pestaña activa: entra con fundido y un leve desplazamiento. */
function TabLabel({ label, reduceMotion }: { label: string; reduceMotion: boolean }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (!reduceMotion) Animated.timing(v, { toValue: 1, duration: SLIDE_MS, delay: 60, easing: EASE, useNativeDriver: true }).start();
  }, [reduceMotion, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>
      <AppText variant="bodySmall" weight="semibold" color={colors.ink} numberOfLines={1}>
        {label}
      </AppText>
    </Animated.View>
  );
}

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { pendingItems } = useShoppingList();
  const isNavigatingRef = useRef(false);

  const reduceMotion = useReduceMotion();
  // El PanResponder se crea una vez: lee «reducir movimiento» desde una ref para no quedarse con el valor inicial.
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  // ── Píldora activa que se desliza (Paso 5 · Animaciones) ──
  // Se dibuja aparte, detrás de las pestañas, con tres piezas para que todo sea transform nativo:
  // tapa izquierda (círculo 50) + centro (rectángulo que se estira con scaleX) + tapa derecha.
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(PILL_H)).current;
  const pillReady = useRef(false);
  const [pillVisible, setPillVisible] = useState(false);
  const tabLayouts = useRef<Record<number, { x: number; w: number }>>({}).current;

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
    getSwipeTransition(); // consume la marca de swipe (la píldora ya anima en ambos casos)
    if (currentTabIndex === -1) setPillVisible(false);
  }, [pathname]);

  /** Mueve la píldora al tab `index` cuando conocemos su posición real (onLayout). */
  const movePill = (index: number) => {
    const l = tabLayouts[index];
    if (!l) return;
    if (!pillReady.current || reduceMotion) {
      pillX.setValue(l.x);
      pillW.setValue(l.w);
      pillReady.current = true;
      setPillVisible(true);
      return;
    }
    setPillVisible(true);
    Animated.parallel([
      Animated.timing(pillX, { toValue: l.x, duration: SLIDE_MS, easing: EASE, useNativeDriver: true }),
      Animated.timing(pillW, { toValue: l.w, duration: SLIDE_MS, easing: EASE, useNativeDriver: true }),
    ]).start();
  };

  const onTabLayout = (index: number, active: boolean) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts[index] = { x, w: width };
    if (active) movePill(index);
  };

  const navigateToTab = (targetIndex: number) => {
    const curr = currentTabIndexRef.current;
    if (targetIndex < 0 || targetIndex >= MAIN_TABS.length) return;
    if (targetIndex === curr) return;
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    // Las pestañas cambian de ancho (la activa muestra su etiqueta): se anima en el hilo de UI.
    if (!reduceMotionRef.current) {
      LayoutAnimation.configureNext({
        duration: SLIDE_MS,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
    }
    router.navigate(MAIN_TABS[targetIndex] as any); // navigate: no apila pestañas

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
      onLayout={onTabLayout(t.index, t.active)}
      style={({ pressed }) => [styles.navItem, t.active && styles.navItemActive, pressed && styles.pressed]}
      onPress={() => navigateToTab(t.index)}
      accessibilityRole="tab"
      accessibilityState={{ selected: t.active }}
      accessibilityLabel={t.a11y}
    >
      <TabIcon icon={t.icon} iconActive={t.iconActive} active={t.active} reduceMotion={reduceMotion} />
      {t.active && <TabLabel label={t.label} reduceMotion={reduceMotion} />}
      {!t.active && t.badge !== undefined && t.badge > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <CountBadge count={t.badge} />
        </View>
      )}
    </Pressable>
  );

  // FAB: se hunde al presionar y rebota al soltar.
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabIn = () =>
    Animated.timing(fabScale, { toValue: 0.94, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  const fabOut = () =>
    reduceMotion
      ? fabScale.setValue(1)
      : Animated.spring(fabScale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();

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
        {/* Píldora durazno que se desliza detrás de la pestaña activa */}
        {pillVisible && currentTabIndex !== -1 && (
          <View style={styles.pillLayer} pointerEvents="none">
            <Animated.View style={[styles.pillCap, { transform: [{ translateX: pillX }] }]} />
            <Animated.View
              style={[
                styles.pillMid,
                {
                  transform: [
                    { translateX: Animated.add(pillX, PILL_H / 2) },
                    { scaleX: Animated.multiply(Animated.add(pillW, -PILL_H), 1 / MID_BASE) },
                  ],
                },
              ]}
            />
            <Animated.View style={[styles.pillCap, { transform: [{ translateX: Animated.add(pillX, Animated.add(pillW, -PILL_H)) }] }]} />
          </View>
        )}

        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* FAB central de escaneo: squircle tomate con icono cacao */}
        <Pressable
          onPressIn={fabIn}
          onPressOut={fabOut}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Escanear alimentos con la cámara"
        >
          <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
            {/* Icono del mockup: marco de escaneo + lente circular al centro */}
            <Ionicons name="scan-outline" size={26} color={colors.ink} />
            <View style={styles.fabLens} pointerEvents="none" />
          </Animated.View>
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
    minWidth: PILL_H,
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
  },
  iconBox: {
    width: 22,
    height: 22,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  pillCap: {
    position: 'absolute',
    left: 0,
    width: PILL_H,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: colors.primaryContainer,
  },
  pillMid: {
    position: 'absolute',
    left: 0,
    width: MID_BASE,
    height: PILL_H,
    backgroundColor: colors.primaryContainer,
    transformOrigin: 'left center',
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
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
