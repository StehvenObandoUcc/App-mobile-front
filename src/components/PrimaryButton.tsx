import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

export type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function PrimaryButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  iconName,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  const isDisabled = disabled || isLoading;

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
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.textInverse} size="small" />
      ) : (
        <View style={styles.content}>
          {iconName && (
            <Ionicons name={iconName} size={20} color={colors.textInverse} style={styles.icon} />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: radii.circular,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  icon: {
    marginRight: spacing.sm,
    alignSelf: 'center',
  },
  title: {
    color: colors.textInverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.2,
    textAlign: 'center',
    flexShrink: 1,
  },
  disabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
});
