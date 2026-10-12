import React from 'react';
import { StyleSheet, ActivityIndicator, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { spacing, radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

/**
 * SecondaryButton — Componentes.dc.html
 * variant 'tint': durazno (primaryContainer) con texto onPrimaryContainer (10.25:1).
 * variant 'outline': blanco con borde outline 1.5 px y texto onSurface.
 * variant 'text': sin fondo, 48 dp, texto Sandía (enlaces de acción como «Usar otro correo»).
 * tone 'danger': borde y texto Ladrillo (error) sobre fondo transparente; para «Eliminar» fuera de un diálogo.
 */
export type SecondaryButtonProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: 'outline' | 'tint' | 'text';
  /** 'danger': contorno/texto en color de error, fondo transparente. Solo para borrar. */
  tone?: 'default' | 'danger';
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
  tone = 'default',
  style,
  accessibilityLabel,
  accessibilityHint,
}: SecondaryButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isDisabled = disabled || isLoading;
  const isOutline = variant === 'outline';
  const isText = variant === 'text';
  const isDanger = tone === 'danger';
  const baseFg = isText ? colors.primary : isOutline ? colors.textPrimary : colors.onPrimaryContainer;
  const fg = disabled ? colors.textSecondary : isDanger ? colors.error.text : baseFg;

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
        isText ? styles.text : isOutline ? styles.outline : styles.tint,
        isDanger && !isText && styles.danger,
        pressed && !isDisabled && (isDanger ? styles.dangerPressed : isText ? styles.textPressed : isOutline ? styles.outlinePressed : styles.tintPressed),
        pressed && !isDisabled && styles.pressedScale,
        disabled && (isText ? styles.textDisabled : styles.disabled),
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

const useStyles = makeStyles((colors) => ({
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
  text: {
    minHeight: spacing.touchTargetMin,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  textDisabled: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.error.text,
  },
  dangerPressed: {
    backgroundColor: colors.error.background,
  },
  textPressed: {
    backgroundColor: colors.surfaceVariant,
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
}));
