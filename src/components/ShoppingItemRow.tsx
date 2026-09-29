import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../types';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { CategoryTag } from './CategoryTag';
import { colors } from '../theme';
import { formatQuantity } from '../utils/units';

/**
 * ShoppingItemRow — producto de la lista de compras (Compras.dc.html).
 * Por comprar: blanca, check vacío, quitar en rojo.
 * Comprado: avena, check salvia, nombre tachado, cantidad y quitar en gris.
 */
export type ShoppingItemRowProps = {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
};

export function ShoppingItemRow({ item, onToggle, onRemove }: ShoppingItemRowProps) {
  const bought = item.isBought;
  const qty = item.quantity !== null ? formatQuantity(item.quantity, item.unit) : null;
  return (
    <View style={[styles.row, bought && styles.rowBought]}>
      <Pressable
        onPress={onToggle}
        style={styles.checkArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bought }}
        accessibilityLabel={`Marcar ${item.name} como comprado`}
      >
        {bought ? (
          <View style={styles.checkOn}>
            <Ionicons name="checkmark" size={16} color={colors.onInk} />
          </View>
        ) : (
          <View style={styles.checkOff} />
        )}
      </Pressable>

      <View style={styles.info}>
        <AppText
          variant="body"
          weight="semibold"
          color={bought ? colors.textSecondary : colors.textPrimary}
          style={[styles.name, bought && styles.struck]}
          numberOfLines={2}
        >
          {item.name}
        </AppText>
        <View style={styles.meta}>
          <CategoryTag category={item.category} />
          {!!item.recipeSource && (
            <View style={styles.source}>
              <Ionicons name="restaurant-outline" size={12} color={colors.textSecondary} />
              <AppText variant="caption" weight="regular" color={colors.textSecondary} numberOfLines={1} style={styles.sourceText}>
                {`Receta: ${item.recipeSource}`}
              </AppText>
            </View>
          )}
        </View>
      </View>

      {qty && (
        <AppText variant="bodySmall" weight="semibold" color={bought ? colors.textSecondary : colors.textPrimary} style={styles.qty}>
          {qty}
        </AppText>
      )}

      <IconButton
        iconName="trash-outline"
        variant="ghost"
        iconSize={19}
        iconColor={bought ? colors.textSecondary : colors.m3.error}
        accessibilityLabel={`Quitar ${item.name}`}
        onPress={onRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  rowBought: {
    backgroundColor: colors.surfaceVariant,
  },
  checkArea: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.m3.outline,
  },
  checkOn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 16,
    lineHeight: 21,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  sourceText: {
    flexShrink: 1,
  },
  qty: {
    paddingHorizontal: 4,
  },
});
