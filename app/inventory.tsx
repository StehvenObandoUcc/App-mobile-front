import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
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
  ActionSheetModal,
  StaggerView,
  PantryHealthCard,
  getBottomContentPadding,
  NAV_HEIGHT,
  NAV_BOTTOM_OFFSET,
  M3DatePickerModal,
  Chip,
  AppText,
  ScreenHeader,
  M3Dialog,
  IngredientFormSheet,
  SpeedDialFab,
  SelectionHeader,
  SelectionActionBar,
} from '../src/components';
import { getExpirationStatus } from '../src/utils/expiration';
import { daysUntil } from '../src/utils/dates';
import { colors, radii, spacing, typography, CATEGORY_LIST } from '../src/theme';

type CategoryFilter = 'all' | 'expiring' | IngredientCategory;

const CATEGORIES: {
  key: CategoryFilter;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'Todos' },
  { key: 'expiring', label: 'Por vencer', icon: 'time-outline' },
  ...CATEGORY_LIST.map((c) => ({ key: c.key as CategoryFilter, label: c.label, icon: c.icon })),
];

export default function InventoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string; from?: string; add?: string }>();
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
    titleEmphasis?: string;
    description?: string;
    confirmDestructive?: boolean;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
  });

  // El modo selección es un estado propio (no depende de tener algo seleccionado):
  // así el botón «Seleccionar» puede activarlo sin preseleccionar nada.
  const [selectionModeOn, setSelectionModeOn] = useState(false);
  const isSelectMode = selectionModeOn;

  const toggleSelectItem = (id: string) => {
    setSelectionModeOn(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnterSelectMode = () => {
    setSelectionModeOn(true);
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
    setSelectionModeOn(false);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      visible: true,
      title: '¿Eliminar',
      titleEmphasis: `${count} ${count === 1 ? 'alimento' : 'alimentos'}?`,
      description: 'Se quitarán de tu despensa en este dispositivo y se sincronizará al volver la conexión.',
      confirmDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteMultipleItems(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectionModeOn(false);
      },
    });
  };

  // Actualizar filtro si cambian los parámetros de ruta
  React.useEffect(() => {
    if (params.filter === 'expiring') {
      setSelectedCategory('expiring');
    }
  }, [params.filter]);

  // «Agregar a mano» desde el Escaneo (límite de fotos / nada detectado): abre el formulario al llegar.
  React.useEffect(() => {
    if (params.add === '1') openAddModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.add]);

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
    }).sort((a, b) => {
      // Agotados («Sin stock») al final: primero lo que sí puedes usar.
      const oa = a.quantity === 0 ? 1 : 0;
      const ob = b.quantity === 0 ? 1 : 0;
      if (oa !== ob) return oa - ob;
      // «por vencimiento»: lo que vence antes arriba; sin fecha al final (Despensa.dc.html)
      const da = daysUntil(a.expirationDate);
      const db = daysUntil(b.expirationDate);
      if (da === null && db === null) return a.name.localeCompare(b.name, 'es');
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [items, searchQuery, selectedCategory]);

  // «Salud de tu despensa»: conteo por estado sobre TODO el inventario (no el filtrado).
  const pantryHealthCounts = useMemo(() => {
    const counts = { fresh: 0, expiringSoon: 0, expired: 0, unknown: 0 };
    for (const item of items) {
      const { status: s } = getExpirationStatus(item.expirationDate);
      counts[s] += 1;
    }
    return counts;
  }, [items]);

  const openAddModal = (prefillName?: string) => {
    setEditingItem(null);
    setName(prefillName || '');
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
      title: '¿Eliminar',
      titleEmphasis: `${itemName}?`,
      description: 'Se quitará de tu despensa en este dispositivo y se sincronizará al volver la conexión.',
      confirmDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: () => deleteItem(id),
    });
  };

  const handleConsume = (id: string, itemName: string) => {
    setConfirmModal({
      visible: true,
      title: '¿Marcar como',
      titleEmphasis: 'agotado?',
      description: `«${itemName}» quedará en tu despensa como «Sin stock» hasta que lo repongas o lo elimines.`,
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

  const allSelected = selectedIds.size === filteredItems.length && filteredItems.length > 0;
  const bottomBarPosition = Math.max(insets.bottom, 0) + NAV_BOTTOM_OFFSET;

  // Buscador, filtros, salud y conteo se desplazan con la lista: al bajar, los alimentos ocupan la pantalla.
  const listHeader = isSelectMode ? null : (
    <View style={styles.listHeader}>
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

          {/* ── Salud de tu despensa (Despensa.dc.html, aprobado) ── */}
          {status === 'success' && !searchQuery.trim() && selectedCategory === 'all' && (
            <View style={styles.healthCardWrapper}>
              <PantryHealthCard
                counts={pantryHealthCounts}
                onPress={() => setSelectedCategory('expiring')}
              />
            </View>
          )}

          {/* ── Barra de conteo + Seleccionar ── */}
          {status === 'success' && filteredItems.length > 0 && (
            <View style={styles.countRow}>
              <AppText variant="metadata" weight="semibold" color={colors.textSecondary}>
                {`${filteredItems.length} ${filteredItems.length === 1 ? 'alimento' : 'alimentos'} · por vencimiento`}
              </AppText>
              <Pressable
                onPress={handleEnterSelectMode}
                style={styles.selectEntryBtn}
                accessibilityRole="button"
                accessibilityLabel="Activar modo de selección"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textPrimary} />
                <AppText variant="metadata" weight="semibold">Seleccionar</AppText>
              </Pressable>
            </View>
          )}
    </View>
  );


  return (
    <AppScreen style={styles.screen}>
      {/* ── Cabecera: normal o barra contextual de selección (Despensa-Seleccion.dc.html) ── */}
      {isSelectMode ? (
        <View style={styles.selectionHeaderWrap}>
          <SelectionHeader
            count={selectedIds.size}
            allSelected={allSelected}
            onToggleAll={handleSelectAll}
            onCancel={handleCancelSelection}
          />
        </View>
      ) : (
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <ScreenHeader
              title="Mi"
              emphasis="Despensa"
              subtitle={
                items.length === 0
                  ? 'Organiza tus alimentos e ingredientes'
                  : `${items.length} alimento${items.length === 1 ? '' : 's'} guardado${items.length === 1 ? '' : 's'}`
              }
            />
          </View>
          {/* Escaneo con IA: solo desde el FAB central de la barra inferior (decisión de diseño, Etapa 2) */}
        </View>
      )}

      {/* ── Contenido de la lista según estados ── */}
      {status !== 'success' && listHeader && <View style={styles.headerOutsideList}>{listHeader}</View>}

      {status === 'loading' && (
        <View style={styles.listContainer}>
          {[1, 0.85, 0.7, 0.55, 0.4].map((o) => (
            <View key={o} style={{ opacity: o }}>
              <SkeletonCard variant="ingredient" />
            </View>
          ))}
        </View>
      )}

      {status === 'error' && (
        <ErrorState
          title="No pudimos cargar tu"
          titleEmphasis="despensa"
          message={error || 'Hubo un error de lectura local. Tus datos no se han perdido.'}
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
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <EmptyState
                title="Sin resultados para"
                titleEmphasis={`«${searchQuery.trim()}»`}
                description="Revisa la ortografía o agrégalo si acabas de comprarlo."
                iconName="search-outline"
                tone="neutral"
                actionLabel={`Agregar «${searchQuery.trim()}»`}
                actionTone="tint"
                actionIconName="add"
                onAction={() => openAddModal(searchQuery.trim())}
                secondaryActionLabel="Ver todos"
                onSecondaryAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              />
            ) : selectedCategory !== 'all' ? (
              <EmptyState
                title="Nada en esta"
                titleEmphasis="categoría"
                description="No encontramos alimentos con este filtro."
                secondaryActionLabel="Ver todos"
                onSecondaryAction={() => setSelectedCategory('all')}
                iconName="search-outline"
                tone="neutral"
              />
            ) : (
              <EmptyState
                title="Tu despensa está"
                titleEmphasis="vacía"
                description="Escanea tu nevera con la cámara o añade alimentos manualmente para comenzar."
                actionLabel="Escanear alimentos"
                actionTone="brand"
                actionIconName="scan-outline"
                onAction={() => router.push('/scan')}
                secondaryActionLabel="Agregar a mano"
                onSecondaryAction={() => openAddModal()}
                iconName="basket-outline"
              />
            )
          }
        />
      )}

      {/* ── FAB extendido «Agregar» (oculto en modo selección) ── */}
      {!isSelectMode && (
        <SpeedDialFab
          accessibilityLabel="Agregar alimento"
          style={{ right: spacing.screenGutter, bottom: bottomBarPosition + NAV_HEIGHT + 16 }}
          actions={[
            { key: 'scan', label: 'Escanear con la cámara', iconName: 'scan-outline', tone: 'brand', onPress: () => router.push('/scan') },
            { key: 'manual', label: 'Escribir a mano', iconName: 'create-outline', onPress: () => openAddModal() },
          ]}
        />
      )}

      {/* ── Barra de acciones flotante: reemplaza la navegación mientras se selecciona ── */}
      {isSelectMode && (
        <SelectionActionBar
          count={selectedIds.size}
          itemNoun="alimentos"
          onCancel={handleCancelSelection}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* ── Hoja «Añadir / Editar alimento» (Despensa-Formulario.dc.html) ── */}
      <IngredientFormSheet
        visible={modalVisible}
        mode={editingItem ? 'edit' : 'add'}
        values={{ name, quantity, unit, category, expirationDate }}
        onChange={(key, value) => {
          if (key === 'name') setName(value as string);
          else if (key === 'quantity') setQuantity(value as string);
          else if (key === 'unit') setUnit(value as IngredientUnit);
          else if (key === 'category') setCategory(value as IngredientCategory);
          else if (key === 'expirationDate') setExpirationDate(value as string);
        }}
        onSubmit={handleSave}
        onClose={() => setModalVisible(false)}
        onOpenCalendar={() => setIsDatePickerVisible(true)}
        onDelete={
          editingItem
            ? () => {
                setModalVisible(false);
                handleDelete(editingItem.id, editingItem.name);
              }
            : undefined
        }
      />

      {/* ── Modal de Confirmación Único (BUG-08) ── */}
      <ActionSheetModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        title={confirmModal.title}
        titleEmphasis={confirmModal.titleEmphasis}
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
  selectionHeaderWrap: {
    marginHorizontal: spacing.screenGutter,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
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
  // ── Barra contextual de selección (reemplaza el header) ──
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    height: 64,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.floatingNav,
    backgroundColor: colors.surface,
  },
  // ── Barra de acciones flotante de selección (sobre la nav inferior) ──
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categoriesWrapper: {
    marginBottom: spacing.sm,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  healthCardWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  countRowText: {
    fontSize: typography.sizes.metadata,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  selectEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: spacing.xs,
  },
  selectEntryBtnText: {
    fontSize: typography.sizes.metadata,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  // La cabecera de la lista ya trae su propio margen lateral: se compensa el de la lista.
  listHeader: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerOutsideList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
});
