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
  vegetable: { icon: 'leaf-outline', color: '#28613C', bg: '#EAF4ED' },
  fruit: { icon: 'nutrition-outline', color: '#C85A32', bg: '#FDF0EA' },
  protein: { icon: 'restaurant-outline', color: '#A93632', bg: '#FBE5E3' },
  dairy: { icon: 'water-outline', color: '#2A5A78', bg: '#EBF2F7' },
  grain: { icon: 'grid-outline', color: '#94580C', bg: '#FEF6E9' },
  legume: { icon: 'ellipse-outline', color: '#6B4D8A', bg: '#F5EFFB' },
  sauce: { icon: 'color-fill-outline', color: '#B94E35', bg: '#FBE9E2' },
  snack: { icon: 'fast-food-outline', color: '#E58A45', bg: '#FFF1E3' },
  other: { icon: 'cube-outline', color: '#66534A', bg: '#F8EDE2' },
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
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E4D8',
    shadowColor: '#2B211D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#B94E35',
    backgroundColor: '#FDF5F2',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B211D',
    marginBottom: 5,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quantityPill: {
    backgroundColor: '#F8EDE2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
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
    backgroundColor: '#F8EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: '#EBDDD2',
  },
});
