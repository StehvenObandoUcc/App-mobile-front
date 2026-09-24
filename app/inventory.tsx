import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  StaggerView,
  getBottomContentPadding,
  M3Dialog,
  M3DatePickerModal,
  Chip,
} from '../src/components';
import { getExpirationStatus } from '../src/utils/expiration';
import { colors, radii, spacing, typography } from '../src/theme';

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
  const insets = useSafeAreaInsets();
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
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setDialogConfig({
        visible: true,
        title: 'Campo requerido',
        message: 'Por favor ingresa el nombre del alimento.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (trimmedName.length > 60) {
      setDialogConfig({
        visible: true,
        title: 'Nombre muy largo',
        message: 'El nombre del alimento no puede superar los 60 caracteres.',
        type: 'warning',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    let parsedQty: number | null = null;
    if (quantity.trim()) {
      const q = parseFloat(quantity.trim());
      if (isNaN(q) || q <= 0) {
        setDialogConfig({
          visible: true,
          title: 'Cantidad inválida',
          message: 'La cantidad debe ser un número positivo mayor que cero.',
          type: 'warning',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      if (q > 99999) {
        setDialogConfig({
          visible: true,
          title: 'Cantidad excedida',
          message: 'La cantidad no puede superar 99,999.',
          type: 'warning',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      parsedQty = q;
    }

    if (expirationDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate.trim())) {
        setDialogConfig({
          visible: true,
          title: 'Formato de fecha inválido',
          message: 'Por favor usa el selector de fecha para elegir un día válido.',
          type: 'warning',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const [y] = expirationDate.trim().split('-').map(Number);
      if (y < 2024 || y > 2099) {
        setDialogConfig({
          visible: true,
          title: 'Año fuera de rango',
          message: 'El año de vencimiento debe estar entre 2024 y 2099.',
          type: 'warning',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
    }

    const itemData: Ingredient = {
      id: editingItem ? editingItem.id : `ing-${Date.now()}`,
      name: trimmedName,
      category,
      quantity: parsedQty,
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
      setDialogConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo guardar el alimento en el inventario.',
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
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

  const renderIngredientItem = useCallback(
    ({ item, index }: { item: Ingredient; index: number }) => (
      <StaggerView index={Math.min(index, 8)}>
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
      </StaggerView>
    ),
    [isSelectMode, selectedIds, toggleSelectItem, openEditModal, handleDelete, handleConsume]
  );

  return (
    <AppScreen style={styles.screen}>
      {/* ── Cabecera Editorial Despensa ── */}
      <View style={styles.headerSection}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Mi Despensa</Text>
          <Text style={styles.screenSubtitle}>
            {items.length === 0
              ? 'Organiza tus alimentos e ingredientes'
              : `${items.length} alimento${items.length === 1 ? '' : 's'} guardado${items.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.scanHeaderBtn, pressed && styles.scanHeaderBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Escanear con cámara"
          accessibilityHint="Abre la cámara para detectar alimentos automáticamente"
        >
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

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
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.key}
              label={cat.label}
              icon={cat.icon}
              selected={selectedCategory === cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              variant="filter"
            />
          ))}
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
                color={colors.primary}
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
                <Ionicons name="trash-outline" size={15} color={colors.error.text} style={{ marginRight: spacing.xs }} />
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
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(100, getBottomContentPadding(insets.bottom)) },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={renderIngredientItem}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
        <Ionicons name="add" size={28} color={colors.surface} />
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
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.label}>Nombre del alimento * (máx 60 caracteres)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Tomates cherry"
                placeholderTextColor={colors.textMuted}
                maxLength={60}
                style={styles.modalInput}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Cantidad (positiva)</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={(val) => setQuantity(val.replace(/[^0-9.]/g, ''))}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                    maxLength={8}
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

              <Text style={styles.label}>Fecha de vencimiento</Text>
              <Pressable
                onPress={() => setIsDatePickerVisible(true)}
                style={[styles.modalInput, { justifyContent: 'center' }]}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha de vencimiento en el calendario"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      color: expirationDate ? colors.textPrimary : colors.textMuted,
                      fontSize: typography.sizes.body,
                      fontWeight: expirationDate ? '600' : '400',
                    }}
                  >
                    {expirationDate || 'Seleccionar en el calendario'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
              </Pressable>

              <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg }}>
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
                    <Ionicons name="trash-outline" size={16} color={colors.error.text} style={{ marginRight: 6 }} />
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

      {/* ── Mini Calendario M3 ── */}
      <M3DatePickerModal
        visible={isDatePickerVisible}
        value={expirationDate}
        onChange={setExpirationDate}
        onClose={() => setIsDatePickerVisible(false)}
      />

      {/* ── Diálogo Emergente M3 ── */}
      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
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
  scanHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHeaderBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  bulkToolbar: {
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    marginBottom: 6,
    gap: spacing.sm,
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
    gap: spacing.sm,
    paddingTop: 6,
  },
  bulkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkCountText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bulkSelectedText: {
    fontSize: typography.sizes.label,
    fontWeight: '600',
    color: colors.primary,
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.circular,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkActionBtnText: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.circular,
    backgroundColor: colors.error.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkDeleteBtnText: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.error.text,
  },
  bulkCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
  },
  bulkCancelBtnText: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: radii.circular,
    backgroundColor: colors.error.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalDeleteText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.error.text,
  },
  categoriesWrapper: {
    marginBottom: spacing.sm,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 58,
    height: 58,
    borderRadius: radii.circular,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    maxHeight: 500,
  },
  label: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    height: 52,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.buttons,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  smallPill: {
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPillActive: {
    backgroundColor: colors.primary,
  },
  smallPillText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 18,
  },
  smallPillTextActive: {
    color: colors.textInverse,
  },
});
