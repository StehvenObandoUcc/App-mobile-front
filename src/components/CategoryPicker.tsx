import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { IngredientCategory } from '../types';
import { colors, radii, CATEGORY_LIST } from '../theme';

/**
 * CategoryPicker — Despensa-Formulario.dc.html
 * Cuadrícula de 3 columnas con fichas de 64 dp. La elegida toma su pastel + anillo cacao;
 * las demás en avena. Muestra 5 + «N más»; al tocarlo se despliegan todas.
 */
export type CategoryPickerProps = {
  value: IngredientCategory;
  onChange: (value: IngredientCategory) => void;
};

const VISIBLE = 5;

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const selectedIndex = CATEGORY_LIST.findIndex((c) => c.key === value);
  // Si la categoría elegida está entre las ocultas, se arranca desplegado.
  const [expanded, setExpanded] = useState(selectedIndex >= VISIBLE);
  const items = expanded ? CATEGORY_LIST : CATEGORY_LIST.slice(0, VISIBLE);
  const hiddenCount = CATEGORY_LIST.length - VISIBLE;

  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Categoría">
      {items.map((c) => {
        const selected = c.key === value;
        const tone = colors.categories[c.key];
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(c.key)}
            style={({ pressed }) => [
              styles.cell,
              { backgroundColor: selected ? tone.background : colors.surfaceVariant },
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={c.label}
          >
            <Ionicons name={c.icon} size={20} color={selected ? tone.text : colors.textPrimary} />
            <AppText variant="metadata" weight={selected ? 'semibold' : 'medium'} color={selected ? tone.text : colors.textPrimary} numberOfLines={1}>
              {c.label}
            </AppText>
            {selected && <View pointerEvents="none" style={styles.ring} />}
          </Pressable>
        );
      })}
      {!expanded && hiddenCount > 0 && (
        <Pressable
          onPress={() => setExpanded(true)}
          style={({ pressed }) => [styles.cell, { backgroundColor: colors.surfaceVariant }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${hiddenCount} categorías más`}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
          <AppText variant="metadata" color={colors.textPrimary}>{`${hiddenCount} más`}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    // 3 columnas con 2 huecos de 8 dp
    width: '31.8%',
    flexGrow: 1,
    maxWidth: '33.3%',
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});
