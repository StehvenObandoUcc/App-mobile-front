import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInputProps } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { useEnsureFieldVisible, useReleaseField } from './KeyboardAwareScroll';
import { radii, spacing, typography } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * LabeledField — campo de texto con etiqueta visible (átomo de campo de la app).
 * Altura `spacing.inputHeight` (52; `large` = `spacing.fieldHeightLarge`, 56, para los formularios de acceso),
 * radio de campo, borde outline 1 → cacao 2 al enfocar. Opcional: icono a la izquierda, asterisco de obligatorio,
 * pie (`footer`, p. ej. contador de caracteres), `invalid` (borde de error) y `secure` con el ojo mostrar/ocultar.
 * Dentro de un KeyboardAwareScroll se registra para quedar visible sobre el teclado.
 * IconTextField es este mismo campo con icono obligatorio.
 */
export type LabeledFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Contraseña: oculta el texto y agrega el botón mostrar/ocultar. */
  secure?: boolean;
  required?: boolean;
  invalid?: boolean;
  large?: boolean;
  /** Contenido bajo el campo (ayuda, contador). */
  footer?: React.ReactNode;
};

export const LabeledField = forwardRef<RNTextInput, LabeledFieldProps>(function LabeledField(
  { label, iconName, secure = false, required = false, invalid = false, large = false, footer, accessibilityLabel, onFocus, onBlur, ...inputProps },
  ref
) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const groupRef = useRef<View>(null);
  const ensureVisible = useEnsureFieldVisible();
  const release = useReleaseField();
  useEffect(() => () => release(groupRef.current), [release]);
  return (
    <View ref={groupRef} style={styles.group} collapsable={false}>
      <AppText variant="bodySmall" weight="semibold">
        {label}
        {required ? <AppText color={colors.textSecondary}> *</AppText> : null}
      </AppText>
      <View
        style={[
          styles.box,
          large && styles.boxLarge,
          !iconName && styles.boxPlain,
          invalid && styles.boxInvalid,
          focused && styles.boxFocused,
          secure && styles.boxSecure,
        ]}
      >
        {iconName ? <Ionicons name={iconName} size={20} color={colors.textSecondary} /> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={secure && !visible}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            ensureVisible(groupRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            release(groupRef.current);
            onBlur?.(e);
          }}
        />
        {secure && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={visible ? t('molecules.iconTextField.hidePassword') : t('molecules.iconTextField.showPassword')}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {footer}
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  group: {
    gap: 6,
  },
  box: {
    height: spacing.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.m3.outline,
    backgroundColor: colors.surface,
  },
  boxLarge: {
    height: spacing.fieldHeightLarge,
  },
  boxPlain: {
    gap: 0,
  },
  boxInvalid: {
    borderColor: colors.m3.error,
  },
  boxFocused: {
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 15,
  },
  boxSecure: {
    paddingRight: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  eye: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
