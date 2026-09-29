import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Recipe } from '../types';
import { colors, radii } from '../theme';
import { DIFFICULTY_LABELS } from '../utils/recipe-visuals';

/**
 * TodayRecipeCard — «Para hoy» del Inicio (Inicio.dc.html).
 * Tarjeta frambuesa (es una sugerencia de la IA): coincidencia, «PARA HOY», título 22/600,
 * descripción, tiempo · dificultad y botón cacao «Ver receta →».
 * Sin receta: invita a llenar la despensa.
 */
export type TodayRecipeCardProps = {
  recipe: Recipe | null;
  onOpen: () => void;
  onEmptyAction: () => void;
};

export function TodayRecipeCard({ recipe, onOpen, onEmptyAction }: TodayRecipeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.deco} pointerEvents="none" />

      <View style={styles.head}>
        {recipe ? (
          <View style={styles.match}>
            <Ionicons name="sparkles" size={13} color={colors.m3.onTertiary} />
            <AppText variant="caption" weight="semibold" color={colors.m3.onTertiary}>
              {`${recipe.matchScore} % con tu despensa`}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        <AppText variant="label" uppercase color={colors.onTertiaryContainer} style={styles.tag}>
          Para hoy
        </AppText>
      </View>

      {recipe ? (
        <>
          <View style={styles.texts}>
            <AppText weight="semibold" color={colors.onTertiaryContainer} style={styles.title} numberOfLines={2}>
              {recipe.title}
            </AppText>
            {!!recipe.description && (
              <AppText variant="bodySmall" color={colors.onTertiaryContainer} numberOfLines={2}>
                {recipe.description}
              </AppText>
            )}
          </View>
          <View style={styles.footer}>
            {recipe.prepTimeMinutes !== null && (
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={16} color={colors.onTertiaryContainer} />
                <AppText variant="metadata" color={colors.onTertiaryContainer}>{`${recipe.prepTimeMinutes} min`}</AppText>
              </View>
            )}
            <AppText variant="metadata" color={colors.onTertiaryContainer}>
              {DIFFICULTY_LABELS[recipe.difficulty] ?? DIFFICULTY_LABELS.easy}
            </AppText>
            <Pressable
              onPress={onOpen}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Ver receta ${recipe.title}`}
            >
              <AppText weight="semibold" color={colors.onInk} style={styles.ctaText}>
                Ver receta
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={colors.onInk} />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.texts}>
            <AppText weight="semibold" color={colors.onTertiaryContainer} style={styles.title}>
              Aún no hay sugerencia
            </AppText>
            <AppText variant="bodySmall" color={colors.onTertiaryContainer}>
              Agrega ingredientes a tu despensa para sugerirte la receta ideal.
            </AppText>
          </View>
          <View style={styles.footer}>
            <Pressable
              onPress={onEmptyAction}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
              accessibilityLabel="Ver despensa"
            >
              <AppText weight="semibold" color={colors.onInk} style={styles.ctaText}>
                Ver despensa
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={colors.onInk} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.tiles,
    backgroundColor: colors.tertiaryContainer,
    padding: 20,
    gap: 12,
    overflow: 'hidden',
  },
  deco: {
    position: 'absolute',
    right: -24,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FAE6EA', // frambuesa muy clara, solo decorativa
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  match: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiary,
  },
  tag: {
    letterSpacing: 1,
  },
  texts: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cta: {
    marginLeft: 'auto',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  ctaPressed: {
    backgroundColor: colors.inkPressed,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    fontSize: 15,
  },
});
