import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { IngredientCategory } from '../types';
import { colors, radii, getCategoryConfig } from '../theme';

/** CategoryTag — etiqueta pequeña de familia (22 dp, icono 12, texto 12/600) para filas de lista. */
export function CategoryTag({ category }: { category: IngredientCategory }) {
  const cfg = getCategoryConfig(category);
  const tone = colors.categories[category] || colors.categories.other;
  return (
    <View style={[styles.tag, { backgroundColor: tone.background }]}>
      <Ionicons name={cfg.icon} size={12} color={tone.text} />
      <AppText variant="caption" weight="semibold" color={tone.text} numberOfLines={1}>
        {cfg.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: radii.pill,
  },
});
