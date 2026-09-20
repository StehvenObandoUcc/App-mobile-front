import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient, IngredientCategory, ExpirationStatus } from '../types';
import { StatusBadge } from './StatusBadge';

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

const CATEGORY_MAP: Record<
  IngredientCategory,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  vegetable: { icon: 'leaf-outline', color: '#059669', bg: '#ECFDF5' },
  fruit: { icon: 'nutrition-outline', color: '#EA580C', bg: '#FFF7ED' },
  protein: { icon: 'restaurant-outline', color: '#DC2626', bg: '#FEF2F2' },
  dairy: { icon: 'water-outline', color: '#2563EB', bg: '#EFF6FF' },
  grain: { icon: 'grid-outline', color: '#D97706', bg: '#FFFBEB' },
  legume: { icon: 'ellipse-outline', color: '#7C3AED', bg: '#F5F3FF' },
  sauce: { icon: 'color-fill-outline', color: '#E11D48', bg: '#FFF1F2' },
  snack: { icon: 'fast-food-outline', color: '#0891B2', bg: '#ECFEFF' },
  other: { icon: 'cube-outline', color: '#4B5563', bg: '#F3F4F6' },
};

export function getExpirationStatus(dateStr: string | null): {
  status: ExpirationStatus;
  label: string;
} {
  if (!dateStr) {
    return { status: 'unknown', label: 'Sin fecha' };
  }
  const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'expired', label: 'Vencido' };
  }
  if (diffDays === 0) {
    return { status: 'expiringSoon', label: 'Vence hoy' };
  }
  if (diffDays <= 3) {
    return { status: 'expiringSoon', label: `Vence en ${diffDays}d` };
  }
  return { status: 'fresh', label: `${diffDays}d restantes` };
}

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
  const cat = CATEGORY_MAP[ingredient.category] || CATEGORY_MAP.other;
  const expiry = getExpirationStatus(ingredient.expirationDate);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isLongPressActive = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.985,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
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
          >
            <Ionicons
              name={isSelected ? 'checkmark' : 'ellipse-outline'}
              size={16}
              color={isSelected ? '#FFFFFF' : '#9CA3AF'}
            />
          </Pressable>
        )}

        {/* Icono de categoría */}
        <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={24} color={cat.color} />
        </View>

        {/* Contenido central */}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
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
            <StatusBadge status={expiry.status} label={expiry.label} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quantityPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: '#E5E7EB',
  },
});
