import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { CODE_LENGTH, sanitizeCode } from '../utils/auth-flow';

/**
 * CodeField — código de 6 dígitos: un solo TextInput numérico (invisible) sobre 6 casillas.
 * Así funcionan el pegado, el autocompletado del SMS/correo y el teclado numérico sin lógica de foco entre casillas.
 */
export type CodeFieldProps = {
  label: string;
  accessibilityLabel: string;
  value: string;
  onChangeText: (code: string) => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
};

export function CodeField({ label, accessibilityLabel, value, onChangeText, onSubmitEditing, autoFocus }: CodeFieldProps) {
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const digits = sanitizeCode(value);
  return (
    <View style={styles.group}>
      <AppText variant="bodySmall" weight="semibold">
        {label}
      </AppText>
      <View style={styles.cells}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(digits.length, CODE_LENGTH - 1);
          return (
            <View
              key={i}
              style={[styles.cell, active && styles.cellActive]}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <AppText variant="headline" weight="medium" align="center">
                {digits[i] ?? ''}
              </AppText>
            </View>
          );
        })}
        <TextInput
          value={digits}
          onChangeText={(v) => onChangeText(sanitizeCode(v))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus={autoFocus}
          caretHidden
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={accessibilityLabel}
          style={styles.hiddenInput}
        />
      </View>
    </View>
  );
}

/** AuthErrorBox — error en línea (mismo patrón que el formulario de login). */
export function AuthErrorBox({ title, message }: { title?: string; message: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={18} color={colors.m3.onErrorContainer} />
      <View style={styles.errorTexts}>
        {title ? (
          <AppText variant="metadata" weight="semibold" color={colors.m3.onErrorContainer}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="metadata" weight="regular" color={colors.m3.onErrorContainer}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  group: {
    gap: 6,
  },
  cells: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.m3.outline,
    backgroundColor: colors.surface,
  },
  cellActive: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill as object,
    opacity: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.m3.errorContainer,
  },
  errorTexts: {
    flex: 1,
    gap: 2,
  },
}));
