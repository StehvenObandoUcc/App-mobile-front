import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  PanResponder,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing } from '../theme';
import {
  MAIN_TABS,
  setSwipeNavigation,
  getSwipeTransition,
} from '../utils/tabSwipeState';

const ENTER_MS = 260;

export type AppScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
  style?: any;
  /** Activa el deslizamiento horizontal limpio entre las 4 pestañas principales */
  enableSwipeTabs?: boolean;
};

export function AppScreen({
  children,
  scrollable = false,
  contentContainerStyle,
  style,
  enableSwipeTabs = true,
}: AppScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigatingRef = useRef(false);

  const isHome = pathname === '/' || pathname === '/index' || pathname === '';
  const isInventory = pathname.startsWith('/inventory');
  const isRecipes = pathname.startsWith('/recipes');
  const isShopping = pathname.startsWith('/shopping-list');

  const currentTabIndex = isHome ? 0 : isInventory ? 1 : isRecipes ? 2 : isShopping ? 3 : -1;
  const canSwipe = enableSwipeTabs && currentTabIndex !== -1;

  const currentTabIndexRef = useRef(currentTabIndex);
  currentTabIndexRef.current = currentTabIndex;
  const canSwipeRef = useRef(canSwipe);
  canSwipeRef.current = canSwipe;

  // ── Swipe entre pestañas (Etapa 6) ─────────────────────────────────────────
  // La pantalla sigue al dedo 1:1; al soltar con intención sale deslizándose y la nueva entra
  // desde el mismo lado. Todo transform/opacity en el hilo nativo. Sin inclinaciones.
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const dragX = useRef(new Animated.Value(0)).current; // arrastre / salida
  const enterX = useRef(new Animated.Value(0)).current; // entrada de la pantalla nueva
  const dragOpacity = dragX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });
  const enterOpacity = enterX.interpolate({
    inputRange: [-width * 0.3, 0, width * 0.3],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    isNavigatingRef.current = false;
    dragX.setValue(0);
    const { isSwipe, direction } = getSwipeTransition();
    // Solo el swipe anima la entrada; un toque en la barra cambia al instante (decisión de UX).
    if (isSwipe && currentTabIndex !== -1 && !reduceMotionRef.current) {
      enterX.setValue(direction * widthRef.current * 0.3);
      Animated.timing(enterX, {
        toValue: 0,
        duration: ENTER_MS,
        easing: Easing.bezier(0.05, 0.7, 0.1, 1), // M3 emphasized decelerate
        useNativeDriver: true,
      }).start();
    } else {
      enterX.setValue(0);
    }
  }, [pathname, currentTabIndex, dragX, enterX]);

  const navigateToTab = (targetIndex: number) => {
    const curr = currentTabIndexRef.current;
    if (targetIndex < 0 || targetIndex >= MAIN_TABS.length) return;
    if (targetIndex === curr) return;
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    // navigate (no push): si la pestaña ya está en la pila vuelve a ella; la pila no crece sin fin.
    router.navigate(MAIN_TABS[targetIndex] as any);

    // Desbloqueo de seguridad
    setTimeout(() => {
      isNavigatingRef.current = false;
      dragX.setValue(0);
    }, 400);
  };

  const springBack = () =>
    Animated.spring(dragX, { toValue: 0, tension: 170, friction: 20, useNativeDriver: true }).start();

  // Detector de deslizamiento horizontal: no roba el scroll vertical ni el de carruseles/chips hijos
  // (no captura en fase de captura: los ScrollView horizontales responden primero).
  const screenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return false;
        return Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6;
      },
      onPanResponderGrant: () => {
        dragX.stopAnimation();
        enterX.stopAnimation();
        enterX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return;
        const curr = currentTabIndexRef.current;
        const atEdge = (curr === 0 && g.dx > 0) || (curr === MAIN_TABS.length - 1 && g.dx < 0);
        // En los extremos hay resistencia elástica; en el resto sigue al dedo 1:1.
        dragX.setValue(atEdge ? g.dx * 0.18 : g.dx);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: springBack,
      onPanResponderRelease: (_, g) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return springBack();
        const curr = currentTabIndexRef.current;
        const w = widthRef.current;
        // Intención: pasar un cuarto de pantalla o un gesto rápido.
        const goNext = (g.dx < -w * 0.25 || (g.dx < -40 && g.vx < -0.3)) && curr < MAIN_TABS.length - 1;
        const goPrev = (g.dx > w * 0.25 || (g.dx > 40 && g.vx > 0.3)) && curr > 0;
        if (!goNext && !goPrev) return springBack();

        const dir: 1 | -1 = goNext ? 1 : -1;
        setSwipeNavigation(dir);
        if (reduceMotionRef.current) {
          navigateToTab(curr + dir);
          return;
        }
        // Sale deslizándose hacia el lado del gesto y entonces navega.
        Animated.timing(dragX, {
          toValue: -dir * w,
          duration: Math.max(120, Math.min(220, (w - Math.abs(g.dx)) / Math.max(Math.abs(g.vx), 1.2))),
          easing: Easing.bezier(0.3, 0, 0.8, 0.15), // M3 emphasized accelerate
          useNativeDriver: true,
        }).start(() => navigateToTab(curr + dir));
      },
    })
  ).current;

  return (
    <SafeAreaView
      style={[styles.safeArea, style]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="dark" />
      <Animated.View
        style={[styles.container, { opacity: enterOpacity, transform: [{ translateX: enterX }] }]}
        {...(canSwipe ? screenPanResponder.panHandlers : {})}
      >
        <Animated.View style={[styles.container, { opacity: dragOpacity, transform: [{ translateX: dragX }] }]}>
          {scrollable ? (
            <ScrollView
              style={styles.container}
              contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.container, contentContainerStyle]}>{children}</View>
          )}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
});
