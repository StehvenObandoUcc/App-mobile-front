import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';
import { recipeBanner, DIFFICULTY_LABELS, missingLabel as missingText } from '../utils/recipe-visuals';

/**
 * RecipeCard — Organismos.dc.html
 * Franja superior de 150 dp: foto si hay `imageUri`; si no, pastel + plato blanco con icono.
 * Coincidencia en frambuesa (dato de la IA). Botón 48 dp: solo guardar (corazón), como el mockup; borrar = mantener presionado → selección.
 * Cuerpo: título 20/600, descripción, meta (tiempo · dificultad segmentada · porciones)
 * y progreso de ingredientes segmentado «Tienes 7 de 8 · Falta 1».
 * Seleccionado: anillo cacao 2 dp + check circular en la esquina.
 */
export type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
  onLongPress?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
};

export function RecipeCard({
  recipe,
  onPress,
  onLongPress,
  onSave,
  onDelete,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: RecipeCardProps) {
  const diff = colors.difficulty[recipe.difficulty] || colors.difficulty.easy;
  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] || DIFFICULTY_LABELS.easy;
  const available = recipe.availableIngredients.length;
  const total = available + recipe.missingIngredients.length;
  const missing = recipe.missingIngredients.length;
  const banner = recipeBanner(recipe.id);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const isLongPressActive = useRef(false);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    return () => {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 14, useNativeDriver: true }).start();
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

  const handleSavePress = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 80, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onSave?.();
  };

  const handleCardPress = () => {
    if (isLongPressActive.current) return;
    if (isSelectMode) onToggleSelect?.();
    else onPress();
  };

  const missingLabel = missingText(missing);
  const segmented = total > 0 && total <= 12;

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
      <Pressable
        onPress={handleCardPress}
        onLongPress={isSelectMode ? undefined : handleLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        accessibilityRole="button"
        accessibilityState={isSelectMode ? { selected: isSelected } : undefined}
        accessibilityLabel={`Receta ${recipe.title}, ${recipe.matchScore}% con tu despensa, dificultad ${diffLabel}, ${missingLabel}`}
      >
        {/* ── Franja superior ── */}
        <View style={[styles.banner, { backgroundColor: banner.bg }]}>
          {recipe.imageUri ? (
            <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <View style={styles.bannerHalo} />
              <View style={styles.plate}>
                <Ionicons name="restaurant-outline" size={40} color={banner.fg} />
              </View>
            </>
          )}

          {isSelectMode ? (
            <Pressable
              onPress={onToggleSelect}
              style={styles.checkboxHit}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Seleccionar receta ${recipe.title}`}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color={colors.onInk} />}
              </View>
            </Pressable>
          ) : (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={14} color={colors.onTertiaryContainer} />
              <AppText variant="metadata" weight="semibold" color={colors.onTertiaryContainer}>
                {`${recipe.matchScore} % con tu despensa`}
              </AppText>
            </View>
          )}

          {!isSelectMode && (
            <View style={styles.bannerActions}>
              {onSave && (
                <Pressable
                  onPress={handleSavePress}
                  style={({ pressed }) => [styles.roundBtn, pressed && styles.roundBtnPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: recipe.isSaved }}
                  accessibilityLabel={recipe.isSaved ? 'Quitar de guardadas' : 'Guardar receta'}
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons
                      name={recipe.isSaved ? 'heart' : 'heart-outline'}
                      size={22}
                      color={colors.onPrimaryContainer}
                    />
                  </Animated.View>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* ── Cuerpo ── */}
        <View style={styles.body}>
          <AppText variant="sectionTitle" numberOfLines={2} style={styles.title}>
            {recipe.title}
          </AppText>
          {!!recipe.description && !isSelectMode && (
            <AppText variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
              {recipe.description}
            </AppText>
          )}

          <View style={styles.metaRow}>
            {recipe.prepTimeMinutes !== null && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.textPrimary} />
                <AppText variant="metadata">{`${recipe.prepTimeMinutes} min`}</AppText>
              </View>
            )}
            <View style={styles.metaItem}>
              <View style={styles.diffSegments}>
                {[1, 2, 3].map((lvl) => (
                  <View
                    key={lvl}
                    style={[
                      styles.diffSegment,
                      { backgroundColor: lvl <= diff.level ? diff.segment : colors.m3.surfaceContainerHighest },
                    ]}
                  />
                ))}
              </View>
              <AppText variant="metadata" color={diff.text}>
                {diffLabel}
              </AppText>
            </View>
            {recipe.servings !== null && !isSelectMode && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color={colors.textPrimary} />
                <AppText variant="metadata">{`${recipe.servings} porc.`}</AppText>
              </View>
            )}
            {isSelectMode && missing > 0 && (
              <AppText variant="metadata" weight="semibold" color={colors.functional.expired.text}>
                {missingLabel}
              </AppText>
            )}
          </View>

          {!isSelectMode && total > 0 && (
            <View style={styles.progress}>
              <View style={styles.progressHead}>
                <AppText variant="metadata" weight="semibold">{`Tienes ${available} de ${total} ingredientes`}</AppText>
                <AppText
                  variant="metadata"
                  weight="semibold"
                  color={missing === 0 ? colors.functional.fresh.text : colors.functional.expired.text}
                >
                  {missingLabel}
                </AppText>
              </View>
              {segmented ? (
                <View style={styles.segments}>
                  {Array.from({ length: total }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        { backgroundColor: i < available ? colors.secondary : colors.m3.surfaceContainerHighest },
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.segment, styles.trackFull]}>
                  <View style={[styles.trackFill, { width: `${Math.round((available / total) * 100)}%` }]} />
                </View>
              )}
            </View>
          )}
        </View>

        {isSelected && <View pointerEvents="none" style={styles.selectedRing} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.tiles,
    overflow: 'hidden',
  },
  banner: {
    height: 132, // Recetas.dc.html
    overflow: 'hidden',
  },
  bannerHalo: {
    position: 'absolute',
    right: -20,
    bottom: -44,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.surface,
    opacity: 0.55,
  },
  plate: {
    position: 'absolute',
    right: 26,
    bottom: -10,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surface,
    borderWidth: 9,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    left: 14,
    top: 14,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiaryContainer,
  },
  bannerActions: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    gap: 6,
  },
  roundBtn: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: spacing.touchTargetMin / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  checkboxHit: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  body: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 19,
    lineHeight: 25,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  diffSegments: {
    flexDirection: 'row',
    gap: 3,
  },
  diffSegment: {
    width: 14,
    height: 8,
    borderRadius: 4,
  },
  progress: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.m3.surfaceContainer,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  segments: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  trackFull: {
    backgroundColor: colors.m3.surfaceContainerHighest,
    overflow: 'hidden',
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  selectedRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.tiles,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
