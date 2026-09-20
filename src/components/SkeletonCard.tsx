import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export type SkeletonCardProps = {
  variant?: 'ingredient' | 'recipe';
};

export function SkeletonCard({ variant = 'ingredient' }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
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
          <Animated.View style={[styles.line, { width: '90%', height: 14, marginTop: 8, opacity }]} />
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
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  ingredientBody: {
    flex: 1,
    marginLeft: 12,
  },
  line: {
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  badgePlaceholder: {
    width: 72,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recipeImagePlaceholder: {
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  recipeBody: {
    padding: 16,
  },
  recipeFooter: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  pillPlaceholder: {
    width: 68,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
});
