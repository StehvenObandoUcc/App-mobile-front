import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '../types';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { colors, radii, getCategoryConfig } from '../theme';
import { formatQuantity } from '../utils/units';
import { daysUntil } from '../utils/dates';

/**
 * DetectedItemCard — alimento detectado por la IA (Escaneo-Resultado.dc.html).
 * Check circular (área 48) · icono de familia 44 · nombre, cantidad y vencimiento · confianza ·
 * Editar y Quitar siempre visibles. Si ya existe en la despensa, fila «Sumar» con casilla cuadrada.
 * No marcado: tarjeta al 62 % de opacidad.
 */
export type DetectedItemCardProps = {
  item: Ingredient;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Alimento parecido que ya está en la despensa. */
  existing?: Ingredient;
  mergeChecked?: boolean;
  onToggleMerge?: () => void;
  /** false si la unidad no se puede sumar (p. ej. unidades vs. kg): se avisa que se guarda aparte. */
  mergeCompatible?: boolean;
};

export function expiryLabel(date: string | null): string {
  const d = daysUntil(date);
  if (d === null) return 'sin fecha';
  if (d < 0) return 'vencido';
  if (d === 0) return 'vence hoy';
  return `vence en ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** ≥ 80 % seguro · 60–79 % revisa · < 60 % verifica. */
export function confidenceBadge(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined) return null;
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.8) return { label: `${pct} % seguro`, tone: colors.functional.fresh };
  if (confidence >= 0.6) return { label: `${pct} % · revisa`, tone: colors.functional.expiringSoon };
  return { label: 'Verifica este alimento', tone: colors.functional.expired };
}

export function DetectedItemCard({ item, onToggle, onEdit, onRemove, existing, mergeChecked = true, onToggleMerge, mergeCompatible = true }: DetectedItemCardProps) {
  const cat = getCategoryConfig(item.category);
  const catColor = colors.categories[item.category] || colors.categories.other;
  const qty = item.quantity !== null && item.quantity !== undefined ? formatQuantity(item.quantity, item.unit, { long: true }) : 'sin cantidad';
  const badge = item.source === 'ai' ? confidenceBadge(item.confidence) : null;
  const addQty =
    item.quantity !== null && item.quantity !== undefined ? `+${formatQuantity(item.quantity, item.unit)}` : 'la cantidad detectada';

  return (
    <View style={[styles.card, !item.confirmed && styles.off]}>
      <View style={styles.row}>
        <Pressable
          onPress={onToggle}
          style={styles.checkArea}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.confirmed }}
          accessibilityLabel={`Incluir ${item.name}`}
        >
          {item.confirmed ? (
            <View style={styles.checkOn}>
              <Ionicons name="checkmark" size={16} color={colors.onInk} />
            </View>
          ) : (
            <View style={styles.checkOff} />
          )}
        </Pressable>

        <View style={[styles.icon, { backgroundColor: catColor.background }]}>
          <Ionicons name={cat.icon} size={22} color={catColor.text} />
        </View>

        <Pressable onPress={onEdit} style={styles.info} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`}>
          <AppText variant="body" weight="semibold" numberOfLines={2} style={styles.name}>
            {item.name}
          </AppText>
          <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
            {`${qty} · ${expiryLabel(item.expirationDate)}`}
          </AppText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.tone.background }]}>
              <AppText variant="caption" weight="semibold" color={badge.tone.text}>
                {badge.label}
              </AppText>
            </View>
          )}
        </Pressable>

        <IconButton iconName="create-outline" variant="ghost" iconSize={19} iconColor={colors.textSecondary} accessibilityLabel={`Editar ${item.name}`} onPress={onEdit} />
        <IconButton iconName="trash-outline" variant="ghost" iconSize={19} iconColor={colors.m3.error} accessibilityLabel={`Quitar ${item.name}`} onPress={onRemove} />
      </View>

      {existing && !mergeCompatible && (
        <View style={styles.merge}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <View style={styles.mergeText}>
            <AppText variant="metadata" weight="semibold">
              {`Ya tienes ${existing.name}${existing.quantity !== null ? ` (${formatQuantity(existing.quantity, existing.unit)})` : ''}`}
            </AppText>
            <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
              Se guardará aparte porque la unidad es distinta
            </AppText>
          </View>
        </View>
      )}

      {existing && mergeCompatible && (
        <Pressable
          onPress={onToggleMerge}
          style={styles.merge}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: mergeChecked }}
        >
          {mergeChecked ? (
            <View style={styles.boxOn}>
              <Ionicons name="checkmark" size={14} color={colors.onInk} />
            </View>
          ) : (
            <View style={styles.boxOff} />
          )}
          <View style={styles.mergeText}>
            <AppText variant="metadata" weight="semibold">
              {`Ya tienes ${existing.name}${existing.quantity !== null ? ` (${formatQuantity(existing.quantity, existing.unit)})` : ''}`}
            </AppText>
            <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
              {mergeChecked ? `Sumar ${addQty} y conservar la fecha más próxima` : 'Se guardará como un alimento aparte'}
            </AppText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
  },
  off: {
    opacity: 0.62,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  checkArea: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingLeft: 6,
  },
  name: {
    fontSize: 16,
    lineHeight: 21,
  },
  badge: {
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  merge: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.fields,
    backgroundColor: colors.m3.surfaceContainerLow,
  },
  mergeText: {
    flex: 1,
    gap: 2,
  },
  boxOn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOff: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.m3.outline,
  },
});
