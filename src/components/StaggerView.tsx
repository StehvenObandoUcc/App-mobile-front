import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle, StyleProp, Easing } from 'react-native';

export type StaggerViewProps = {
  index?: number;
  delayMs?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * StaggerView — entrada escalonada con fade + slide-up nativo (60 fps).
 * index controla el delay: cada elemento espera index * delayMs ms.
 */
export function StaggerView({
  index = 0,
  delayMs = 55,
  duration = 300,
  style,
  children,
}: StaggerViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = index * delayMs;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

