import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { SecondaryButton } from './SecondaryButton';
import { NAV_HEIGHT, NAV_BOTTOM_OFFSET } from './AppBottomNav';
import { hideBottomNav } from '../utils/nav-visibility';
import { radii, spacing, elevations } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { useReduceMotion } from '../hooks/useReduceMotion';

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
  const { colors } = useTheme();
  const styles = useStyles();
  const { t, tp } = useI18n();
  const word = tp(noun === 'f' ? 'organisms.selectionBars.selectedF' : 'organisms.selectionBars.selectedM', count);
  return (
    <View style={styles.header}>
      <IconButton iconName="close" variant="ghost" accessibilityLabel={t('organisms.selectionBars.cancelSelection')} onPress={onCancel} />
      <AppText variant="sectionTitle" weight="light" style={styles.count} accessibilityLiveRegion="polite">
        <AppText weight="semibold">{count}</AppText>
        {` ${word}`}
      </AppText>
      <Pressable
        onPress={onToggleAll}
        style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ checked: allSelected }}
        accessibilityLabel={allSelected ? t('organisms.selectionBars.removeAllA11y') : t('organisms.selectionBars.selectAllA11y')}
      >
        <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={18} color={colors.textPrimary} />
        <AppText variant="bodySmall" weight="semibold">
          {t('organisms.selectionBars.all')}
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

export function SelectionActionBar({ count, onCancel, onDelete, itemNoun }: SelectionActionBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const noun = itemNoun ?? t('organisms.selectionBars.itemsDefault');
  // Mientras esta barra existe, la navegación inferior se oculta (si no, la taparía).
  useEffect(() => hideBottomNav(), []);
  // Entra desde abajo reemplazando la navegación (Paso 5 · Animaciones).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
  }, [enter]);
  return (
    <Animated.View
      style={[
        styles.bar,
        {
          bottom: Math.max(insets.bottom, 0) + NAV_BOTTOM_OFFSET,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [NAV_HEIGHT + 24, 0] }) }],
        },
      ]}
    >
      <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button" accessibilityLabel={t('organisms.selectionBars.cancelSelection')}>
        <AppText variant="body" weight="semibold" color={colors.textPrimary}>
          {t('common.cancel')}
        </AppText>
      </Pressable>
      <SecondaryButton
        title={t('organisms.selectionBars.deleteButton', { count })}
        variant="outline"
        tone="danger"
        iconName="trash-outline"
        onPress={onDelete}
        disabled={count === 0}
        accessibilityLabel={t('organisms.selectionBars.deleteA11y', { count, items: noun })}
        style={styles.delete}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
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
    backgroundColor: colors.surface,
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
  },
}));
