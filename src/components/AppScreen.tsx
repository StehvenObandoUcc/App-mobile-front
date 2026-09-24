import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  PanResponder,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing } from '../theme';

const MAIN_TABS = ['/', '/inventory', '/recipes', '/shopping-list'];

export type AppScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
  style?: any;
  /** Activa el deslizamiento horizontal limpio entre las 4 pestañas principales */
  enableSwipeTabs?: boolean;
};

let lastActiveTabIndex = 0;

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

  // ── Mini-transición de entrada con inclinación orgánica (tilt) a 60 fps ───
  const entranceX = useRef(new Animated.Value(0)).current;
  const entranceTiltNum = useRef(new Animated.Value(0)).current;
  const entranceOpacity = useRef(new Animated.Value(1)).current;
  const entranceScale = useRef(new Animated.Value(1)).current;

  // ── Arrastre interactivo en tiempo real con inclinación física suave ──────
  const dragX = useRef(new Animated.Value(0)).current;

  const dragTilt = dragX.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: ['-2.2deg', '0deg', '2.2deg'],
    extrapolate: 'clamp',
  });

  const dragScale = dragX.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0.982, 1, 0.982],
    extrapolate: 'clamp',
  });

  const entranceTilt = entranceTiltNum.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  useEffect(() => {
    isNavigatingRef.current = false;
    dragX.setValue(0);

    // Mini-animación direccional con inclinación hacia la vista siguiente/anterior
    if (currentTabIndex !== -1) {
      const direction = currentTabIndex >= lastActiveTabIndex ? 1 : -1;
      lastActiveTabIndex = currentTabIndex;

      entranceX.setValue(direction * 22);
      entranceTiltNum.setValue(direction * 1.8);
      entranceOpacity.setValue(0.88);
      entranceScale.setValue(0.988);

      Animated.parallel([
        Animated.timing(entranceX, {
          toValue: 0,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(entranceTiltNum, {
          toValue: 0,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(entranceScale, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      entranceX.setValue(0);
      entranceTiltNum.setValue(0);
      entranceOpacity.setValue(1);
      entranceScale.setValue(1);
    }
  }, [pathname, currentTabIndex, entranceX, entranceTiltNum, entranceOpacity, entranceScale, dragX]);

  const navigateToTab = (targetIndex: number) => {
    const curr = currentTabIndexRef.current;
    if (targetIndex < 0 || targetIndex >= MAIN_TABS.length) return;
    if (targetIndex === curr) return;
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    router.push(MAIN_TABS[targetIndex] as any);

    // Timeout de seguridad que garantiza el desbloqueo bajo cualquier escenario
    setTimeout(() => {
      isNavigatingRef.current = false;
      dragX.setValue(0);
    }, 280);
  };

  // Detector de deslizamiento horizontal con arco natural para el pulgar
  // Permite desviaciones diagonales normales sin perder el gesto ni bloquear el scroll vertical
  const screenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return false;
        const { dx, dy } = gestureState;
        // Captura con umbral amigable (12px y ángulo permisivo de hasta ~41° respecto a la horizontal)
        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15;
      },
      onPanResponderGrant: () => {
        dragX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return;
        const rawDx = gestureState.dx;
        const curr = currentTabIndexRef.current;
        // Resistencia suave en los bordes para no intentar deslizar más allá de las pestañas límite
        if (curr === 0 && rawDx > 0) {
          dragX.setValue(Math.min(rawDx * 0.15, 20));
          return;
        }
        if (curr === MAIN_TABS.length - 1 && rawDx < 0) {
          dragX.setValue(Math.max(rawDx * 0.15, -20));
          return;
        }
        // Respuesta elástica en tiempo real: traslación e inclinación física suave
        const clamped = Math.max(Math.min(rawDx * 0.45, 95), -95);
        dragX.setValue(clamped);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        Animated.spring(dragX, {
          toValue: 0,
          tension: 180,
          friction: 12,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipeRef.current || isNavigatingRef.current) return;
        const { dx, vx } = gestureState;
        const curr = currentTabIndexRef.current;

        // Deslizar hacia la izquierda (dedo a la izquierda) -> Pestaña siguiente
        if ((dx < -24 || vx < -0.2) && curr < MAIN_TABS.length - 1) {
          navigateToTab(curr + 1);
          Animated.timing(dragX, {
            toValue: -100,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
          });
        }
        // Deslizar hacia la derecha (dedo a la derecha) -> Pestaña anterior
        else if ((dx > 24 || vx > 0.2) && curr > 0) {
          navigateToTab(curr - 1);
          Animated.timing(dragX, {
            toValue: 100,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            dragX.setValue(0);
          });
        } else {
          // Rebote elástico si no superó el umbral
          Animated.spring(dragX, {
            toValue: 0,
            tension: 180,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }
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
        style={[
          styles.container,
          {
            opacity: entranceOpacity,
            transform: [
              { translateX: entranceX },
              { rotate: entranceTilt },
              { scale: entranceScale },
            ],
          },
        ]}
        {...(canSwipe ? screenPanResponder.panHandlers : {})}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateX: dragX },
                { rotate: dragTilt },
                { scale: dragScale },
              ],
            },
          ]}
        >
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
