import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

export type StaggerViewProps = {
  index?: number;
  delayMs?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * StaggerView: Componente nativo de entrada escalonada estilo Material 3.
 * Anima opacidad y traslación vertical con curva suave en cascada.
 */
export function StaggerView({
  index = 0,
  delayMs = 40,
  duration = 340,
  style,
  children,
}: StaggerViewProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay: index * delayMs,
      useNativeDriver: true,
    }).start();
  }, [anim, index, delayMs, duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
