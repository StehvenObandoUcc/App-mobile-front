import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

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
        isOutline ? styles.buttonOutline : styles.buttonTint,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {iconName && (
            <Ionicons
              name={iconName}
              size={18}
              color={isOutline ? colors.textSecondary : colors.primary}
              style={styles.icon}
            />
          )}
          <Text style={[styles.title, isOutline ? styles.titleOutline : styles.titleTint]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.circular,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
  },
  buttonTint: {
    backgroundColor: colors.primaryContainer,
  },
  buttonOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.2,
  },
  titleTint: {
    color: colors.primary,
  },
  titleOutline: {
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
});
