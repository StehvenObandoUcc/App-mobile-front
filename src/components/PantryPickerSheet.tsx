import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ingredient } from '../types';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { SearchInput } from './SearchInput';
import { DialogTitle } from './DialogTitle';
import { SecondaryButton } from './SecondaryButton';
import { colors, radii, spacing, elevations, getCategoryConfig } from '../theme';
import { formatQuantity } from '../utils/units';
import { daysUntil } from '../utils/dates';

/**
 * PantryPickerSheet — «Elegir de mi despensa» (Compras). Lo agotado y lo que vence primero va arriba.
 * Cada fila: icono de familia, nombre, existencias y un botón + (✓ si ya está en la lista).
 */
export type PantryPickerSheetProps = {
  visible: boolean;
  items: Ingredient[];
  isInList: (item: Ingredient) => boolean;
  onPick: (item: Ingredient) => void;
  onClose: () => void;
};

function stockLabel(item: Ingredient): { text: string; tone: { background: string; text: string } } {
  if (item.quantity === 0) return { text: 'Sin stock', tone: colors.functional.expired };
  const d = daysUntil(item.expirationDate);
  const qty = item.quantity !== null ? formatQuantity(item.quantity, item.unit) : 'Sin cantidad';
  if (d !== null && d < 0) return { text: `${qty} · vencido`, tone: colors.functional.expired };
  if (d !== null && d <= 3) return { text: `${qty} · vence ${d === 0 ? 'hoy' : `en ${d} d`}`, tone: colors.functional.expiringSoon };
  return { text: qty, tone: { background: colors.surfaceVariant, text: colors.textSecondary } };
}

export function PantryPickerSheet({ visible, items, isInList, onPick, onClose }: PantryPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const q = query.toLowerCase().trim();
    const rank = (i: Ingredient) => {
      if (i.quantity === 0) return -1;
      const d = daysUntil(i.expirationDate);
      return d === null ? 9999 : d;
    };
    return items.filter((i) => i.name.toLowerCase().includes(q)).sort((a, b) => rank(a) - rank(b));
  }, [items, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <DialogTitle title="Elegir de mi" emphasis="despensa" size={24} lineHeight={30} />
              <AppText variant="bodySmall" color={colors.textSecondary}>
                Lo agotado y lo que vence pronto aparece primero
              </AppText>
            </View>
            <IconButton iconName="close" variant="neutral" accessibilityLabel="Cerrar" onPress={onClose} style={styles.closeBtn} />
          </View>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Buscar en tu despensa…" />
          <FlatList
            data={sorted}
            keyExtractor={(i) => i.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const cfg = getCategoryConfig(item.category);
              const tone = colors.categories[item.category] || colors.categories.other;
              const added = isInList(item);
              const stock = stockLabel(item);
              return (
                <Pressable
                  onPress={() => !added && onPick(item)}
                  style={({ pressed }) => [styles.row, pressed && !added && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: added }}
                  accessibilityLabel={added ? `${item.name}, ya está en la lista` : `Agregar ${item.name} a compras`}
                >
                  <View style={[styles.icon, { backgroundColor: tone.background }]}>
                    <Ionicons name={cfg.icon} size={20} color={tone.text} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="body" weight="semibold" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <View style={[styles.stock, { backgroundColor: stock.tone.background }]}>
                      <AppText variant="caption" weight="semibold" color={stock.tone.text}>
                        {stock.text}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.add, added && styles.added]}>
                    <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? colors.functional.fresh.text : colors.onInk} />
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <AppText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.empty}>
                {query.trim() ? 'No hay alimentos que coincidan.' : 'Tu despensa está vacía.'}
              </AppText>
            }
          />
          <SecondaryButton title="Listo" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.containers,
    borderTopRightRadius: radii.containers,
    paddingTop: 10,
    paddingHorizontal: spacing.screenGutter,
    gap: 14,
    ...elevations.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.m3.outline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  rowPressed: {
    backgroundColor: colors.m3.surfaceContainer,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stock: {
    alignSelf: 'flex-start',
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  added: {
    backgroundColor: colors.functional.fresh.background,
  },
  empty: {
    paddingVertical: 24,
  },
});
