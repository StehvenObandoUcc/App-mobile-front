import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { useInventory } from '../src/hooks/useInventory';
import {
  AppScreen,
  AppText,
  PrimaryButton,
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
import { colors, radii, spacing, elevations } from '../src/theme';

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
  type?: 'success' | 'info' | 'warning' | 'error';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pendingItems, boughtItems, addItem, toggleBought, deleteItem, clearBought, moveBoughtToInventory } =
    useShoppingList();
  const { items: inventoryItems } = useInventory();

  const [chooserVisible, setChooserVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isMoving, setIsMoving] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const closeDialog = () => setDialog((p) => ({ ...p, visible: false }));

  const showError = (message: string) =>
    setDialog({ visible: true, title: 'Algo salió', titleEmphasis: 'mal', message, type: 'error', onConfirm: closeDialog });
  const warn = (title: string, titleEmphasis: string, message: string) =>
    setDialog({ visible: true, title, titleEmphasis, message, type: 'warning', onConfirm: closeDialog });

  // ── Agregar ──
  const pendingNames = useMemo(() => new Set(pendingItems.map((p) => normalizeName(p.name))), [pendingItems]);
  const handlePick = async (inv: Ingredient) => {
    try {
      // Agotado (0): se agrega sin cantidad para que elijas cuánto comprar.
      await addItem(inv.name, inv.quantity ? inv.quantity : null, inv.unit, inv.category);
    } catch {
      showError('No se pudo agregar el producto a la lista.');
    }
  };

  const handleSaveForm = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) return warn('Falta el', 'nombre', 'Escribe el nombre del producto que vas a comprar.');
    if (trimmed.length > 60) return warn('Nombre muy', 'largo', 'El nombre no puede pasar de 60 caracteres.');
    let qty: number | null = null;
    if (form.quantity.trim()) {
      const q = parseFloat(form.quantity.trim().replace(',', '.'));
      if (isNaN(q) || q <= 0 || q > 99999) return warn('Cantidad', 'inválida', 'Usa un número mayor que 0 y menor que 99 999.');
      qty = q;
    }
    try {
      await addItem(trimmed, qty, form.unit, form.category);
      setFormVisible(false);
      setForm(EMPTY_FORM);
    } catch {
      showError('No se pudo agregar el producto a la lista.');
    }
  };

  // ── Quitar / Limpiar (siempre con confirmación) ──
  const confirmRemove = (item: ShoppingItem) =>
    setDialog({
      visible: true,
      title: '¿Quitar',
      titleEmphasis: `${item.name}?`,
      message: 'Se quitará de tu lista de compras.',
      type: 'error',
      iconName: 'trash-outline',
      confirmText: 'Quitar',
      confirmTone: 'danger',
      cancelText: 'Cancelar',
      onCancel: closeDialog,
      onConfirm: () => {
        closeDialog();
        deleteItem(item.id).catch(() => showError('No se pudo quitar el producto.'));
      },
    });

  const confirmClear = () => {
    const n = boughtItems.length;
    setDialog({
      visible: true,
      title: '¿Limpiar',
      titleEmphasis: n === 1 ? '1 comprado?' : `${n} comprados?`,
      message: 'Se quitarán de la lista sin pasarlos a tu despensa.',
      type: 'error',
      iconName: 'trash-outline',
      confirmText: 'Limpiar',
      confirmTone: 'danger',
      cancelText: 'Cancelar',
      onCancel: closeDialog,
      onConfirm: () => {
        closeDialog();
        clearBought().catch(() => showError('No se pudo limpiar la lista.'));
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
        title: '¡Despensa',
        titleEmphasis: 'actualizada!',
        message: `Pasaste ${moved} ${moved === 1 ? 'producto' : 'productos'} a tu despensa. Les pusimos una fecha de vencimiento estimada que puedes cambiar.`,
        type: 'success',
        hero: true,
        actionsLayout: 'stacked',
        confirmText: 'Ver despensa',
        cancelText: 'Seguir en compras',
        onCancel: closeDialog,
        onConfirm: () => {
          closeDialog();
          router.navigate('/inventory');
        },
      });
    } catch {
      showError('No se pudieron pasar los productos a tu despensa.');
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
        title="Agregar a la"
        titleEmphasis="lista"
        description="¿Cómo deseas agregar este producto?"
        actions={[
          {
            label: 'Elegir de mi despensa',
            description: 'Repón algo que ya tienes o se está acabando',
            icon: 'basket-outline',
            tone: colors.categories.vegetable,
            onPress: () => setPickerVisible(true),
          },
          {
            label: 'Crear producto nuevo',
            description: 'Escribe el nombre, cantidad y categoría',
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
          <ScreenHeader title="Lista de" emphasis="compras" />
        </View>
        <View style={[styles.emptyWrap, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
          <EmptyState
            title="No tienes compras"
            titleEmphasis="pendientes"
            description="Agrega productos aquí o desde los ingredientes que te falten en cualquier receta."
            iconName="cart-outline"
            tone="brand"
            blobDotColors={[colors.secondaryContainer, colors.categories.grain.background]}
            actionLabel="Agregar producto"
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
        <ScreenHeader title="Lista de" emphasis="compras" subtitle="Marca lo que compres y pásalo a tu despensa" />

        <View style={styles.tiles}>
          <CountTile label="Por comprar" value={pendingItems.length} tone={{ background: colors.primaryContainer, text: colors.onPrimaryContainer }} />
          <CountTile label="Comprados" value={boughtItems.length} tone={colors.functional.fresh} />
        </View>

        <DashedAddButton label="Agregar producto a la lista" onPress={openChooser} />

        <AppText variant="sectionTitle" style={styles.sectionTitle} accessibilityRole="header">
          {'Por comprar '}
          <AppText weight="regular" color={colors.textSecondary}>{`· ${pendingItems.length}`}</AppText>
        </AppText>
        <View style={styles.list}>
          {pendingItems.length === 0 ? (
            <AppText variant="bodySmall" color={colors.textSecondary}>
              Todo comprado. Pásalo a tu despensa con el botón de abajo.
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
                {'Comprados '}
                <AppText weight="regular" color={colors.functional.fresh.text}>{`· ${boughtItems.length}`}</AppText>
              </AppText>
              <Pressable
                onPress={confirmClear}
                style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
                accessibilityRole="button"
                accessibilityLabel="Limpiar productos comprados"
              >
                <AppText variant="bodySmall" weight="semibold" color={colors.primary}>
                  Limpiar
                </AppText>
              </Pressable>
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
            title={`Pasar ${boughtItems.length} a mi despensa`}
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

const styles = StyleSheet.create({
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
    height: 48,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  clearPressed: {
    backgroundColor: colors.surfaceVariant,
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
});
