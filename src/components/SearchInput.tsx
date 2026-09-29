import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontStyle } from './AppText';
import { colors, typography, spacing, radii } from '../theme';

import { TextInput } from './Text';
/**
 * SearchInput — Componentes.dc.html
 * 52 dp, píldora avena con borde outline. Foco: fondo blanco + borde cacao 2 px.
 * Botón limpiar de 44 dp reales. `trailingAction` opcional (p. ej. filtros) en botón cacao.
 */
export type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
  trailingAction?: {
    iconName: keyof typeof Ionicons.glyphMap;
    accessibilityLabel: string;
    onPress: () => void;
  };
};

export function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Buscar alimentos o ingredientes…',
  accessibilityLabel = 'Buscar en inventario',
  trailingAction,
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <View style={[styles.container, active && styles.containerActive]}>
      <Ionicons name="search-outline" size={20} color={active ? colors.textPrimary : colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, fontStyle('regular')]}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel}
        multiline={false}
        numberOfLines={1}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          style={({ pressed }) => [styles.actionBtn, pressed && styles.clearPressed]}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
      {trailingAction && (
        <Pressable
          onPress={trailingAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={trailingAction.accessibilityLabel}
          style={({ pressed }) => [styles.actionBtn, styles.trailingBtn, pressed && styles.trailingPressed]}
        >
          <Ionicons name={trailingAction.iconName} size={20} color={colors.onInk} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: spacing.inputHeight,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 18,
    paddingRight: 4,
  },
  containerActive: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingLeft: 17,
    paddingRight: 3,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.circular,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPressed: {
    backgroundColor: colors.m3.surfaceContainer,
  },
  trailingBtn: {
    backgroundColor: colors.ink,
  },
  trailingPressed: {
    backgroundColor: colors.inkPressed,
  },
});
