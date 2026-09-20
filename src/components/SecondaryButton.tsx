import React, { useRef } from 'react';
import { Text, StyleSheet, ActivityIndicator, View, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: 'outline' | 'tint';
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function SecondaryButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  iconName,
  variant = 'tint',
  accessibilityLabel,
  accessibilityHint,
}: SecondaryButtonProps) {
  const isDisabled = disabled || isLoading;
  const isOutline = variant === 'outline';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        style={[
          styles.button,
          isOutline ? styles.buttonOutline : styles.buttonTint,
          isDisabled && styles.disabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#B94E35" size="small" />
        ) : (
          <View style={styles.content}>
            {iconName && (
              <Ionicons
                name={iconName}
                size={18}
                color={isOutline ? '#66534A' : '#B94E35'}
                style={styles.icon}
              />
            )}
            <Text style={[styles.title, isOutline ? styles.titleOutline : styles.titleTint]}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonTint: {
    backgroundColor: '#FBE9E2',
  },
  buttonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EBDDD2',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  titleTint: {
    color: '#B94E35',
  },
  titleOutline: {
    color: '#2B211D',
  },
  disabled: {
    opacity: 0.5,
  },
});
