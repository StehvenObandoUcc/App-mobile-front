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
import { getExpirationStatus } from '../src/components/IngredientCard';
import {
  AppScreen,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  StatusBadge,
  ActionSheetModal,
} from '../src/components';
import { IngredientCategory, IngredientUnit, ShoppingItem } from '../src/types';
import { Modal } from 'react-native';

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
      Alert.alert('Error', 'No se pudo agregar el producto a la lista.');
    }
  };

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa el nombre del producto a comprar.');
      return;
    }

    const parsedQty = quantity.trim() ? parseFloat(quantity.replace(',', '.')) : null;

    try {
      await addItem(name.trim(), isNaN(parsedQty as number) ? null : parsedQty, unit, category);
      setName('');
      setQuantity('');
      setIsAdding(false);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el producto a la lista.');
    }
  };

  const handleMoveToInventory = async () => {
    if (boughtItems.length === 0) return;

    Alert.alert(
      'Pasar a mi despensa',
      `¿Deseas transferir ${boughtItems.length} producto(s) comprados a tu inventario? Se calculará su fecha estimada de caducidad.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, transferir',
          style: 'default',
          onPress: async () => {
            setIsMoving(true);
            try {
              const movedCount = await moveBoughtToInventory();
              Alert.alert(
                '¡Despensa actualizada!',
                `Se han agregado ${movedCount} alimento(s) a tu inventario con caducidad estimada.`,
                [
                  { text: 'Ver inventario', onPress: () => router.push('/inventory') },
                  { text: 'Continuar en lista', style: 'cancel' },
                ]
              );
            } catch {
              Alert.alert('Error', 'No se pudieron mover los productos al inventario.');
            } finally {
              setIsMoving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView
        behavior="height"
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ── Resumen Estadístico ── */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryPending]}>
              <View style={styles.summaryIconCirclePending}>
                <Ionicons name="cart-outline" size={20} color="#B94E35" />
              </View>
              <View>
                <Text style={styles.summaryNum}>{pendingItems.length}</Text>
                <Text style={styles.summaryLabel}>Por comprar</Text>
              </View>
            </View>

            <View style={[styles.summaryCard, styles.summaryBought]}>
              <View style={styles.summaryIconCircleBought}>
                <Ionicons name="checkmark-done" size={20} color="#28613C" />
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
              <Ionicons name="add-circle" size={22} color="#B94E35" style={{ marginRight: 8 }} />
              <Text style={styles.addTriggerText}>Agregar producto a la lista</Text>
            </Pressable>
          ) : (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Nuevo Producto</Text>
                <Pressable onPress={() => setIsAdding(false)} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={22} color="#66534A" />
                </Pressable>
              </View>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre (ej. Leche, Tomates, Huevos)"
                placeholderTextColor="#96857C"
                style={styles.textInput}
                autoFocus
              />

              <View style={styles.qtyRow}>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Cant. (opcional)"
                  placeholderTextColor="#96857C"
                  keyboardType="decimal-pad"
                  style={[styles.textInput, { flex: 1, marginRight: 10 }]}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1.5 }}>
                  <View style={styles.unitChipContainer}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u.value}
                        onPress={() => setUnit(u.value)}
                        style={[styles.unitChip, unit === u.value && styles.unitChipSelected]}
                      >
                        <Text style={[styles.unitChipText, unit === u.value && styles.unitChipTextSelected]}>
                          {u.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Categorías */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={styles.categoryChipContainer}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      style={[styles.categoryChip, category === cat.value && styles.categoryChipSelected]}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={14}
                        color={category === cat.value ? '#FFFFFF' : '#6B7280'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.value && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
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
            <View style={styles.emptyCard}>
              <Ionicons name="basket-outline" size={36} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No tienes compras pendientes</Text>
              <Text style={styles.emptySubtitle}>
                Agrega productos arriba o desde los ingredientes que te falten en cualquier receta.
              </Text>
            </View>
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

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.recipeSource && (
                  <View style={styles.sourceBadge}>
                    <Ionicons name="restaurant-outline" size={11} color="#863626" style={{ marginRight: 3 }} />
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
                <Ionicons name="trash-outline" size={18} color="#A93632" />
              </Pressable>
            </View>
          ))}

          {/* ── Lista de Comprados ── */}
          {boughtItems.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#28613C' }]}>
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
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </Pressable>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
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
                  >
                    <Ionicons name="trash-outline" size={18} color="#96857C" />
                  </Pressable>
                </View>
              ))}

              {/* Botón Mover a Inventario */}
              <View style={{ marginTop: 16, marginBottom: 12 }}>
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
                  <Ionicons name="basket" size={20} color="#B94E35" />
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
              >
                <Ionicons name="close" size={22} color="#66534A" />
              </Pressable>
            </View>

            <View style={{ marginBottom: 12 }}>
              <SearchInput
                value={inventorySearch}
                onChangeText={setInventorySearch}
                placeholder="Buscar en tu despensa..."
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {filteredInventory.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="basket-outline" size={32} color="#96857C" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#66534A', marginTop: 8 }}>
                    {inventorySearch.trim()
                      ? 'No hay alimentos que coincidan'
                      : 'No tienes alimentos en tu inventario'}
                  </Text>
                </View>
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
                      <View style={[styles.invPickerIcon, { backgroundColor: '#FBE9E2' }]}>
                        <Ionicons name="nutrition-outline" size={18} color="#B94E35" />
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
                          <StatusBadge status={s.status} label={s.label} />
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
                          color={isAlreadyInList ? '#28613C' : '#FFFFFF'}
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFF9F2' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    backgroundColor: '#FFF1E3',
    borderColor: '#FCE2CC',
  },
  summaryBought: {
    backgroundColor: '#EAF4ED',
    borderColor: '#C2DFCB',
  },
  summaryIconCirclePending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryIconCircleBought: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7ECD9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2B211D',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  addTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0E4D8',
    borderRadius: 999,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
    shadowColor: '#B94E35',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B94E35',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B211D',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#66534A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  invPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0E4D8',
  },
  invPickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invPickerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B211D',
  },
  invPickerQty: {
    fontSize: 12,
    color: '#66534A',
    fontWeight: '500',
  },
  invPickerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#B94E35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invPickerAddBtnAdded: {
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#C2DFCB',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    marginBottom: 20,
    shadowColor: '#2B211D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B211D',
  },
  textInput: {
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#2B211D',
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitChipContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8EDE2',
  },
  unitChipSelected: {
    backgroundColor: '#B94E35',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  unitChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryChipContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F8EDE2',
  },
  categoryChipSelected: {
    backgroundColor: '#B94E35',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B211D',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A93632',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  itemCardBought: {
    backgroundColor: '#F8EDE2',
    borderColor: '#EBDDD2',
    opacity: 0.8,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EBDDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: '#28613C',
    borderColor: '#28613C',
  },
  checkboxInnerUnchecked: {
    width: 0,
    height: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B211D',
  },
  itemNameBought: {
    textDecorationLine: 'line-through',
    color: '#96857C',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBE9E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#863626',
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#66534A',
    marginRight: 10,
  },
  itemQtyBought: {
    color: '#96857C',
  },
  deleteButton: {
    padding: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B211D',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#66534A',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
