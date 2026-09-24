import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient, IngredientCategory } from '../types';
import { Chip } from './Chip';
import { colors, typography, spacing, radii, elevations } from '../theme';
import { getExpirationStatus } from '../utils/expiration';

export { getExpirationStatus };

export type IngredientCardProps = {
  ingredient: Ingredient;
  onPress?: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConsume?: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
};

const CATEGORY_ICONS: Record<IngredientCategory, keyof typeof Ionicons.glyphMap> = {
  vegetable: 'leaf-outline',
  fruit: 'nutrition-outline',
  protein: 'restaurant-outline',
  dairy: 'water-outline',
  grain: 'grid-outline',
  legume: 'ellipse-outline',
  sauce: 'color-fill-outline',
  snack: 'fast-food-outline',
  other: 'cube-outline',
};

export function IngredientCard({
  ingredient,
  onPress,
  onLongPress,
  onEdit,
  onDelete,
  onConsume,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: IngredientCardProps) {
  const catColor = colors.categories[ingredient.category] || colors.categories.other;
  const catIcon = CATEGORY_ICONS[ingredient.category] || CATEGORY_ICONS.other;
  const expiry = getExpirationStatus(ingredient.expirationDate);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isLongPressActive = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
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
    setTimeout(() => {
      isLongPressActive.current = false;
    }, 250);
  };

  const handleLongPress = () => {
    isLongPressActive.current = true;
    onLongPress?.();
  };

  const handleCardPress = () => {
    if (isLongPressActive.current) {
      return;
    }
    if (isSelectMode) {
      onToggleSelect?.();
    } else if (onPress) {
      onPress();
    } else if (onEdit) {
      onEdit();
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
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
        accessibilityLabel={`Alimento ${ingredient.name}, cantidad ${ingredient.quantity ?? ''} ${ingredient.unit}, ${expiry.label}`}
      >
        {/* Checkbox circular en modo selección */}
        {isSelectMode && (
          <Pressable
            onPress={onToggleSelect}
            hitSlop={10}
            style={[styles.checkbox, isSelected && styles.checkboxActive]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`Seleccionar alimento ${ingredient.name}`}
          >
            <Ionicons
              name={isSelected ? 'checkmark' : 'ellipse-outline'}
              size={16}
              color={isSelected ? colors.textInverse : colors.textMuted}
            />
          </Pressable>
        )}

        {/* Icono de categoría */}
        <View style={[styles.iconWrap, { backgroundColor: catColor.background }]}>
          <Ionicons name={catIcon} size={24} color={catColor.text} />
        </View>

        {/* Contenido central */}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {ingredient.name}
          </Text>
          <View style={styles.detailsRow}>
            {ingredient.quantity !== null && (
              <View style={styles.quantityPill}>
                <Text style={styles.quantityText}>
                  {ingredient.quantity} {ingredient.unit}
                </Text>
              </View>
            )}
            <Chip variant="status" status={expiry.status} label={expiry.label} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevations.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm + 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.cards,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 5,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  quantityPill: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.circular,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
});
