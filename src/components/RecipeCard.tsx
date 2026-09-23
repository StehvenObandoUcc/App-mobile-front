import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { colors, radii, spacing, typography, elevations } from '../theme';

export type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
  onLongPress?: () => void;
  onSave?: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
};

const DIFFICULTY_LABELS: Record<Recipe['difficulty'], string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export function RecipeCard({
  recipe,
  onPress,
  onLongPress,
  onSave,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: RecipeCardProps) {
  const diff = colors.difficulty[recipe.difficulty] || colors.difficulty.easy;
  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] || DIFFICULTY_LABELS.easy;
  const totalIngredients = recipe.availableIngredients.length + recipe.missingIngredients.length;
  const availableCount = recipe.availableIngredients.length;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const isLongPressActive = useRef(false);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 14,
      useNativeDriver: true,
    }).start();

    if (isLongPressActive.current) {
      longPressTimeout.current = setTimeout(() => {
        isLongPressActive.current = false;
      }, 250);
    }
  };

  const handleLongPress = () => {
    isLongPressActive.current = true;
    onLongPress?.();
  };

  const handleSavePress = (e: any) => {
    e?.stopPropagation?.();
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 80, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onSave?.();
  };

  const handleCardPress = () => {
    if (isLongPressActive.current) return;
    if (isSelectMode) {
      onToggleSelect?.();
    } else {
      onPress();
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
      }}
    >
      <Pressable
        onPress={handleCardPress}
        onLongPress={isSelectMode ? undefined : handleLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Receta ${recipe.title}, coincidencia ${recipe.matchScore}%, dificultad ${diffLabel}`}
      >
        {/* Cabecera: Checkbox / Badge de coincidencia y Botón Guardar */}
        <View style={styles.topRow}>
          {isSelectMode ? (
            <Pressable
              onPress={onToggleSelect}
              hitSlop={10}
              style={[styles.checkbox, isSelected && styles.checkboxActive]}
            >
              <Ionicons
                name={isSelected ? 'checkmark' : 'ellipse-outline'}
                size={16}
                color={isSelected ? colors.textInverse : colors.textMuted}
              />
            </Pressable>
          ) : (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={13} color={colors.textInverse} style={{ marginRight: spacing.xs }} />
              <Text style={styles.matchText}>{recipe.matchScore}% Match</Text>
            </View>
          )}

          {onSave && (
            <Pressable
              onPress={handleSavePress}
              hitSlop={8}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityLabel={recipe.isSaved ? 'Quitar de guardadas' : 'Guardar receta'}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={recipe.isSaved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={recipe.isSaved ? colors.primary : colors.textSecondary}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* Título y descripción */}
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {recipe.title}
        </Text>
        <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
          {recipe.description}
        </Text>

        {/* Metadatos: Tiempo, Dificultad, Porciones */}
        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes !== null && (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
              <Text style={styles.metaText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          )}

          <View style={[styles.metaPill, { backgroundColor: diff.background }]}>
            <Ionicons name="speedometer-outline" size={14} color={diff.text} style={{ marginRight: spacing.xs }} />
            <Text style={[styles.metaText, { color: diff.text }]}>{diffLabel}</Text>
          </View>

          {recipe.servings !== null && (
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
              <Text style={styles.metaText}>{recipe.servings} porc.</Text>
            </View>
          )}
        </View>

        {/* Barra de progreso de ingredientes en inventario */}
        <View style={styles.footer}>
          <View style={styles.inventoryInfo}>
            <Ionicons
              name={recipe.missingIngredients.length === 0 ? 'checkmark-circle' : 'restaurant-outline'}
              size={15}
              color={recipe.missingIngredients.length === 0 ? colors.functional.fresh.text : colors.secondary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.inventoryText}>
              {availableCount} de {totalIngredients} ingredientes en tu cocina
            </Text>
          </View>
          <Ionicons
            name={isSelectMode ? (isSelected ? 'checkmark-circle' : 'ellipse-outline') : 'chevron-forward'}
            size={18}
            color={isSelected ? colors.primary : colors.textSecondary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevations.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.buttons,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.circular,
  },
  matchText: {
    color: colors.textInverse,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  description: {
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.circular,
  },
  metaText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inventoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inventoryText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
});
