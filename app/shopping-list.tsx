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
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';
import { IngredientCategory, IngredientUnit, ShoppingItem } from '../src/types';

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

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<IngredientUnit>('units');
  const [category, setCategory] = useState<IngredientCategory>('other');
  const [isAdding, setIsAdding] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

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
                <Ionicons name="cart-outline" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.summaryNum}>{pendingItems.length}</Text>
                <Text style={styles.summaryLabel}>Por comprar</Text>
              </View>
            </View>

            <View style={[styles.summaryCard, styles.summaryBought]}>
              <View style={styles.summaryIconCircleBought}>
                <Ionicons name="checkmark-done" size={20} color="#059669" />
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
              style={styles.addTriggerButton}
              onPress={() => setIsAdding(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar producto a comprar"
            >
              <Ionicons name="add-circle" size={22} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.addTriggerText}>Agregar producto a la lista</Text>
            </Pressable>
          ) : (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Nuevo Producto</Text>
                <Pressable onPress={() => setIsAdding(false)} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={22} color="#9CA3AF" />
                </Pressable>
              </View>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre (ej. Leche, Tomates, Huevos)"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                autoFocus
              />

              <View style={styles.qtyRow}>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Cant. (opcional)"
                  placeholderTextColor="#9CA3AF"
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
                    <Ionicons name="restaurant-outline" size={11} color="#059669" style={{ marginRight: 3 }} />
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
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
          ))}

          {/* ── Lista de Comprados ── */}
          {boughtItems.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#059669' }]}>
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
                    <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                  </Pressable>
                </View>
              ))}

              {/* Botón de Migración a Despensa */}
              <View style={{ marginTop: 14 }}>
                <PrimaryButton
                  title={`Pasar ${boughtItems.length} comprado(s) a mi despensa`}
                  iconName="archive-outline"
                  onPress={handleMoveToInventory}
                  isLoading={isMoving}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F9FAFB' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
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
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  summaryBought: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  summaryIconCirclePending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryIconCircleBought: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  addTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 18,
    shadowColor: '#10B981',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  addTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
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
    color: '#111827',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
  },
  unitChipSelected: {
    backgroundColor: '#10B981',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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
    backgroundColor: '#F3F4F6',
  },
  categoryChipSelected: {
    backgroundColor: '#059669',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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
    color: '#111827',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
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
    borderColor: '#E5E7EB',
  },
  itemCardBought: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    opacity: 0.8,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxInnerUnchecked: {
    width: 0,
    height: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemNameBought: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 10,
  },
  itemQtyBought: {
    color: '#9CA3AF',
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
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
