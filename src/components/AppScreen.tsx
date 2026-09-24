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

  const isHome = pathname === '/' || pathname === '/index';
  const isInventory = pathname.startsWith('/inventory');
  const isRecipes = pathname.startsWith('/recipes');
  const isShopping = pathname.startsWith('/shopping-list');

  const currentTabIndex = isHome ? 0 : isInventory ? 1 : isRecipes ? 2 : isShopping ? 3 : -1;
  const canSwipe = enableSwipeTabs && currentTabIndex !== -1;

  // Animación de entrada nativa a 60 fps (ultra-liviana, 160ms)
  const fadeAnim = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    isNavigatingRef.current = false;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [pathname, fadeAnim, translateY]);

  // Detector de deslizamiento horizontal con filtro angular estricto
  // NUNCA interfiere con el scroll vertical de FlatList o ScrollView
  const screenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipe || isNavigatingRef.current) return false;
        const { dx, dy } = gestureState;
        // Solo captura si el gesto es netamente horizontal (> 35px y ángulo < 22° respecto al eje X)
        return Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 2.6;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipe || isNavigatingRef.current) return;
        const { dx, vx } = gestureState;

        // Deslizar hacia la izquierda (dedo hacia la izquierda) -> Pestaña siguiente
        if ((dx < -45 || vx < -0.35) && currentTabIndex < MAIN_TABS.length - 1) {
          isNavigatingRef.current = true;
          router.replace(MAIN_TABS[currentTabIndex + 1] as any);
        }
        // Deslizar hacia la derecha (dedo hacia la derecha) -> Pestaña anterior
        else if ((dx > 45 || vx > 0.35) && currentTabIndex > 0) {
          isNavigatingRef.current = true;
          router.replace(MAIN_TABS[currentTabIndex - 1] as any);
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
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY }] }]}
        {...(canSwipe ? screenPanResponder.panHandlers : {})}
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
