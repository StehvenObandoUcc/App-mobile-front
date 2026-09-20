import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <Ionicons name="search-outline" size={20} color="#66534A" style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#96857C"
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
          <Ionicons name="close-circle" size={18} color="#66534A" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: '#F8EDE2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#2B211D',
  },
  clearButton: {
    padding: 4,
  },
});
