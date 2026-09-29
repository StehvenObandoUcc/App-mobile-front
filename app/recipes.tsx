import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecipes } from '../src/hooks/useRecipes';
import { useInventory } from '../src/hooks/useInventory';
import {
  Recipe,
  RecipeSortOption,
  RecipeDifficultyFilter,
  RecipeDifficulty,
  DietaryPreference,
  RecipeFocus,
} from '../src/types';
import {
  AppScreen,
  AppText,
  RecipeCard,
  SkeletonCard,
  EmptyState,
  ErrorState,
  SearchInput,
  ActionSheetModal,
  StaggerView,
  getBottomContentPadding,
  NAV_HEIGHT,
  NAV_BOTTOM_OFFSET,
  Chip,
  M3Dialog,
  ScreenHeader,
  Fab,
  ChefIaSheet,
  ChefIaValues,
  AiProgressScreen,
  SelectionHeader,
  SelectionActionBar,
  DifficultyMeter,
} from '../src/components';
import { sortRecipes } from '../src/utils/recipe-sorter';
import { getValidTimeOptionsForFocus, checkIngredientSelectionCoherence } from '../src/utils/recipe-validation';
import { daysUntil } from '../src/utils/dates';
import { colors, spacing } from '../src/theme';

type FilterTab = 'all' | 'high_match' | 'quick' | 'saved';

// Estilos del enfoque «Personalizada y creativa» (sub-opciones del Chef IA).
const CUSTOM_STYLE_OPTIONS = [
  { key: 'Gourmet', label: 'Gourmet', iconName: 'sparkles-outline' },
  { key: 'Cena Ligera', label: 'Cena ligera', iconName: 'leaf-outline' },
  { key: 'Guiso o Sopa', label: 'Guiso o sopa', iconName: 'water-outline' },
  { key: 'Al Horno', label: 'Al horno', iconName: 'flame-outline' },
  { key: 'Dulce o Postre', label: 'Dulce o postre', iconName: 'cafe-outline' },
] as const;

const SORT_OPTIONS: { key: RecipeSortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'createdAt_desc', label: 'Más recientes', icon: 'time-outline' },
  { key: 'matchScore_desc', label: 'Mayor coincidencia', icon: 'sparkles-outline' },
  { key: 'prepTime_asc', label: 'Más rápidas', icon: 'flash-outline' },
  { key: 'difficulty_asc', label: 'Menor dificultad', icon: 'trending-down-outline' },
];

const DIFFICULTY_FILTERS: { key: RecipeDifficultyFilter; label: string }[] = [
  { key: 'all', label: 'Cualquier dificultad' },
  { key: 'easy', label: 'Fácil' },
  { key: 'medium', label: 'Media' },
  { key: 'hard', label: 'Difícil' },
];

const DEFAULT_CHEF: Omit<ChefIaValues, 'ingredientIds'> = {
  focus: 'waste_reduction',
  diet: 'any',
  difficulty: 'easy',
  time: 20,
  count: 2,
  styleTag: null,
  note: '',
};

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  // El Chef IA solo cocina con lo que hay: los agotados («Sin stock», cantidad 0) no se ofrecen.
  const stocked = useMemo(() => items.filter((i) => i.quantity !== 0), [items]);
  const { recipes, status, error, reload, toggleSave, deleteRecipe, deleteRecipes, generateWithAi } = useRecipes();

  // ── Lista: búsqueda, filtros y orden ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<RecipeSortOption>('createdAt_desc');
  const [difficultyFilter, setDifficultyFilter] = useState<RecipeDifficultyFilter>('all');
  const [picker, setPicker] = useState<'sort' | 'difficulty' | null>(null);

  // ── Chef IA ──
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [chef, setChef] = useState<ChefIaValues>({ ...DEFAULT_CHEF, ingredientIds: new Set() });
  const [isGenerating, setIsGenerating] = useState(false);
  const cancelledRef = useRef(false);

  // ── Selección múltiple ──
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    titleEmphasis?: string;
    description?: string;
    confirmDestructive?: boolean;
    confirmText?: string;
    onConfirm?: () => void;
  }>({ visible: false, title: '' });

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    iconName?: keyof typeof Ionicons.glyphMap;
    confirmText?: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', type: 'info', confirmText: 'Entendido', onConfirm: () => {} });

  const closeDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  // Al abrir el Chef IA: los que vencen pronto (≤ 3 días o vencidos) ya vienen marcados.
  // Si nada vence pronto, se marcan todos para poder generar de inmediato.
  const handleOpenAiModal = () => {
    const urgent = stocked.filter((i) => {
      const d = daysUntil(i.expirationDate);
      return d !== null && d <= 3;
    });
    const initial = urgent.length > 0 ? urgent : stocked;
    setChef((prev) => ({ ...prev, ingredientIds: new Set(initial.map((i) => i.id)), styleTag: null, note: '' }));
    setIsAiModalOpen(true);
  };

  const setChefValue = <K extends keyof ChefIaValues>(key: K, value: ChefIaValues[K]) =>
    setChef((prev) => ({ ...prev, [key]: value }));

  const toggleIngredient = (id: string) =>
    setChef((prev) => {
      const next = new Set(prev.ingredientIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, ingredientIds: next };
    });

  const chosenIngredients = useMemo(() => stocked.filter((i) => chef.ingredientIds.has(i.id)), [stocked, chef.ingredientIds]);
  const coherence = useMemo(() => checkIngredientSelectionCoherence(chosenIngredients), [chosenIngredients]);
  const validTimes = useMemo(() => getValidTimeOptionsForFocus(chef.focus, chef.difficulty), [chef.focus, chef.difficulty]);

  // El tiempo elegido siempre debe ser válido para el enfoque y la dificultad.
  React.useEffect(() => {
    if (!validTimes.includes(chef.time)) setChefValue('time', validTimes[0]);
  }, [validTimes, chef.time]);

  const timeHint =
    chef.focus === 'quick'
      ? 'En modo Express el máximo es 20 min'
      : chef.difficulty === 'hard'
        ? 'Las recetas difíciles necesitan al menos 30 min'
        : null;

  const handleGenerate = async () => {
    if (stocked.length === 0) {
      setIsAiModalOpen(false);
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: 'Despensa vacía',
          message: 'Añade al menos un alimento a tu despensa para que el Chef IA pueda crear recetas con lo que tienes.',
          type: 'warning',
          iconName: 'basket-outline',
          confirmText: 'Entendido',
          onConfirm: closeDialog,
        });
      }, 300);
      return;
    }
    if (chosenIngredients.length === 0) {
      setDialogConfig({
        visible: true,
        title: 'Elige tus ingredientes',
        message: 'Selecciona al menos un alimento de tu despensa para crear recetas.',
        type: 'warning',
        confirmText: 'Entendido',
        onConfirm: closeDialog,
      });
      return;
    }

    cancelledRef.current = false;
    setIsGenerating(true);
    try {
      let effectiveFocus: string = chef.focus;
      if (chef.focus === 'custom') {
        const parts = [chef.styleTag, chef.note.trim()].filter(Boolean);
        effectiveFocus = parts.length > 0 ? `custom: ${parts.join(', ')}` : 'custom';
      }
      const generated = await generateWithAi(
        chosenIngredients,
        chef.time,
        effectiveFocus,
        chef.count,
        chef.difficulty,
        chef.diet
      );
      if (cancelledRef.current) return; // el usuario dejó de esperar: las recetas igual quedan guardadas
      const n = generated.length;
      setIsAiModalOpen(false);
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: `¡${n} ${n === 1 ? 'receta' : 'recetas'}`,
          titleEmphasis: 'listas!',
          message: `El Chef IA creó ${n === 1 ? 'una receta' : `${n} recetas`} con tus ingredientes.`,
          type: 'success',
          iconName: 'sparkles',
          confirmText: 'Ver recetas',
          onConfirm: closeDialog,
        } as typeof dialogConfig);
      }, 350);
    } catch (err: any) {
      if (cancelledRef.current) return;
      setIsAiModalOpen(false);
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: 'No se pudieron generar',
          titleEmphasis: 'recetas',
          message: err?.message || 'Ocurrió un error al comunicarse con el Chef IA. Intenta de nuevo más tarde.',
          type: 'error',
          confirmText: 'Entendido',
          onConfirm: closeDialog,
        } as typeof dialogConfig);
      }, 350);
    } finally {
      setIsGenerating(false);
    }
  };

  const progressSteps = useMemo(
    () => [
      `Revisé tus ${chosenIngredients.length} ${chosenIngredients.length === 1 ? 'ingrediente' : 'ingredientes'}`,
      chef.focus === 'waste_reduction'
        ? 'Prioricé lo que vence pronto'
        : chef.focus === 'quick'
          ? `Ajusté todo a ${chef.time} min o menos`
          : 'Busqué combinaciones creativas',
      `Escribiendo ${chef.count} ${chef.count === 1 ? 'receta' : 'recetas'}…`,
    ],
    [chosenIngredients.length, chef.focus, chef.time, chef.count]
  );

  // ── Selección ──
  const toggleSelectRecipe = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLongPress = (recipe: Recipe) => {
    setIsSelectMode(true);
    setSelectedIds((prev) => new Set(prev).add(recipe.id));
  };

  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      visible: true,
      title: '¿Eliminar',
      titleEmphasis: `${count} ${count === 1 ? 'receta' : 'recetas'}?`,
      description: 'Se quitarán de tu colección. Esta acción no se puede deshacer.',
      confirmDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteRecipes(Array.from(selectedIds));
        handleCancelSelection();
      },
    });
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setConfirmModal({
      visible: true,
      title: '¿Eliminar esta',
      titleEmphasis: 'receta?',
      description: `«${recipe.title}» se quitará de tu colección.`,
      confirmDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteRecipe(recipe.id);
      },
    });
  };

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = recipes.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      if (activeTab === 'high_match' && r.matchScore < 80) return false;
      if (activeTab === 'quick' && (r.prepTimeMinutes || 99) > 20) return false;
      if (activeTab === 'saved' && !r.isSaved) return false;
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) return false;
      return true;
    });
    return sortRecipes(matched, sortBy);
  }, [recipes, searchQuery, activeTab, difficultyFilter, sortBy]);

  const allSelected = selectedIds.size === filteredRecipes.length && filteredRecipes.length > 0;
  const handleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(filteredRecipes.map((r) => r.id)));

  const readyCount = recipes.filter((r) => r.missingIngredients.length === 0).length;
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Más recientes';
  const diffFilter = DIFFICULTY_FILTERS.find((d) => d.key === difficultyFilter)!;
  const diffTone = difficultyFilter === 'all' ? null : colors.difficulty[difficultyFilter];

  const renderRecipeItem = useCallback(
    ({ item, index }: { item: Recipe; index: number }) => (
      <StaggerView index={Math.min(index, 8)}>
        <RecipeCard
          recipe={item}
          onPress={() => router.push({ pathname: '/recipe-detail', params: { recipeId: item.id } })}
          onSave={() => toggleSave(item.id)}
          onDelete={() => handleDeleteRecipe(item)}
          onLongPress={() => handleLongPress(item)}
          isSelectMode={isSelectMode}
          isSelected={selectedIds.has(item.id)}
          onToggleSelect={() => toggleSelectRecipe(item.id)}
        />
      </StaggerView>
    ),
    [router, toggleSave, isSelectMode, selectedIds]
  );

  const listHeader = (
    <View style={styles.header}>
      {isSelectMode ? (
        <SelectionHeader
          count={selectedIds.size}
          allSelected={allSelected}
          onToggleAll={handleSelectAll}
          onCancel={handleCancelSelection}
          noun="f"
        />
      ) : (
        <>
          <ScreenHeader
            title="Mis"
            emphasis="Recetas"
            subtitle={
              recipes.length === 0
                ? 'Inspiración según lo que hay en tu despensa'
                : `${recipes.length} ${recipes.length === 1 ? 'receta' : 'recetas'} · ${readyCount} ${readyCount === 1 ? 'lista' : 'listas'} para cocinar hoy`
            }
          />

          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar recetas o ingredientes…"
            accessibilityLabel="Buscar recetas"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
          >
            <Chip label="Todas" variant="filter" selected={activeTab === 'all'} onPress={() => setActiveTab('all')} />
            <Chip label="Mayor coincidencia" variant="filter" selected={activeTab === 'high_match'} onPress={() => setActiveTab('high_match')} />
            <Chip label="Rápidas ≤ 20 min" variant="filter" selected={activeTab === 'quick'} onPress={() => setActiveTab('quick')} />
            <Chip label="Guardadas" variant="filter" selected={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
          </ScrollView>

          <View style={styles.tools}>
            <Pressable
              onPress={() => setPicker('sort')}
              style={styles.tool}
              accessibilityRole="button"
              accessibilityLabel={`Ordenar: ${sortLabel}`}
            >
              <Ionicons name="swap-vertical" size={18} color={colors.textPrimary} />
              <AppText variant="bodySmall" weight="semibold">{sortLabel}</AppText>
            </Pressable>
            <Pressable
              onPress={() => setPicker('difficulty')}
              style={styles.tool}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por dificultad: ${diffFilter.label}`}
            >
              <DifficultyMeter
                level={diffTone ? diffTone.level : 2}
                segment={diffTone ? diffTone.segment : colors.borderStrong}
                empty={colors.m3.surfaceContainerHighest}
              />
              <AppText variant="bodySmall" weight="semibold">{diffFilter.label}</AppText>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  return (
    <AppScreen style={styles.screen}>
      {status === 'loading' && (
        <View style={styles.list}>
          {listHeader}
          <SkeletonCard variant="recipe" />
          <View style={{ opacity: 0.6 }}>
            <SkeletonCard variant="recipe" />
          </View>
        </View>
      )}

      {status === 'error' && (
        <ErrorState
          title="No pudimos"
          titleEmphasis="cargar tus recetas"
          message={error || 'Tu despensa sigue disponible sin conexión. Reintenta cuando vuelva la red.'}
          onRetry={reload}
        />
      )}

      {status === 'success' && (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: getBottomContentPadding(insets.bottom) + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listHeader}
          renderItem={renderRecipeItem}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            recipes.length === 0 ? (
              <EmptyState
                title="Aún no tienes"
                titleEmphasis="recetas"
                description="Genera tus primeras recetas con el Chef IA a partir de lo que hay en tu despensa."
                iconName="restaurant-outline"
                tone="ai"
                actionLabel="Generar con IA"
                actionTone="ai"
                actionIconName="sparkles"
                onAction={handleOpenAiModal}
              />
            ) : (
              <EmptyState
                title={activeTab === 'saved' ? 'Aún no guardas' : 'Sin recetas que'}
                titleEmphasis={activeTab === 'saved' ? 'recetas' : 'coincidan'}
                description={
                  activeTab === 'saved'
                    ? 'Toca el corazón de una receta para guardarla aquí.'
                    : 'Prueba otra búsqueda o cambia el filtro.'
                }
                iconName={activeTab === 'saved' ? 'heart-outline' : 'search-outline'}
                tone="neutral"
                secondaryActionLabel="Ver todas"
                onSecondaryAction={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                  setDifficultyFilter('all');
                }}
              />
            )
          }
        />
      )}

      {/* ── FAB «Generar con IA»: solo el icono; el Chef IA se despliega al tocarlo ── */}
      {!isSelectMode && status === 'success' && (
        <Fab
          iconName="sparkles"
          tone="ai"
          accessibilityLabel="Generar recetas con el Chef IA"
          onPress={handleOpenAiModal}
          style={{
            right: spacing.screenGutter,
            bottom: Math.max(insets.bottom, 0) + NAV_BOTTOM_OFFSET + NAV_HEIGHT + 16,
          }}
        />
      )}

      {isSelectMode && (
        <SelectionActionBar
          count={selectedIds.size}
          itemNoun="recetas"
          onCancel={handleCancelSelection}
          onDelete={handleDeleteSelected}
        />
      )}

      <ChefIaSheet
        visible={isAiModalOpen}
        isGenerating={isGenerating}
        ingredients={stocked}
        values={chef}
        onChange={setChefValue}
        onToggleIngredient={toggleIngredient}
        onSelectAll={() => setChefValue('ingredientIds', new Set(stocked.map((i) => i.id)))}
        onClearAll={() => setChefValue('ingredientIds', new Set())}
        validTimes={validTimes}
        timeHint={timeHint}
        coherence={
          chef.ingredientIds.size === 1 ? { message: coherence.message, isWarning: coherence.isCondimentOnly } : null
        }
        styleOptions={CUSTOM_STYLE_OPTIONS}
        onGenerate={handleGenerate}
        onClose={() => setIsAiModalOpen(false)}
      />

      <AiProgressScreen
        visible={isGenerating}
        title="El Chef está"
        emphasis="cocinando ideas"
        steps={progressSteps}
        onCancel={() => {
          cancelledRef.current = true;
          setIsGenerating(false);
        }}
        cancelLabel="Dejar de esperar"
      />

      {/* ── Ordenar / Dificultad ── */}
      <ActionSheetModal
        visible={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === 'sort' ? 'Ordenar recetas' : 'Filtrar por dificultad'}
        variant="action_sheet"
        actions={
          picker === 'sort'
            ? SORT_OPTIONS.map((o) => ({
                label: o.key === sortBy ? `${o.label}  ✓` : o.label,
                icon: o.icon,
                onPress: () => setSortBy(o.key),
              }))
            : DIFFICULTY_FILTERS.map((d) => ({
                label: d.key === difficultyFilter ? `${d.label}  ✓` : d.label,
                icon: d.key === 'all' ? 'apps-outline' : 'speedometer-outline',
                onPress: () => setDifficultyFilter(d.key),
              }))
        }
      />

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

      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        titleEmphasis={(dialogConfig as { titleEmphasis?: string }).titleEmphasis}
        message={dialogConfig.message}
        type={dialogConfig.type}
        iconName={dialogConfig.iconName}
        confirmText={dialogConfig.confirmText}
        onConfirm={dialogConfig.onConfirm}
      />
    </AppScreen>
  );
}

// Recetas.dc.html: margen 20, 16 entre bloques del encabezado, 14 entre tarjetas.
const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipsScroll: {
    marginRight: -spacing.screenGutter,
    marginTop: -spacing.sm,
    marginBottom: -spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.screenGutter,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tool: {
    height: spacing.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
});
