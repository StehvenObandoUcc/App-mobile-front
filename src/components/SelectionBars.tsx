import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { NAV_HEIGHT, NAV_BOTTOM_OFFSET } from './AppBottomNav';
import { hideBottomNav } from '../utils/nav-visibility';
import { colors, radii, spacing, elevations } from '../theme';

/**
 * Barras del modo selección (Despensa-Seleccion.dc.html), compartidas por Despensa y Recetas.
 * - SelectionHeader: barra blanca de 64 dp que reemplaza el encabezado (✕ · «N seleccionados» · Todos).
 * - SelectionActionBar: barra cacao flotante que tapa la navegación (Cancelar · Eliminar (N)).
 */
export type SelectionHeaderProps = {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onCancel: () => void;
  /** «seleccionado/seleccionados» o «seleccionada/seleccionadas». */
  noun?: 'm' | 'f';
};

export function SelectionHeader({ count, allSelected, onToggleAll, onCancel, noun = 'm' }: SelectionHeaderProps) {
  const word = noun === 'f' ? (count === 1 ? 'seleccionada' : 'seleccionadas') : count === 1 ? 'seleccionado' : 'seleccionados';
  return (
    <View style={styles.header}>
      <IconButton iconName="close" variant="ghost" accessibilityLabel="Cancelar selección" onPress={onCancel} />
      <AppText variant="sectionTitle" weight="light" style={styles.count} accessibilityLiveRegion="polite">
        <AppText weight="semibold">{count}</AppText>
        {` ${word}`}
      </AppText>
      <Pressable
        onPress={onToggleAll}
        style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ checked: allSelected }}
        accessibilityLabel={allSelected ? 'Quitar todos de la selección' : 'Seleccionar todos'}
      >
        <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={18} color={colors.textPrimary} />
        <AppText variant="bodySmall" weight="semibold">
          Todos
        </AppText>
      </Pressable>
    </View>
  );
}

export type SelectionActionBarProps = {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  itemNoun?: string; // «alimentos», «recetas»
};

export function SelectionActionBar({ count, onCancel, onDelete, itemNoun = 'elementos' }: SelectionActionBarProps) {
  const insets = useSafeAreaInsets();
  // Mientras esta barra existe, la navegación inferior se oculta (si no, la taparía).
  useEffect(() => hideBottomNav(), []);
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom, 0) + NAV_BOTTOM_OFFSET }]}>
      <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button" accessibilityLabel="Cancelar selección">
        <AppText variant="body" weight="semibold" color={colors.m3.inverseOnSurface}>
          Cancelar
        </AppText>
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={count === 0}
        style={({ pressed }) => [styles.delete, count === 0 && styles.deleteDisabled, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: count === 0 }}
        accessibilityLabel={`Eliminar ${count} ${itemNoun} seleccionados`}
      >
        <Ionicons name="trash-outline" size={20} color={colors.m3.onErrorContainer} />
        <AppText variant="body" weight="semibold" color={colors.m3.onErrorContainer}>{`Eliminar (${count})`}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: radii.containers,
    backgroundColor: colors.surface,
  },
  count: {
    flex: 1,
  },
  allBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
  },
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 10,
    borderRadius: radii.floatingNav,
    backgroundColor: colors.ink,
    zIndex: 1000,
    ...elevations.lg,
  },
  cancel: {
    height: 52,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  delete: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.error.background,
  },
  deleteDisabled: {
    opacity: 0.6,
  },
});
