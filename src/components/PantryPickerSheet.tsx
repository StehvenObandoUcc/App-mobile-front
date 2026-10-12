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
import { radii, spacing, elevations, getCategoryConfig } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';
import { formatQuantity } from '../utils/units';
import { daysUntil } from '../utils/dates';
import { useI18n, type t as TFn } from '../i18n';

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

function stockLabel(
  colors: ThemeColors,
  item: Ingredient,
  t: typeof TFn
): { text: string; tone: { background: string; text: string } } {
  // «Sin stock» no es un error ni un vencimiento: neutro (Ladrillo solo para vencido).
  if (item.quantity === 0) return { text: t('sheets.pantryPicker.noStock'), tone: { background: colors.surfaceVariant, text: colors.textSecondary } };
  const d = daysUntil(item.expirationDate);
  const qty = item.quantity !== null ? formatQuantity(item.quantity, item.unit) : t('sheets.pantryPicker.noQuantity');
  if (d !== null && d < 0) return { text: t('sheets.pantryPicker.expired', { qty }), tone: colors.functional.expired };
  if (d !== null && d <= 3) {
    const text = d === 0 ? t('sheets.pantryPicker.expiresToday', { qty }) : t('sheets.pantryPicker.expiresIn', { qty, count: d });
    return { text, tone: colors.functional.expiringSoon };
  }
  return { text: qty, tone: { background: colors.surfaceVariant, text: colors.textSecondary } };
}

export function PantryPickerSheet({ visible, items, isInList, onPick, onClose }: PantryPickerSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <DialogTitle title={t('sheets.pantryPicker.title')} emphasis={t('sheets.pantryPicker.titleEmphasis')} />
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {t('sheets.pantryPicker.hint')}
              </AppText>
            </View>
            <IconButton iconName="close" variant="neutral" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.closeBtn} />
          </View>
          <SearchInput value={query} onChangeText={setQuery} placeholder={t('sheets.pantryPicker.searchPlaceholder')} />
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
              const stock = stockLabel(colors, item, t);
              return (
                <Pressable
                  onPress={() => !added && onPick(item)}
                  style={({ pressed }) => [styles.row, pressed && !added && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: added }}
                  accessibilityLabel={added ? t('sheets.pantryPicker.inListA11y', { name: item.name }) : t('sheets.pantryPicker.addA11y', { name: item.name })}
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
                {query.trim() ? t('sheets.pantryPicker.noMatches') : t('sheets.pantryPicker.empty')}
              </AppText>
            }
          />
          <SecondaryButton title={t('sheets.pantryPicker.done')} variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
