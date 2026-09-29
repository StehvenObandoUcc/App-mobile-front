import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, radii } from '../theme';

export type SkeletonCardProps = {
  variant?: 'ingredient' | 'recipe';
};

export function SkeletonCard({ variant = 'ingredient' }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'recipe') {
    return (
      <View style={styles.recipeCard}>
        <Animated.View style={[styles.recipeImagePlaceholder, { opacity }]} />
        <View style={styles.recipeBody}>
          <Animated.View style={[styles.line, { width: '70%', height: 18, opacity }]} />
          <Animated.View style={[styles.line, { width: '90%', height: 14, marginTop: spacing.sm, opacity }]} />
          <View style={styles.recipeFooter}>
            <Animated.View style={[styles.pillPlaceholder, { opacity }]} />
            <Animated.View style={[styles.pillPlaceholder, { opacity }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ingredientCard}>
      <Animated.View style={[styles.avatarPlaceholder, { opacity }]} />
      <View style={styles.ingredientBody}>
        <Animated.View style={[styles.line, { width: '60%', height: 16, opacity }]} />
        <Animated.View style={[styles.line, { width: '40%', height: 12, marginTop: 6, opacity }]} />
      </View>
      <Animated.View style={[styles.badgePlaceholder, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Forma del ticket de IngredientCard (Despensa-Estados.dc.html): 84 dp, icono 52, bloque 60.
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 84,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    borderRadius: radii.cards,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.skeleton.background,
  },
  ingredientBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  line: {
    borderRadius: 6,
    backgroundColor: colors.skeleton.background,
  },
  badgePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.skeleton.background,
  },
  recipeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.tiles,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  recipeImagePlaceholder: {
    height: 150,
    backgroundColor: colors.skeleton.background,
  },
  recipeBody: {
    padding: spacing.lg,
  },
  recipeFooter: {
    flexDirection: 'row',
    marginTop: 14,
    gap: spacing.sm,
  },
  pillPlaceholder: {
    width: 68,
    height: 22,
    borderRadius: radii.circular,
    backgroundColor: colors.skeleton.background,
  },
});
