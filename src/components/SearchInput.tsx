import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

export type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

export function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Buscar alimentos o ingredientes...',
}: SearchInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel="Buscar en inventario"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={8}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.circular,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: spacing.xs,
  },
});
