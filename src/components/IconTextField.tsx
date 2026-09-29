import React, { forwardRef, useState } from 'react';
import { View, StyleSheet, Pressable, TextInputProps } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { colors, radii, typography } from '../theme';

/**
 * IconTextField — campo con etiqueta e icono (Login-Formulario.dc.html).
 * 56 dp, radio 16, borde outline 1 → cacao 2 al enfocar. `secure` agrega el ojo para mostrar la contraseña.
 */
export type IconTextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
};

export const IconTextField = forwardRef<RNTextInput, IconTextFieldProps>(function IconTextField(
  { label, iconName, secure = false, onFocus, onBlur, ...inputProps },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.group}>
      <AppText variant="bodySmall" weight="semibold">
        {label}
      </AppText>
      <View style={[styles.box, focused && styles.boxFocused, secure && styles.boxSecure]}>
        <Ionicons name={iconName} size={20} color={colors.textSecondary} />
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={secure && !visible}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secure && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  box: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.m3.outline,
    backgroundColor: colors.surface,
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
});
