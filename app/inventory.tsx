import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
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
  SecondaryButton,
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
import { radii, spacing, CATEGORY_LIST } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

type CategoryFilter = 'all' | 'expiring' | IngredientCategory;

type CategoryChip = {
  key: CategoryFilter;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string; from?: string; add?: string }>();
  const { items, status, error, reload, addItem, updateItem, deleteItem, deleteMultipleItems, consumeItem } =
    useInventory();
  const isLeavingRef = useRef(false);
  const categories: CategoryChip[] = [
    { key: 'all', label: t('screensMain.inventory.all') },
    { key: 'expiring', label: t('screensMain.inventory.expiring'), icon: 'time-outline' },
    ...CATEGORY_LIST.map((c) => ({
      key: c.key as CategoryFilter,
      label: t(`screensMain.inventory.categories.${c.key}`),
      icon: c.icon,
    })),
  ];

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
    type?: 'neutral' | 'ai' | 'success' | 'warning' | 'error';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'neutral',
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
      title: t('screensMain.shared.deleteTitle'),
      titleEmphasis: t('screensMain.shared.countEmphasis', { count, noun: tp('screensMain.shared.food', count) }),
      description: t('screensMain.inventory.deleteManyDesc'),
      confirmDestructive: true,
      confirmText: t('common.delete'),
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
        title: t('screensMain.inventory.requiredTitle'),
        message: t('screensMain.inventory.requiredMessage'),
        type: 'neutral',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (trimmedName.length > 60) {
      setDialogConfig({
        visible: true,
        title: t('screensMain.inventory.tooLongTitle'),
        message: t('screensMain.inventory.tooLongMessage'),
        type: 'neutral',
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
          title: t('screensMain.inventory.invalidQtyTitle'),
          message: t('screensMain.inventory.invalidQtyMessage'),
          type: 'neutral',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      if (q > 99999) {
        setDialogConfig({
          visible: true,
          title: t('screensMain.inventory.tooBigQtyTitle'),
          message: t('screensMain.inventory.tooBigQtyMessage'),
          type: 'neutral',
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
          title: t('screensMain.inventory.invalidDateTitle'),
          message: t('screensMain.inventory.invalidDateMessage'),
          type: 'neutral',
          onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        });
        return;
      }
      const [y] = expirationDate.trim().split('-').map(Number);
      if (y < 2024 || y > 2099) {
        setDialogConfig({
          visible: true,
          title: t('screensMain.inventory.yearRangeTitle'),
          message: t('screensMain.inventory.yearRangeMessage'),
          type: 'neutral',
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
        title: t('screensMain.inventory.errorTitle'),
        message: t('screensMain.inventory.saveErrorMessage'),
        type: 'error',
        onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleDelete = (id: string, itemName: string) => {
    setConfirmModal({
      visible: true,
      title: t('screensMain.shared.deleteTitle'),
      titleEmphasis: t('screensMain.inventory.itemEmphasis', { name: itemName }),
      description: t('screensMain.inventory.deleteOneDesc'),
      confirmDestructive: true,
      confirmText: t('common.delete'),
      onConfirm: () => deleteItem(id),
    });
  };

  const handleConsume = (id: string, itemName: string) => {
    setConfirmModal({
      visible: true,
      title: t('screensMain.inventory.consumeTitle'),
      titleEmphasis: t('screensMain.inventory.consumeEmphasis'),
      description: t('screensMain.inventory.consumeDesc', { name: itemName }),
      confirmDestructive: false,
      confirmText: t('screensMain.inventory.consumeConfirm'),
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
              placeholder={t('screensMain.inventory.searchPlaceholder')}
            />
          </View>

          {/* ── Filtros por categoría estilo Delivery ── */}
          <View style={styles.categoriesWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {categories.map((cat) => (
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
                {t('screensMain.inventory.countLine', { count: filteredItems.length, noun: tp('screensMain.shared.food', filteredItems.length) })}
              </AppText>
              <SecondaryButton
                title={t('screensMain.inventory.select')}
                variant="text"
                iconName="checkmark-circle-outline"
                onPress={handleEnterSelectMode}
                accessibilityLabel={t('screensMain.inventory.selectEntryA11y')}
                style={styles.selectEntryBtn}
              />
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
              title={t('screensMain.inventory.title')}
              emphasis={t('screensMain.inventory.emphasis')}
              subtitle={
                items.length === 0
                  ? t('screensMain.inventory.subtitleEmpty')
                  : tp('screensMain.inventory.savedCount', items.length)
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
          title={t('screensMain.inventory.loadErrorTitle')}
          titleEmphasis={t('screensMain.inventory.loadErrorEmphasis')}
          message={error || t('screensMain.inventory.loadErrorFallback')}
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
                title={t('screensMain.inventory.noResultsTitle')}
                titleEmphasis={t('screensMain.inventory.noResultsEmphasis', { query: searchQuery.trim() })}
                description={t('screensMain.inventory.noResultsDesc')}
                iconName="search-outline"
                tone="neutral"
                actionLabel={t('screensMain.inventory.addQuery', { query: searchQuery.trim() })}
                actionTone="tint"
                actionIconName="add"
                onAction={() => openAddModal(searchQuery.trim())}
                secondaryActionLabel={t('screensMain.shared.seeAll')}
                onSecondaryAction={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              />
            ) : selectedCategory !== 'all' ? (
              <EmptyState
                title={t('screensMain.inventory.emptyCategoryTitle')}
                titleEmphasis={t('screensMain.inventory.emptyCategoryEmphasis')}
                description={t('screensMain.inventory.emptyCategoryDesc')}
                secondaryActionLabel={t('screensMain.shared.seeAll')}
                onSecondaryAction={() => setSelectedCategory('all')}
                iconName="search-outline"
                tone="neutral"
              />
            ) : (
              <EmptyState
                title={t('screensMain.inventory.emptyPantryTitle')}
                titleEmphasis={t('screensMain.inventory.emptyPantryEmphasis')}
                description={t('screensMain.inventory.emptyPantryDesc')}
                actionLabel={t('screensMain.inventory.scanFood')}
                actionTone="brand"
                actionIconName="scan-outline"
                onAction={() => router.push('/scan')}
                secondaryActionLabel={t('screensMain.inventory.addByHand')}
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
          accessibilityLabel={t('screensMain.inventory.addA11y')}
          style={{ right: spacing.screenGutter, bottom: bottomBarPosition + NAV_HEIGHT + 16 }}
          actions={[
            { key: 'scan', label: t('screensMain.inventory.scanWithCamera'), iconName: 'scan-outline', tone: 'brand', onPress: () => router.push('/scan') },
            { key: 'manual', label: t('screensMain.inventory.writeByHand'), iconName: 'create-outline', onPress: () => openAddModal() },
          ]}
        />
      )}

      {/* ── Barra de acciones flotante: reemplaza la navegación mientras se selecciona ── */}
      {isSelectMode && (
        <SelectionActionBar
          count={selectedIds.size}
          itemNoun={t('screensMain.inventory.itemNoun')}
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

const useStyles = makeStyles((colors) => ({
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
  selectEntryBtn: {
    paddingHorizontal: spacing.sm,
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
}));
