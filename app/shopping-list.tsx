import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { useInventory } from '../src/hooks/useInventory';
import { getExpirationStatus } from '../src/utils/expiration';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppScreen,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  EmptyState,
  ActionSheetModal,
  getBottomContentPadding,
  M3Dialog,
  Chip,
} from '../src/components';
import { IngredientCategory, IngredientUnit, ShoppingItem } from '../src/types';
import { Modal } from 'react-native';
import { colors, radii, spacing, typography } from '../src/theme';

const CATEGORIES: { label: string; value: IngredientCategory; icon: any }[] = [
  { label: 'Verduras', value: 'vegetable', icon: 'leaf-outline' },
  { label: 'Frutas', value: 'fruit', icon: 'nutrition-outline' },
  { label: 'Proteínas', value: 'protein', icon: 'fish-outline' },
  { label: 'Lácteos', value: 'dairy', icon: 'water-outline' },
  { label: 'Granos', value: 'grain', icon: 'cube-outline' },
  { label: 'Otros', value: 'other', icon: 'basket-outline' },
];

const UNITS: { label: string; value: IngredientUnit }[] = [
  { label: 'uds', value: 'units' },
  { label: 'kg', value: 'kilograms' },
  { label: 'g', value: 'grams' },
  { label: 'L', value: 'liters' },
  { label: 'ml', value: 'milliliters' },
  { label: 'paq', value: 'package' },
];

export default function ShoppingListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    pendingItems,
    boughtItems,
    addItem,
    toggleBought,
    deleteItem,
    clearBought,
    moveBoughtToInventory,
  } = useShoppingList();
  const { items: inventoryItems } = useInventory();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<IngredientUnit>('units');
  const [category, setCategory] = useState<IngredientCategory>('other');
  const [isAdding, setIsAdding] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Estados para selector de adición
  const [isAddChooserVisible, setIsAddChooserVisible] = useState(false);
  const [isInventoryPickerVisible, setIsInventoryPickerVisible] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    confirmText?: string;
    onConfirm: () => void;
    cancelText?: string;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  // Inventario filtrado y ordenado para el picker
  const filteredInventory = inventoryItems
    .filter((inv) => inv.name.toLowerCase().includes(inventorySearch.toLowerCase().trim()))
    .sort((a, b) => {
      const sa = getExpirationStatus(a.expirationDate);
      const sb = getExpirationStatus(b.expirationDate);
      const prioA = sa.status === 'expired' ? 3 : sa.status === 'expiringSoon' ? 2 : 1;
      const prioB = sb.status === 'expired' ? 3 : sb.status === 'expiringSoon' ? 2 : 1;
      return prioB - prioA;
    });

  const handleAddFromInventory = async (invItem: typeof inventoryItems[0]) => {
    try {
      await addItem(invItem.name, invItem.quantity || 1, invItem.unit, invItem.category);
    } catch {
      setDialogConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo agregar el producto a la lista.',
        type: 'error',
        onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
      });
    }
  };

  const handleAddItem = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogConfig({
        visible: true,
        title: 'Nombre requerido',
        message: 'Por favor ingresa el nombre del producto a comprar.',
        type: 'warning',
        onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
      });
      return;
    }

    if (trimmed.length > 60) {
      setDialogConfig({
        visible: true,
        title: 'Nombre muy largo',
        message: 'El nombre del producto no puede superar los 60 caracteres.',
        type: 'warning',
        onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
      });
      return;
    }

    let parsedQty: number | null = null;
    if (quantity.trim()) {
      const q = parseFloat(quantity.trim().replace(',', '.'));
      if (isNaN(q) || q <= 0) {
        setDialogConfig({
          visible: true,
          title: 'Cantidad inválida',
          message: 'La cantidad debe ser un número positivo mayor que cero.',
          type: 'warning',
          onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
        });
        return;
      }
      if (q > 99999) {
        setDialogConfig({
          visible: true,
          title: 'Cantidad excedida',
          message: 'La cantidad no puede superar 99,999.',
          type: 'warning',
          onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
        });
        return;
      }
      parsedQty = q;
    }

    try {
      await addItem(trimmed, parsedQty, unit, category);
      setName('');
      setQuantity('');
      setIsAdding(false);
    } catch {
      setDialogConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo agregar el producto a la lista.',
        type: 'error',
        onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
      });
    }
  };

  const handleMoveToInventory = async () => {
    if (boughtItems.length === 0) return;

    setDialogConfig({
      visible: true,
      title: 'Pasar a mi despensa',
      message: `¿Deseas transferir ${boughtItems.length} producto(s) comprados a tu inventario? Se calculará su fecha estimada de caducidad.`,
      type: 'info',
      confirmText: 'Sí, transferir',
      cancelText: 'Cancelar',
      onCancel: () => setDialogConfig((p) => ({ ...p, visible: false })),
      onConfirm: async () => {
        setDialogConfig((p) => ({ ...p, visible: false }));
        setIsMoving(true);
        try {
          const movedCount = await moveBoughtToInventory();
          setDialogConfig({
            visible: true,
            title: '¡Despensa actualizada!',
            message: `Se han agregado ${movedCount} alimento(s) a tu inventario con caducidad estimada.`,
            type: 'success',
            confirmText: 'Ver inventario',
            cancelText: 'Continuar en lista',
            onCancel: () => setDialogConfig((p) => ({ ...p, visible: false })),
            onConfirm: () => {
              setDialogConfig((p) => ({ ...p, visible: false }));
              router.push('/inventory');
            },
          });
        } catch {
          setDialogConfig({
            visible: true,
            title: 'Error',
            message: 'No se pudieron mover los productos al inventario.',
            type: 'error',
            onConfirm: () => setDialogConfig((p) => ({ ...p, visible: false })),
          });
        } finally {
          setIsMoving(false);
        }
      },
    });
  };

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(110, getBottomContentPadding(insets.bottom)) },
          ]}
        >
          {/* ── Cabecera Editorial ── */}
          <View style={styles.headerSection}>
            <Text style={styles.screenTitle}>Lista de Compras</Text>
            <Text style={styles.screenSubtitle}>
              {items.length === 0
                ? 'Agrega productos para planificar tu compra'
                : `${pendingItems.length} pendiente${pendingItems.length === 1 ? '' : 's'} · ${boughtItems.length} comprada${boughtItems.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          {/* ── Resumen Estadístico ── */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryPending]}>
              <View style={styles.summaryIconCirclePending}>
                <Ionicons name="cart-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryNum}>{pendingItems.length}</Text>
                <Text style={styles.summaryLabel}>Por comprar</Text>
              </View>
            </View>

            <View style={[styles.summaryCard, styles.summaryBought]}>
              <View style={styles.summaryIconCircleBought}>
                <Ionicons name="checkmark-done" size={20} color={colors.functional.fresh.text} />
              </View>
              <View>
                <Text style={styles.summaryNum}>{boughtItems.length}</Text>
                <Text style={styles.summaryLabel}>Comprados</Text>
              </View>
            </View>
          </View>

          {/* ── Botón / Formulario Rápido de Añadir ── */}
          {!isAdding ? (
            <Pressable
              style={({ pressed }) => [styles.addTriggerButton, pressed && styles.cardPressed]}
              onPress={() => setIsAddChooserVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar producto a comprar"
            >
              <Ionicons name="add-circle" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.addTriggerText}>Agregar producto a la lista</Text>
            </Pressable>
          ) : (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Nuevo Producto</Text>
                <Pressable onPress={() => setIsAdding(false)} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre (ej. Leche, Tomates, Huevos)"
                placeholderTextColor={colors.textMuted}
                maxLength={60}
                style={styles.textInput}
                autoFocus
              />

              <View style={styles.qtyRow}>
                <TextInput
                  value={quantity}
                  onChangeText={(val) => setQuantity(val.replace(/[^0-9.]/g, ''))}
                  placeholder="Cant. (positiva)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={8}
                  style={[styles.textInput, { flex: 1, marginRight: 10 }]}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1.5 }}>
                  <View style={styles.unitChipContainer}>
                    {UNITS.map((u) => (
                      <Chip
                        key={u.value}
                        label={u.label}
                        selected={unit === u.value}
                        onPress={() => setUnit(u.value)}
                        variant="filter"
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Categorías */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
                <View style={styles.categoryChipContainer}>
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.value}
                      label={cat.label}
                      icon={cat.icon}
                      selected={category === cat.value}
                      onPress={() => setCategory(cat.value)}
                      variant="filter"
                    />
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <SecondaryButton title="Cancelar" variant="outline" onPress={() => setIsAdding(false)} />
                </View>
                <View style={{ flex: 1.5 }}>
                  <PrimaryButton title="Guardar" iconName="checkmark" onPress={handleAddItem} />
                </View>
              </View>
            </View>
          )}

          {/* ── Lista de Pendientes ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Por Comprar ({pendingItems.length})</Text>
          </View>

          {pendingItems.length === 0 && (
            <EmptyState
              title="No tienes compras pendientes"
              description="Agrega productos arriba o desde los ingredientes que te falten en cualquier receta."
              iconName="basket-outline"
            />
          )}

          {pendingItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Pressable
                onPress={() => toggleBought(item.id)}
                style={styles.checkboxCircle}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: false }}
              >
                <View style={styles.checkboxInnerUnchecked} />
              </Pressable>

              <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.recipeSource && (
                  <View style={styles.sourceBadge}>
                    <Ionicons name="restaurant-outline" size={11} color={colors.primaryDark} style={{ marginRight: 3 }} />
                    <Text style={styles.sourceText} numberOfLines={1}>
                      Receta: {item.recipeSource}
                    </Text>
                  </View>
                )}
              </View>

              {item.quantity !== null && (
                <Text style={styles.itemQty}>
                  {item.quantity} {item.unit}
                </Text>
              )}

              <Pressable
                onPress={() => deleteItem(item.id)}
                style={styles.deleteButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error.text} />
              </Pressable>
            </View>
          ))}

          {/* ── Lista de Comprados ── */}
          {boughtItems.length > 0 && (
            <View style={{ marginTop: spacing.xxl }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.functional.fresh.text }]}>
                  Comprados ({boughtItems.length})
                </Text>
                <Pressable onPress={clearBought}>
                  <Text style={styles.clearText}>Limpiar</Text>
                </Pressable>
              </View>

              {boughtItems.map((item) => (
                <View key={item.id} style={[styles.itemCard, styles.itemCardBought]}>
                  <Pressable
                    onPress={() => toggleBought(item.id)}
                    style={[styles.checkboxCircle, styles.checkboxCircleChecked]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: true }}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.surface} />
                  </Pressable>

                  <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                    <Text style={[styles.itemName, styles.itemNameBought]}>{item.name}</Text>
                  </View>

                  {item.quantity !== null && (
                    <Text style={[styles.itemQty, styles.itemQtyBought]}>
                      {item.quantity} {item.unit}
                    </Text>
                  )}

                  <Pressable
                    onPress={() => deleteItem(item.id)}
                    style={styles.deleteButton}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${item.name} de compras`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              {/* Botón Mover a Inventario */}
              <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
                <PrimaryButton
                  title={`Pasar ${boughtItems.length} a mi despensa`}
                  iconName="arrow-up-circle"
                  onPress={handleMoveToInventory}
                  isLoading={isMoving}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Selector de Tipo de Adición (BUG/Feature UI) ── */}
      <ActionSheetModal
        visible={isAddChooserVisible}
        onClose={() => setIsAddChooserVisible(false)}
        title="Agregar a la lista de compras"
        description="¿Cómo deseas agregar este producto?"
        actions={[
          {
            label: 'Elegir de mi despensa / inventario',
            icon: 'basket-outline',
            onPress: () => {
              setIsAddChooserVisible(false);
              setIsInventoryPickerVisible(true);
            },
          },
          {
            label: 'Crear nuevo producto personalizado',
            icon: 'add-circle-outline',
            onPress: () => {
              setIsAddChooserVisible(false);
              setIsAdding(true);
            },
          },
        ]}
      />

      {/* ── Modal de Selección desde Inventario ── */}
      <Modal
        visible={isInventoryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsInventoryPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="basket" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Agregar desde tu Despensa</Text>
                  <Text style={styles.modalSubtitle}>Toca un alimento para añadirlo</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setIsInventoryPickerVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de despensa"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <SearchInput
                value={inventorySearch}
                onChangeText={setInventorySearch}
                placeholder="Buscar en tu despensa..."
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {filteredInventory.length === 0 ? (
                <EmptyState
                  title={inventorySearch.trim() ? 'No hay alimentos que coincidan' : 'No tienes alimentos en tu inventario'}
                  description={inventorySearch.trim() ? 'Prueba con otro término de búsqueda.' : 'Agrega alimentos desde la pestaña Despensa.'}
                  iconName="basket-outline"
                />
              ) : (
                filteredInventory.map((inv) => {
                  const s = getExpirationStatus(inv.expirationDate);
                  const isAlreadyInList = pendingItems.some(
                    (p) => p.name.toLowerCase() === inv.name.toLowerCase()
                  );

                  return (
                    <Pressable
                      key={inv.id}
                      onPress={() => handleAddFromInventory(inv)}
                      style={({ pressed }) => [
                        styles.invPickerRow,
                        pressed && styles.cardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Agregar ${inv.name} a compras`}
                    >
                      <View style={[styles.invPickerIcon, { backgroundColor: colors.primaryContainer }]}>
                        <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.invPickerName} numberOfLines={1}>
                          {inv.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {inv.quantity !== null && (
                            <Text style={styles.invPickerQty}>
                              Stock: {inv.quantity} {inv.unit}
                            </Text>
                          )}
                          <Chip variant="status" status={s.status} label={s.label} />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.invPickerAddBtn,
                          isAlreadyInList && styles.invPickerAddBtnAdded,
                        ]}
                      >
                        <Ionicons
                          name={isAlreadyInList ? 'checkmark' : 'add'}
                          size={18}
                          color={isAlreadyInList ? colors.functional.fresh.text : colors.surface}
                        />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={{ marginTop: 14 }}>
              <SecondaryButton
                title="Listo"
                variant="outline"
                onPress={() => setIsInventoryPickerVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 110,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  screenTitle: {
    fontSize: typography.sizes.screenTitle,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  summaryPending: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.border,
  },
  summaryBought: {
    backgroundColor: colors.functional.fresh.background,
    borderColor: colors.functional.fresh.border,
  },
  summaryIconCirclePending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryIconCircleBought: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.functional.fresh.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryNum: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.sizes.label,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.circular,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addTriggerText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  invPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invPickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invPickerName: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  invPickerQty: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  invPickerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invPickerAddBtnAdded: {
    backgroundColor: colors.functional.fresh.background,
    borderWidth: 1,
    borderColor: colors.functional.fresh.border,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: typography.sizes.bodySmall,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unitChipContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  categoryChipContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clearText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.error.text,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.buttons,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardBought: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    opacity: 0.8,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: colors.functional.fresh.text,
    borderColor: colors.functional.fresh.text,
  },
  checkboxInnerUnchecked: {
    width: 0,
    height: 0,
  },
  itemName: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemNameBought: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: typography.sizes.micro,
    lineHeight: typography.lineHeights.micro,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
  },
  itemQty: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 10,
  },
  itemQtyBought: {
    color: colors.textMuted,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
