import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInventory } from '../src/hooks/useInventory';
import { Ingredient, IngredientCategory, IngredientUnit } from '../src/types';
import {
  AppScreen,
  IngredientCard,
  SearchInput,
  SkeletonCard,
  EmptyState,
  ErrorState,
  PrimaryButton,
  ActionSheetModal,
} from '../src/components';
import { getExpirationStatus } from '../src/components/IngredientCard';

type CategoryFilter = 'all' | 'expiring' | IngredientCategory;

const CATEGORIES: {
  key: CategoryFilter;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'Todos' },
  { key: 'expiring', label: 'Por vencer / Vencidos', icon: 'time-outline' },
  { key: 'vegetable', label: 'Verduras' },
  { key: 'fruit', label: 'Frutas' },
  { key: 'protein', label: 'Proteínas' },
  { key: 'dairy', label: 'Lácteos' },
  { key: 'grain', label: 'Granos' },
  { key: 'legume', label: 'Legumbres' },
  { key: 'sauce', label: 'Salsas' },
  { key: 'snack', label: 'Snacks' },
  { key: 'other', label: 'Otros' },
];

const UNITS: IngredientUnit[] = [
  'units',
  'grams',
  'kilograms',
  'milliliters',
  'liters',
  'package',
  'unknown',
];

export default function InventoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ filter?: string; from?: string }>();
  const { items, status, error, reload, addItem, updateItem, deleteItem, deleteMultipleItems, consumeItem } =
    useInventory();
  const isLeavingRef = useRef(false);

  // Intercepción universal de retroceso tras escanear:
  // Redirigir a Inicio (/) cubriendo header, botón físico Android y gesto swipe-back en iOS
  useEffect(() => {
    if (params.from !== 'scan') return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isLeavingRef.current) return;
      e.preventDefault();
      isLeavingRef.current = true;
      router.replace('/');
    });

    return unsubscribe;
  }, [navigation, params.from]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(
    params.filter === 'expiring' ? 'expiring' : 'all'
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<IngredientUnit>('units');
  const [category, setCategory] = useState<IngredientCategory>('vegetable');
  const [expirationDate, setExpirationDate] = useState('');

  // Modal de confirmación compartido (BUG-08)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmDestructive?: boolean;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
  });

  const isSelectMode = selectedIds.size > 0;

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      visible: true,
      title: count === items.length ? 'Eliminar todo el inventario' : 'Eliminar seleccionados',
      description: `¿Estás seguro de eliminar estos ${count} alimentos de tu inventario? Esta acción no se puede deshacer.`,
      confirmDestructive: true,
      confirmText: `Eliminar (${count})`,
      onConfirm: async () => {
        await deleteMultipleItems(Array.from(selectedIds));
        setSelectedIds(new Set());
      },
    });
  };

  // Actualizar filtro si cambian los parámetros de ruta
  React.useEffect(() => {
    if (params.filter === 'expiring') {
      setSelectedCategory('expiring');
    }
  }, [params.filter]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesCategory = true;
      if (selectedCategory === 'expiring') {
        const s = getExpirationStatus(item.expirationDate);
        matchesCategory = s.status === 'expiringSoon' || s.status === 'expired';
      } else if (selectedCategory !== 'all') {
        matchesCategory = item.category === selectedCategory;
      }
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setQuantity('1');
    setUnit('units');
    setCategory('vegetable');
    setExpirationDate('');
    setModalVisible(true);
  };

  const openEditModal = (item: Ingredient) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity !== null ? String(item.quantity) : '');
    setUnit(item.unit);
    setCategory(item.category);
    setExpirationDate(item.expirationDate || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del alimento.');
      return;
    }

    const parsedQty = quantity.trim() ? parseFloat(quantity) : null;
    const itemData: Ingredient = {
      id: editingItem ? editingItem.id : `ing-${Date.now()}`,
      name: name.trim(),
      category,
      quantity: parsedQty !== null && !isNaN(parsedQty) ? parsedQty : null,
      unit,
      expirationDate: expirationDate.trim() || null,
      confidence: editingItem ? editingItem.confidence : null,
      source: editingItem ? editingItem.source : 'manual',
      confirmed: true,
      notes: editingItem?.notes,
    };

    try {
      if (editingItem) {
        await updateItem(itemData);
      } else {
        await addItem(itemData);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el alimento en el inventario.');
    }
  };

  const handleDelete = (id: string, itemName: string) => {
    setConfirmModal({
      visible: true,
      title: 'Eliminar alimento',
      description: `¿Estás seguro de eliminar "${itemName}" de tu inventario?`,
      confirmDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: () => deleteItem(id),
    });
  };

  const handleConsume = (id: string, itemName: string) => {
    setConfirmModal({
      visible: true,
      title: 'Consumir alimento',
      description: `¿Deseas marcar como consumido "${itemName}"?`,
      confirmDestructive: false,
      confirmText: 'Confirmar',
      onConfirm: () => consumeItem(id),
    });
  };

  return (
    <AppScreen style={styles.screen}>
      {/* ── Buscador ── */}
      <View style={styles.searchSection}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar en tu despensa o nevera..."
        />
      </View>

      {/* ── Filtros por categoría estilo Delivery ── */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.catPill,
                  isSelected && styles.catPillSelected,
                  cat.key === 'expiring' && !isSelected && styles.catPillExpiring,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${cat.label}`}
              >
                {cat.icon && (
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : '#D97706'}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={[
                    styles.catText,
                    isSelected && styles.catTextSelected,
                    cat.key === 'expiring' && !isSelected && { color: '#B45309' },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Barra de Gestión y Selección Rápida ── */}
      {status === 'success' && filteredItems.length > 0 && (
        <View style={styles.bulkToolbar}>
          <View style={styles.bulkTopRow}>
            <View style={styles.bulkInfo}>
              <Text style={styles.bulkCountText}>
                {filteredItems.length} {filteredItems.length === 1 ? 'alimento' : 'alimentos'}
              </Text>
              {isSelectMode && (
                <Text style={styles.bulkSelectedText}>
                  ({selectedIds.size} seleccionados)
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleSelectAll}
              style={styles.bulkActionBtn}
              accessibilityRole="button"
              accessibilityLabel={
                selectedIds.size === filteredItems.length
                  ? 'Deseleccionar todos los alimentos'
                  : 'Seleccionar todos los alimentos'
              }
            >
              <Ionicons
                name={
                  selectedIds.size === filteredItems.length && filteredItems.length > 0
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={16}
                color="#B94E35"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.bulkActionBtnText}>
                {selectedIds.size === filteredItems.length && filteredItems.length > 0
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Text>
            </Pressable>
          </View>

          {isSelectMode && (
            <View style={styles.bulkBottomRow}>
              <Pressable
                onPress={handleDeleteSelected}
                style={styles.bulkDeleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Eliminar alimentos seleccionados"
              >
                <Ionicons name="trash-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.bulkDeleteBtnText}>Eliminar ({selectedIds.size})</Text>
              </Pressable>

              <Pressable
                onPress={handleCancelSelection}
                style={styles.bulkCancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancelar selección"
              >
                <Text style={styles.bulkCancelBtnText}>Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ── Contenido de la lista según estados ── */}
      {status === 'loading' && (
        <View style={styles.listContainer}>
          <SkeletonCard variant="ingredient" />
          <SkeletonCard variant="ingredient" />
          <SkeletonCard variant="ingredient" />
          <SkeletonCard variant="ingredient" />
        </View>
      )}

      {status === 'error' && (
        <ErrorState
          title="No pudimos cargar tu inventario"
          message={error || 'Hubo un error de lectura local.'}
          onRetry={reload}
        />
      )}

      {status === 'success' && (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <IngredientCard
              ingredient={item}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelectItem(item.id)}
              onLongPress={() => toggleSelectItem(item.id)}
              onPress={() => (isSelectMode ? toggleSelectItem(item.id) : openEditModal(item))}
              onDelete={() => handleDelete(item.id, item.name)}
              onConsume={() => handleConsume(item.id, item.name)}
            />
          )}
          ListEmptyComponent={
            searchQuery.trim() || selectedCategory !== 'all' ? (
              <EmptyState
                title="Sin resultados"
                description={`No encontramos alimentos para "${searchQuery || selectedCategory}".`}
                actionLabel="Ver todos"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                iconName="search-outline"
              />
            ) : (
              <EmptyState
                title="Tu inventario está vacío"
                description="Escanea tu nevera con la cámara o añade alimentos manualmente para comenzar."
                actionLabel="Escanear alimentos"
                onAction={() => router.push('/scan')}
                iconName="basket-outline"
              />
            )
          }
        />
      )}

      {/* ── FAB Botón Flotante para Añadir Manual ── */}
      <Pressable
        style={styles.fab}
        onPress={openAddModal}
        accessibilityRole="button"
        accessibilityLabel="Añadir alimento manualmente"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* ── Modal de Creación / Edición ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar alimento' : 'Añadir al inventario'}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.label}>Nombre del alimento *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Tomates cherry"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInput}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Cantidad</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    style={styles.modalInput}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Unidad</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        style={[styles.smallPill, unit === u && styles.smallPillActive]}
                      >
                        <Text style={[styles.smallPillText, unit === u && styles.smallPillTextActive]}>
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.label}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                {CATEGORIES.filter((c) => c.key !== 'all' && c.key !== 'expiring').map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key as IngredientCategory)}
                    style={[styles.smallPill, category === cat.key && styles.smallPillActive]}
                  >
                    <Text style={[styles.smallPillText, category === cat.key && styles.smallPillTextActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.label}>Fecha de vencimiento (AAAA-MM-DD)</Text>
              <TextInput
                value={expirationDate}
                onChangeText={setExpirationDate}
                placeholder="2026-09-25"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInput}
              />

              <View style={{ marginTop: 24, marginBottom: 16 }}>
                <PrimaryButton
                  title={editingItem ? 'Guardar cambios' : 'Añadir alimento'}
                  onPress={handleSave}
                />
                {editingItem && (
                  <Pressable
                    style={styles.modalDeleteBtn}
                    onPress={() => {
                      setModalVisible(false);
                      handleDelete(editingItem.id, editingItem.name);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.modalDeleteText}>Eliminar este alimento</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal de Confirmación Único (BUG-08) ── */}
      <ActionSheetModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        title={confirmModal.title}
        description={confirmModal.description}
        variant="confirmation"
        confirmDestructive={confirmModal.confirmDestructive}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF9F2',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bulkToolbar: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBDDD2',
    marginBottom: 8,
    gap: 8,
  },
  bulkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EBDDD2',
  },
  bulkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B211D',
  },
  bulkSelectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B94E35',
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FBE9E2',
  },
  bulkActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#863626',
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FBE5E3',
  },
  bulkDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A93632',
  },
  bulkCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8EDE2',
  },
  bulkCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  catPillSelected: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
  },
  catPillExpiring: {
    backgroundColor: '#FFF2D7',
    borderColor: '#FDE68A',
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#66534A',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  catTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#B94E35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B94E35',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B211D',
  },
  modalBody: {
    maxHeight: 500,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B211D',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    height: 48,
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2B211D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  smallPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F8EDE2',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPillActive: {
    backgroundColor: '#B94E35',
  },
  smallPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#66534A',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
});
