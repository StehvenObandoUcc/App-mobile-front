import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';

export type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
  onLongPress?: () => void;
  onSave?: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
};

const DIFFICULTY_MAP = {
  easy: { label: 'Fácil', color: '#28613C', bg: '#EAF4ED' },
  medium: { label: 'Media', color: '#8A5A00', bg: '#FFF2D7' },
  hard: { label: 'Difícil', color: '#A93632', bg: '#FBE5E3' },
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
  const diff = DIFFICULTY_MAP[recipe.difficulty] || DIFFICULTY_MAP.easy;
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
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
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
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
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
        accessibilityHint={isSelectMode ? 'Toca para seleccionar esta receta' : 'Mantén presionado para seleccionar'}
        accessibilityLabel={`Receta ${recipe.title}, coincidencia del ${recipe.matchScore} por ciento`}
      >
        {/* Cabecera superior con Badges y Guardar / Selección */}
        <View style={styles.topRow}>
          {isSelectMode ? (
            <Pressable
              onPress={onToggleSelect}
              style={[styles.checkbox, isSelected && styles.checkboxActive]}
              hitSlop={10}
            >
              <Ionicons
                name={isSelected ? 'checkmark' : 'ellipse-outline'}
                size={18}
                color={isSelected ? '#FFFFFF' : '#9CA3AF'}
              />
            </Pressable>
          ) : (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.matchText}>{recipe.matchScore}% con tu despensa</Text>
            </View>
          )}

          {!isSelectMode && onSave && (
            <Pressable
              onPress={handleSavePress}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={recipe.isSaved ? 'Quitar de guardados' : 'Guardar receta'}
              style={styles.saveButton}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={recipe.isSaved ? 'heart' : 'heart-outline'}
                  size={22}
                  color={recipe.isSaved ? '#EF4444' : '#9CA3AF'}
                />
              </Animated.View>
            </Pressable>
          )}
        </View>

        {/* Información principal */}
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {recipe.description}
        </Text>

        {/* Metadatos en formato Pill (estilo Delivery) */}
        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes && (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{recipe.servings} porc.</Text>
            </View>
          )}
          <View style={[styles.metaPill, { backgroundColor: diff.bg }]}>
            <Text style={[styles.metaText, { color: diff.color, fontWeight: '700' }]}>
              {diff.label}
            </Text>
          </View>
        </View>

        {/* Barra de progreso de ingredientes del inventario */}
        <View style={styles.footer}>
          <View style={styles.inventoryInfo}>
            <Ionicons
              name={recipe.missingIngredients.length === 0 ? 'checkmark-circle' : 'restaurant-outline'}
              size={15}
              color={recipe.missingIngredients.length === 0 ? '#28613C' : '#E58A45'}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.inventoryText}>
              {availableCount} de {totalIngredients} ingredientes en tu cocina
            </Text>
          </View>
          <Ionicons
            name={isSelectMode ? (isSelected ? 'checkmark-circle' : 'ellipse-outline') : 'chevron-forward'}
            size={18}
            color={isSelected ? '#B94E35' : '#66534A'}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0E4D8',
    shadowColor: '#2B211D',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#B94E35',
    backgroundColor: '#FDF5F2',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  checkboxActive: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
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
    backgroundColor: '#B94E35',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B211D',
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: '#66534A',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8EDE2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metaText: {
    fontSize: 12,
    color: '#66534A',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E4D8',
  },
  inventoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inventoryText: {
    fontSize: 12,
    color: '#66534A',
    fontWeight: '600',
  },
});
