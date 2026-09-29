import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '../types';
import { AppText } from './AppText';
import { colors, spacing, radii, getCategoryConfig } from '../theme';
import { getExpirationStatus, getDaysLeft } from '../utils/expiration';
import { formatQuantity } from '../utils/units';

export { getExpirationStatus };

/**
 * IngredientCard — «ticket de caducidad» (Organismos.dc.html · Despensa.dc.html)
 * Izquierda: icono de familia 56 (48 en selección) + nombre 17/600 + cantidad en píldora + familia.
 * Derecha, tras una línea punteada: bloque de 84 dp con la cifra de días (dato principal).
 * Seleccionado: anillo cacao de 2 dp (no depende solo del color) + check circular 26 en área de 48.
 */
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
  /** Versión compacta de «Aprovecha primero» (Inicio): icono 48, ticket 72, cantidad en texto. */
  compact?: boolean;
};

function ticketContent(dateStr: string | null) {
  const status = getExpirationStatus(dateStr).status;
  const tone = colors.functional[status];
  const days = getDaysLeft(dateStr);
  if (status === 'unknown' || days === null) {
    return { tone, big: '—', small: 'sin fecha', a11y: 'sin fecha de vencimiento', icon: undefined };
  }
  if (status === 'expired') {
    return { tone, big: undefined, small: 'Vencido', a11y: 'vencido', icon: 'alert-circle-outline' as const };
  }
  if (days === 0) {
    return { tone, big: 'Hoy', small: 'vence', a11y: 'vence hoy', icon: undefined };
  }
  return {
    tone,
    big: String(days),
    small: days === 1 ? 'día' : 'días',
    a11y: `vence en ${days} ${days === 1 ? 'día' : 'días'}`,
    icon: undefined,
  };
}

export function IngredientCard({
  ingredient,
  onPress,
  onLongPress,
  onEdit,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  compact = false,
}: IngredientCardProps) {
  const catConfig = getCategoryConfig(ingredient.category);
  const catColor = colors.categories[ingredient.category] || colors.categories.other;
  const ticket = ticketContent(ingredient.expirationDate);
  // Cantidad 0 = agotado: se queda en la despensa con «Sin stock» hasta que el usuario lo reponga o lo borre.
  const outOfStock = ingredient.quantity === 0;
  const quantity =
    ingredient.quantity !== null && !outOfStock ? formatQuantity(ingredient.quantity, ingredient.unit, { long: compact }) : null;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // 0 → 1 al entrar al modo selección: el hueco del check se abre y el contenido se corre.
  // Anima ancho y relleno (propiedades de layout), por eso va sin native driver; dura 220 ms.
  const selectAnim = useRef(new Animated.Value(isSelectMode ? 1 : 0)).current;
  // «Pop» del check al marcar/desmarcar (solo escala: native driver).
  const checkPop = useRef(new Animated.Value(1)).current;
  const isLongPressActive = useRef(false);
  const firstRender = useRef(true);

  useEffect(() => {
    Animated.timing(selectAnim, {
      toValue: isSelectMode ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isSelectMode]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    checkPop.setValue(0.6);
    Animated.spring(checkPop, { toValue: 1, tension: 260, friction: 9, useNativeDriver: true }).start();
  }, [isSelected]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    if (isSelectMode) return; // al seleccionar la tarjeta no cambia de tamaño
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 14, useNativeDriver: true }).start();
    setTimeout(() => {
      isLongPressActive.current = false;
    }, 250);
  };

  const handleLongPress = () => {
    isLongPressActive.current = true;
    onLongPress?.();
  };

  const handleCardPress = () => {
    if (isLongPressActive.current) return;
    if (isSelectMode) onToggleSelect?.();
    else if (onPress) onPress();
    else if (onEdit) onEdit();
  };

  const slotWidth = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [0, spacing.touchTargetMin] });
  const slotGap = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const mainPadLeft = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 6] });
  const checkEnter = selectAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 0.4, 1] });

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handleCardPress}
        onLongPress={isSelectMode ? undefined : handleLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, compact && styles.cardCompact]}
        accessibilityRole="button"
        accessibilityState={isSelectMode ? { selected: isSelected } : undefined}
        accessibilityLabel={`${ingredient.name}${outOfStock ? ', sin stock' : quantity ? `, ${quantity}` : ''}, ${catConfig.label}, ${ticket.a11y}`}
      >
        <Animated.View style={[styles.main, compact && styles.mainCompact, { paddingLeft: compact ? 12 : mainPadLeft }]}>
          {/* Hueco del check: se abre con animación y empuja el contenido (sin cambiar la altura) */}
          <Animated.View style={[styles.checkSlot, { width: slotWidth, marginRight: slotGap, opacity: selectAnim }]}>
            <Pressable
              onPress={onToggleSelect}
              disabled={!isSelectMode}
              style={styles.checkboxHit}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Seleccionar alimento ${ingredient.name}`}
              accessibilityElementsHidden={!isSelectMode}
              importantForAccessibility={isSelectMode ? 'auto' : 'no-hide-descendants'}
            >
              <Animated.View style={{ transform: [{ scale: checkEnter }] }}>
                <Animated.View
                  style={[styles.checkbox, isSelected && styles.checkboxActive, { transform: [{ scale: checkPop }] }]}
                >
                  {isSelected && <Ionicons name="checkmark" size={16} color={colors.onInk} />}
                </Animated.View>
              </Animated.View>
            </Pressable>
          </Animated.View>

          <View
            style={[
              styles.iconWrap,
              compact && styles.iconWrapCompact,
              { backgroundColor: catColor.background },
              outOfStock && styles.dimmed,
            ]}
          >
            <Ionicons name={catConfig.icon} size={compact ? 22 : 20} color={catColor.text} />
          </View>

          <View style={styles.body}>
            <AppText variant="cardTitle" style={compact ? styles.nameCompact : styles.name} numberOfLines={1}>
              {ingredient.name}
            </AppText>
            {compact ? (
              outOfStock ? (
                <AppText variant="metadata" weight="semibold" color={colors.functional.expired.text}>
                  Sin stock
                </AppText>
              ) : (
                quantity && (
                  <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
                    {quantity}
                  </AppText>
                )
              )
            ) : (
            <View style={styles.detailsRow}>
              {outOfStock && (
                <View style={styles.outPill}>
                  <Ionicons name="alert-circle-outline" size={13} color={colors.functional.expired.text} />
                  <AppText variant="caption" weight="semibold" color={colors.functional.expired.text}>
                    Sin stock
                  </AppText>
                </View>
              )}
              {quantity && (
                <View style={styles.quantityPill}>
                  <AppText variant="caption" weight="semibold">{quantity}</AppText>
                </View>
              )}
              {!isSelectMode && (
                <AppText variant="caption" weight="regular" color={colors.textSecondary} numberOfLines={1} style={styles.family}>
                  {catConfig.label}
                </AppText>
              )}
            </View>
            )}
          </View>
        </Animated.View>

        {/* Línea punteada del ticket (segmentos: Android no dibuja bordes punteados de un solo lado) */}
        <View style={[styles.perforation, compact && styles.perforationCompact]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>

        {/* Bloque de días */}
        <View style={[styles.ticket, compact && styles.ticketCompact, { backgroundColor: ticket.tone.background }]}>
          {ticket.icon ? (
            <Ionicons name={ticket.icon} size={20} color={ticket.tone.text} />
          ) : (
            <AppText
              weight="medium"
              color={ticket.tone.text}
              style={
                compact
                  ? styles.ticketBigCompact
                  : ticket.big && ticket.big.length > 2
                    ? styles.ticketBigSmall
                    : styles.ticketBig
              }
            >
              {ticket.big}
            </AppText>
          )}
          <AppText variant="caption" weight="semibold" color={ticket.tone.text}>
            {ticket.small}
          </AppText>
        </View>

        {/* Anillo de selección: se dibuja encima para no mover el contenido */}
        {isSelected && <View pointerEvents="none" style={styles.selectedRing} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 76,
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: 12,
    minWidth: 0,
  },
  cardCompact: {
    minHeight: 76,
  },
  mainCompact: {
    paddingVertical: 12,
    paddingRight: 12,
  },
  iconWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 12,
  },
  nameCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  perforationCompact: {
    marginVertical: 8,
  },
  ticketCompact: {
    width: 72,
  },
  ticketBigCompact: {
    fontSize: 24,
    lineHeight: 26,
  },
  checkSlot: {
    height: spacing.touchTargetMin,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  checkboxHit: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.circular,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 18,
    lineHeight: 23,
  },
  dimmed: {
    opacity: 0.55,
  },
  outPill: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.functional.expired.background,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityPill: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
  },
  family: {
    flexShrink: 1,
  },
  perforation: {
    width: 2,
    marginVertical: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  dash: {
    width: 2,
    height: 5,
    borderRadius: 1,
    backgroundColor: colors.m3.surfaceContainer,
  },
  ticket: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ticketBig: {
    fontSize: 24,
    lineHeight: 27,
  },
  ticketBigSmall: {
    fontSize: 18,
    lineHeight: 23,
  },
  selectedRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.cards,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
