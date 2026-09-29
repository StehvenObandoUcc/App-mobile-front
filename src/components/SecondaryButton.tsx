import React from 'react';
import { StyleSheet, ActivityIndicator, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing, radii } from '../theme';

/**
 * SecondaryButton — Componentes.dc.html
 * variant 'tint': durazno (primaryContainer) con texto onPrimaryContainer (10.25:1).
 * variant 'outline': blanco con borde outline 1.5 px y texto onSurface.
 */
export type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: 'outline' | 'tint';
  style?: StyleProp<ViewStyle>;
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
  style,
  accessibilityLabel,
  accessibilityHint,
}: SecondaryButtonProps) {
  const isDisabled = disabled || isLoading;
  const isOutline = variant === 'outline';
  const fg = disabled ? colors.textSecondary : isOutline ? colors.textPrimary : colors.onPrimaryContainer;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [
        styles.button,
        isOutline ? styles.outline : styles.tint,
        pressed && !isDisabled && (isOutline ? styles.outlinePressed : styles.tintPressed),
        pressed && !isDisabled && styles.pressedScale,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.content}>
          {iconName && <Ionicons name={iconName} size={20} color={fg} />}
          <AppText variant="body" weight="semibold" color={fg} align="center" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spacing.buttonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  tint: {
    backgroundColor: colors.primaryContainer,
  },
  tintPressed: {
    backgroundColor: colors.m3.inversePrimary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  outlinePressed: {
    backgroundColor: colors.m3.surfaceContainerLow,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexShrink: 1,
  },
  title: {
    flexShrink: 1,
  },
  disabled: {
    backgroundColor: colors.m3.surfaceContainerHigh,
    borderColor: colors.m3.surfaceContainerHigh,
  },
});
