import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Recipe } from '../types';
import { colors, radii } from '../theme';
import { recipeBanner, DIFFICULTY_LABELS, missingLabel } from '../utils/recipe-visuals';

/**
 * RecipeMiniCard — tarjeta horizontal de «Ideas para cocinar» (Inicio.dc.html).
 * 236 dp de ancho: franja pastel 104 con plato, coincidencia en frambuesa, título 16/22 y meta.
 */
export type RecipeMiniCardProps = {
  recipe: Recipe;
  onPress: () => void;
  onLongPress?: () => void;
};

export function RecipeMiniCard({ recipe, onPress, onLongPress }: RecipeMiniCardProps) {
  const banner = recipeBanner(recipe.id);
  const diff = DIFFICULTY_LABELS[recipe.difficulty] ?? DIFFICULTY_LABELS.easy;
  const meta = [
    recipe.prepTimeMinutes !== null ? `${recipe.prepTimeMinutes} min` : null,
    diff,
    missingLabel(recipe.missingIngredients.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Receta ${recipe.title}, ${recipe.matchScore}% con tu despensa, ${meta}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.banner, { backgroundColor: banner.bg }]}>
        {recipe.imageUri ? (
          <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.plate}>
            <Ionicons name="restaurant-outline" size={28} color={banner.fg} />
          </View>
        )}
        <View style={styles.match}>
          <AppText variant="caption" weight="semibold" color={colors.onTertiaryContainer}>
            {`${recipe.matchScore} %`}
          </AppText>
        </View>
      </View>
      <View style={styles.body}>
        <AppText weight="semibold" style={styles.title} numberOfLines={2}>
          {recipe.title}
        </AppText>
        <AppText variant="metadata" weight="regular" color={colors.textSecondary} numberOfLines={1}>
          {meta}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 236,
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  banner: {
    height: 104,
    overflow: 'hidden',
  },
  plate: {
    position: 'absolute',
    right: 18,
    bottom: -18,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 7,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  match: {
    position: 'absolute',
    left: 10,
    top: 10,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiaryContainer,
    justifyContent: 'center',
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
});
