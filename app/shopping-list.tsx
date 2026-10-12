import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { useInventory } from '../src/hooks/useInventory';
import {
  AppScreen,
  AppText,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  ActionSheetModal,
  M3Dialog,
  ScreenHeader,
  CountTile,
  DashedAddButton,
  ShoppingItemRow,
  ShoppingItemFormSheet,
  PantryPickerSheet,
  NAV_HEIGHT,
  NAV_BOTTOM_OFFSET,
  getBottomContentPadding,
} from '../src/components';
import { IngredientCategory, IngredientUnit, ShoppingItem, Ingredient } from '../src/types';
import { normalizeName } from '../src/utils/consumption';
import { spacing, elevations } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

/**
 * Compras (Compras.dc.html · Compras-Agregar.dc.html · Compras-Estados.dc.html).
 * Encabezado, fichas «Por comprar / Comprados», botón punteado «Agregar», secciones con ShoppingItemRow,
 * botón flotante «Pasar N a mi despensa». Quitar y Limpiar piden confirmación (tarjeta centrada).
 */
type DialogState = {
  visible: boolean;
  title: string;
  titleEmphasis?: string;
  message: string;
  type?: 'neutral' | 'ai' | 'success' | 'warning' | 'error';
  iconName?: 'trash-outline';
  confirmText?: string;
  confirmTone?: 'ink' | 'danger';
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  actionsLayout?: 'row' | 'stacked';
  hero?: boolean;
};

const EMPTY_FORM = { name: '', quantity: '1', unit: 'units' as IngredientUnit, category: 'other' as IngredientCategory };

export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pendingItems, boughtItems, addItem, toggleBought, deleteItem, clearBought, moveBoughtToInventory } =
    useShoppingList();
  const { items: inventoryItems } = useInventory();
  const { t, tp } = useI18n();

  const [chooserVisible, setChooserVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isMoving, setIsMoving] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const closeDialog = () => setDialog((p) => ({ ...p, visible: false }));

  const showError = (message: string) =>
    setDialog({ visible: true, title: t('screensFlow.shopping.errorTitle'), titleEmphasis: t('screensFlow.shopping.errorEmphasis'), message, type: 'error', onConfirm: closeDialog });
  const warn = (title: string, titleEmphasis: string, message: string) =>
    setDialog({ visible: true, title, titleEmphasis, message, type: 'neutral', onConfirm: closeDialog });

  // ── Agregar ──
  const pendingNames = useMemo(() => new Set(pendingItems.map((p) => normalizeName(p.name))), [pendingItems]);
  const handlePick = async (inv: Ingredient) => {
    try {
      // Agotado (0): se agrega sin cantidad para que elijas cuánto comprar.
      await addItem(inv.name, inv.quantity ? inv.quantity : null, inv.unit, inv.category);
    } catch {
      showError(t('screensFlow.shopping.addFailed'));
    }
  };

  const handleSaveForm = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) return warn(t('screensFlow.shopping.noNameTitle'), t('screensFlow.shopping.noNameEmphasis'), t('screensFlow.shopping.noNameMessage'));
    if (trimmed.length > 60) return warn(t('screensFlow.shopping.nameTooLongTitle'), t('screensFlow.shopping.nameTooLongEmphasis'), t('screensFlow.shopping.nameTooLongMessage'));
    let qty: number | null = null;
    if (form.quantity.trim()) {
      const q = parseFloat(form.quantity.trim().replace(',', '.'));
      if (isNaN(q) || q <= 0 || q > 99999) return warn(t('screensFlow.shopping.quantityInvalidTitle'), t('screensFlow.shopping.quantityInvalidEmphasis'), t('screensFlow.shopping.quantityInvalidMessage'));
      qty = q;
    }
    try {
      await addItem(trimmed, qty, form.unit, form.category);
      setFormVisible(false);
      setForm(EMPTY_FORM);
    } catch {
      showError(t('screensFlow.shopping.addFailed'));
    }
  };

  // ── Quitar / Limpiar (siempre con confirmación) ──
  const confirmRemove = (item: ShoppingItem) =>
    setDialog({
      visible: true,
      title: t('screensFlow.shopping.removeTitle'),
      titleEmphasis: `${item.name}?`,
      message: t('screensFlow.shopping.removeMessage'),
      type: 'error',
      iconName: 'trash-outline',
      confirmText: t('screensFlow.shopping.removeConfirm'),
      confirmTone: 'danger',
      cancelText: t('common.cancel'),
      onCancel: closeDialog,
      onConfirm: () => {
        closeDialog();
        deleteItem(item.id).catch(() => showError(t('screensFlow.shopping.removeFailed')));
      },
    });

  const confirmClear = () => {
    const n = boughtItems.length;
    setDialog({
      visible: true,
      title: t('screensFlow.shopping.clearTitle'),
      titleEmphasis: tp('screensFlow.shopping.clearEmphasis', n),
      message: t('screensFlow.shopping.clearMessage'),
      type: 'error',
      iconName: 'trash-outline',
      confirmText: t('screensFlow.shopping.clearConfirm'),
      confirmTone: 'danger',
      cancelText: t('common.cancel'),
      onCancel: closeDialog,
      onConfirm: () => {
        closeDialog();
        clearBought().catch(() => showError(t('screensFlow.shopping.clearFailed')));
      },
    });
  };

  // ── Pasar a la despensa (Compras-Estados · derecha) ──
  const handleMove = async () => {
    if (boughtItems.length === 0 || isMoving) return;
    setIsMoving(true);
    try {
      const moved = await moveBoughtToInventory();
      setDialog({
        visible: true,
        title: t('screensFlow.shopping.movedTitle'),
        titleEmphasis: t('screensFlow.shopping.movedEmphasis'),
        message: tp('screensFlow.shopping.movedMessage', moved),
        type: 'success',
        hero: true,
        actionsLayout: 'stacked',
        confirmText: t('screensFlow.shopping.viewPantry'),
        cancelText: t('screensFlow.shopping.stayShopping'),
        onCancel: closeDialog,
        onConfirm: () => {
          closeDialog();
          router.navigate('/inventory');
        },
      });
    } catch {
      showError(t('screensFlow.shopping.moveFailed'));
    } finally {
      setIsMoving(false);
    }
  };

  const openChooser = () => setChooserVisible(true);
  const moveButtonBottom = Math.max(insets.bottom, 0) + NAV_BOTTOM_OFFSET + NAV_HEIGHT + 16;

  const overlays = (
    <>
      <ActionSheetModal
        visible={chooserVisible}
        onClose={() => setChooserVisible(false)}
        variant="choices"
        title={t('screensFlow.shopping.chooserTitle')}
        titleEmphasis={t('screensFlow.shopping.chooserEmphasis')}
        description={t('screensFlow.shopping.chooserDescription')}
        actions={[
          {
            label: t('screensFlow.shopping.fromPantry'),
            description: t('screensFlow.shopping.fromPantryDescription'),
            icon: 'basket-outline',
            tone: colors.categories.vegetable,
            onPress: () => setPickerVisible(true),
          },
          {
            label: t('screensFlow.shopping.newProduct'),
            description: t('screensFlow.shopping.newProductDescription'),
            icon: 'add',
            tone: { background: colors.primaryContainer, text: colors.onPrimaryContainer },
            onPress: () => {
              setForm(EMPTY_FORM);
              setFormVisible(true);
            },
          },
        ]}
      />
      <PantryPickerSheet
        visible={pickerVisible}
        items={inventoryItems}
        isInList={(inv) => pendingNames.has(normalizeName(inv.name))}
        onPick={handlePick}
        onClose={() => setPickerVisible(false)}
      />
      <ShoppingItemFormSheet
        visible={formVisible}
        values={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
        onSubmit={handleSaveForm}
        onClose={() => setFormVisible(false)}
      />
      <M3Dialog
        visible={dialog.visible}
        title={dialog.title}
        titleEmphasis={dialog.titleEmphasis}
        message={dialog.message}
        type={dialog.type}
        iconName={dialog.iconName}
        confirmText={dialog.confirmText}
        confirmTone={dialog.confirmTone}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        actionsLayout={dialog.actionsLayout}
        hero={dialog.hero}
      />
    </>
  );

  // ── Sin compras (Compras-Estados · izquierda) ──
  if (items.length === 0) {
    return (
      <AppScreen style={styles.screen}>
        <View style={styles.header}>
          <ScreenHeader title={t('screensFlow.shopping.headerTitle')} emphasis={t('screensFlow.shopping.headerEmphasis')} />
        </View>
        <View style={[styles.emptyWrap, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
          <EmptyState
            title={t('screensFlow.shopping.emptyTitle')}
            titleEmphasis={t('screensFlow.shopping.emptyEmphasis')}
            description={t('screensFlow.shopping.emptyDescription')}
            iconName="cart-outline"
            tone="brand"
            blobDotColors={[colors.secondaryContainer, colors.categories.grain.background]}
            actionLabel={t('screensFlow.shopping.addProduct')}
            actionIconName="add"
            onAction={openChooser}
          />
        </View>
        {overlays}
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) + (boughtItems.length > 0 ? 72 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('screensFlow.shopping.headerTitle')} emphasis={t('screensFlow.shopping.headerEmphasis')} subtitle={t('screensFlow.shopping.headerSubtitle')} />

        <View style={styles.tiles}>
          <CountTile label={t('screensFlow.shopping.tileToBuy')} value={pendingItems.length} tone={{ background: colors.primaryContainer, text: colors.onPrimaryContainer }} />
          <CountTile label={t('screensFlow.shopping.tileBought')} value={boughtItems.length} tone={colors.functional.fresh} />
        </View>

        <DashedAddButton label={t('screensFlow.shopping.addToList')} onPress={openChooser} />

        <AppText variant="sectionTitle" style={styles.sectionTitle} accessibilityRole="header">
          {t('screensFlow.shopping.sectionToBuy')}
          <AppText weight="regular" color={colors.textSecondary}>{`· ${pendingItems.length}`}</AppText>
        </AppText>
        <View style={styles.list}>
          {pendingItems.length === 0 ? (
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {t('screensFlow.shopping.allBoughtHint')}
            </AppText>
          ) : (
            pendingItems.map((item) => (
              <ShoppingItemRow key={item.id} item={item} onToggle={() => toggleBought(item.id)} onRemove={() => confirmRemove(item)} />
            ))
          )}
        </View>

        {boughtItems.length > 0 && (
          <>
            <View style={styles.boughtHeader}>
              <AppText variant="sectionTitle" color={colors.functional.fresh.text} style={styles.flex} accessibilityRole="header">
                {t('screensFlow.shopping.sectionBought')}
                <AppText weight="regular" color={colors.functional.fresh.text}>{`· ${boughtItems.length}`}</AppText>
              </AppText>
              <SecondaryButton
                title={t('screensFlow.shopping.clear')}
                variant="text"
                onPress={confirmClear}
                accessibilityLabel={t('screensFlow.shopping.clearA11y')}
                style={styles.clear}
              />
            </View>
            <View style={[styles.list, styles.boughtList]}>
              {boughtItems.map((item) => (
                <ShoppingItemRow key={item.id} item={item} onToggle={() => toggleBought(item.id)} onRemove={() => confirmRemove(item)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {boughtItems.length > 0 && (
        <View style={[styles.moveWrap, { bottom: moveButtonBottom }]} pointerEvents="box-none">
          <PrimaryButton
            title={t('screensFlow.shopping.moveButton', { count: boughtItems.length })}
            iconName="basket-outline"
            onPress={handleMove}
            isLoading={isMoving}
            style={styles.moveBtn}
          />
        </View>
      )}

      {overlays}
    </AppScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  screen: {
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 24,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 24,
    gap: 16,
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionTitle: {
    marginTop: 4,
  },
  list: {
    gap: 8,
  },
  boughtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  boughtList: {
    marginTop: -6,
  },
  clear: {
    paddingHorizontal: spacing.sm,
  },
  moveWrap: {
    position: 'absolute',
    left: spacing.screenGutter,
    right: spacing.screenGutter,
  },
  moveBtn: {
    minHeight: 56,
    ...elevations.lg,
  },
}));
