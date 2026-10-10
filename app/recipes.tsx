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
  OfflineBanner,
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
import { loadAppSettings } from '../src/storage/app-settings';
import { isServerReachable } from '../src/services/api-client';
import { isNetworkErrorMessage } from '../src/utils/error-messages';
import { useOutboxStatus } from '../src/hooks/useOutboxStatus';
import { spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

type FilterTab = 'all' | 'high_match' | 'quick' | 'saved';

// Estilos del enfoque «Personalizada y creativa» (sub-opciones del Chef IA).
const CUSTOM_STYLE_OPTIONS = [
  { key: 'Gourmet', labelKey: 'screensMain.recipes.style.gourmet', iconName: 'sparkles-outline' },
  { key: 'Cena Ligera', labelKey: 'screensMain.recipes.style.lightDinner', iconName: 'leaf-outline' },
  { key: 'Guiso o Sopa', labelKey: 'screensMain.recipes.style.stew', iconName: 'water-outline' },
  { key: 'Al Horno', labelKey: 'screensMain.recipes.style.baked', iconName: 'flame-outline' },
  { key: 'Dulce o Postre', labelKey: 'screensMain.recipes.style.dessert', iconName: 'cafe-outline' },
] as const;

const SORT_OPTIONS: { key: RecipeSortOption; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'createdAt_desc', labelKey: 'screensMain.recipes.sort.recent', icon: 'time-outline' },
  { key: 'matchScore_desc', labelKey: 'screensMain.recipes.sort.match', icon: 'sparkles-outline' },
  { key: 'prepTime_asc', labelKey: 'screensMain.recipes.sort.quick', icon: 'flash-outline' },
  { key: 'difficulty_asc', labelKey: 'screensMain.recipes.sort.easiest', icon: 'trending-down-outline' },
];

const DIFFICULTY_FILTERS: { key: RecipeDifficultyFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'screensMain.recipes.difficultyFilter.any' },
  { key: 'easy', labelKey: 'screensMain.recipes.difficultyFilter.easy' },
  { key: 'medium', labelKey: 'screensMain.recipes.difficultyFilter.medium' },
  { key: 'hard', labelKey: 'screensMain.recipes.difficultyFilter.hard' },
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
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  // El Chef IA solo cocina con lo que hay: los agotados («Sin stock», cantidad 0) no se ofrecen.
  const stocked = useMemo(() => items.filter((i) => i.quantity !== 0), [items]);
  const { recipes, status, error, reload, toggleSave, deleteRecipe, deleteRecipes, generateWithAi } = useRecipes();

  // ── Lista: búsqueda, filtros y orden ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  // Recetas-Estados · B: el Chef IA necesita red (lo guardado sigue disponible sin internet).
  const [aiOffline, setAiOffline] = useState(false);
  const outbox = useOutboxStatus();
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
  }>({ visible: false, title: '', message: '', type: 'info', confirmText: t('common.gotIt'), onConfirm: () => {} });

  const closeDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  // Al abrir el Chef IA: los que vencen pronto (≤ 3 días o vencidos) ya vienen marcados.
  // Si nada vence pronto, se marcan todos para poder generar de inmediato.
  const handleOpenAiModal = async () => {
    const urgent = stocked.filter((i) => {
      const d = daysUntil(i.expirationDate);
      return d !== null && d <= 3;
    });
    const initial = urgent.length > 0 ? urgent : stocked;
    // Dieta por defecto de Configuración (se lee antes de abrir para no pisar lo que el usuario cambie).
    const prefs = await loadAppSettings().catch(() => null);
    setChef((prev) => ({
      ...prev,
      ingredientIds: new Set(initial.map((i) => i.id)),
      styleTag: null,
      note: '',
      diet: prefs?.defaultDiet ?? prev.diet,
    }));
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
      ? t('screensMain.recipes.timeHintExpress')
      : chef.difficulty === 'hard'
        ? t('screensMain.recipes.timeHintHard')
        : null;

  const handleGenerate = async () => {
    if (stocked.length === 0) {
      setIsAiModalOpen(false);
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: t('screensMain.recipes.emptyPantryTitle'),
          message: t('screensMain.recipes.emptyPantryMessage'),
          type: 'warning',
          iconName: 'basket-outline',
          confirmText: t('common.gotIt'),
          onConfirm: closeDialog,
        });
      }, 300);
      return;
    }
    if (chosenIngredients.length === 0) {
      setDialogConfig({
        visible: true,
        title: t('screensMain.recipes.pickTitle'),
        message: t('screensMain.recipes.pickMessage'),
        type: 'warning',
        confirmText: t('common.gotIt'),
        onConfirm: closeDialog,
      });
      return;
    }

    cancelledRef.current = false;
    setIsGenerating(true);
    if (!(await isServerReachable())) {
      setIsGenerating(false);
      setIsAiModalOpen(false);
      setAiOffline(true);
      return;
    }
    try {
      let effectiveFocus: string = chef.focus;
      if (chef.focus === 'custom') {
        const parts = [chef.styleTag, chef.note.trim()].filter(Boolean);
        effectiveFocus = parts.length > 0 ? `custom: ${parts.join(', ')}` : 'custom';
      }
      const prefs = await loadAppSettings();
      const generated = await generateWithAi(
        chosenIngredients,
        chef.time,
        effectiveFocus,
        chef.count,
        chef.difficulty,
        chef.diet,
        { servings: prefs.defaultServings, avoid: prefs.avoidIngredients }
      );
      if (cancelledRef.current) return; // el usuario dejó de esperar: las recetas igual quedan guardadas
      const n = generated.length;
      setIsAiModalOpen(false);
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: t('screensMain.recipes.readyTitle', { count: n, noun: tp('screensMain.shared.recipe', n) }),
          titleEmphasis: t('screensMain.recipes.readyEmphasis'),
          message: tp('screensMain.recipes.readyMessage', n),
          type: 'success',
          iconName: 'sparkles',
          confirmText: t('screensMain.recipes.viewRecipes'),
          onConfirm: closeDialog,
        } as typeof dialogConfig);
      }, 350);
    } catch (err: any) {
      if (cancelledRef.current) return;
      setIsAiModalOpen(false);
      if (isNetworkErrorMessage(err?.message)) {
        setAiOffline(true);
        return;
      }
      setTimeout(() => {
        setDialogConfig({
          visible: true,
          title: t('screensMain.recipes.genErrorTitle'),
          titleEmphasis: t('screensMain.recipes.genErrorEmphasis'),
          message: err?.message || t('screensMain.recipes.genErrorFallback'),
          type: 'error',
          confirmText: t('common.gotIt'),
          onConfirm: closeDialog,
        } as typeof dialogConfig);
      }, 350);
    } finally {
      setIsGenerating(false);
    }
  };

  const progressSteps = useMemo(
    () => [
      t('screensMain.recipes.step1', { count: chosenIngredients.length, noun: tp('screensMain.shared.ingredient', chosenIngredients.length) }),
      chef.focus === 'waste_reduction'
        ? t('screensMain.recipes.step2Waste')
        : chef.focus === 'quick'
          ? t('screensMain.recipes.step2Quick', { minutes: chef.time })
          : t('screensMain.recipes.step2Custom'),
      t('screensMain.recipes.step3', { count: chef.count, noun: tp('screensMain.shared.recipe', chef.count) }),
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
      title: t('screensMain.shared.deleteTitle'),
      titleEmphasis: t('screensMain.shared.countEmphasis', { count, noun: tp('screensMain.shared.recipe', count) }),
      description: t('screensMain.recipes.deleteManyDesc'),
      confirmDestructive: true,
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteRecipes(Array.from(selectedIds));
        handleCancelSelection();
      },
    });
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setConfirmModal({
      visible: true,
      title: t('screensMain.recipes.deleteOneTitle'),
      titleEmphasis: t('screensMain.recipes.deleteOneEmphasis'),
      description: t('screensMain.recipes.deleteOneDesc', { title: recipe.title }),
      confirmDestructive: true,
      confirmText: t('common.delete'),
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
  const sortLabel = t(SORT_OPTIONS.find((o) => o.key === sortBy)?.labelKey ?? 'screensMain.recipes.sort.recent');
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
            title={t('screensMain.recipes.title')}
            emphasis={t('screensMain.recipes.emphasis')}
            subtitle={
              recipes.length === 0
                ? t('screensMain.recipes.subtitleEmpty')
                : t('screensMain.recipes.subtitle', { count: recipes.length, noun: tp('screensMain.shared.recipe', recipes.length), ready: readyCount, readyWord: tp('screensMain.recipes.readyWord', readyCount) })
            }
          />

          <OfflineBanner
            state={outbox.state !== 'hidden' ? outbox.state : aiOffline ? 'offline' : 'hidden'}
            pendingCount={outbox.pendingCount}
            stuckCount={outbox.stuckCount}
            isRetrying={outbox.isRetrying}
            onRetry={async () => {
              await outbox.retryNow();
              if (aiOffline && (await isServerReachable())) setAiOffline(false);
            }}
          />

          {!aiOffline && (
          <>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('screensMain.recipes.searchPlaceholder')}
            accessibilityLabel={t('screensMain.recipes.searchA11y')}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
          >
            <Chip label={t('screensMain.recipes.tabAll')} variant="filter" selected={activeTab === 'all'} onPress={() => setActiveTab('all')} />
            <Chip label={t('screensMain.recipes.tabHighMatch')} variant="filter" selected={activeTab === 'high_match'} onPress={() => setActiveTab('high_match')} />
            <Chip label={t('screensMain.recipes.tabQuick')} variant="filter" selected={activeTab === 'quick'} onPress={() => setActiveTab('quick')} />
            <Chip label={t('screensMain.recipes.tabSaved')} variant="filter" selected={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
          </ScrollView>

          <View style={styles.tools}>
            <Pressable
              onPress={() => setPicker('sort')}
              style={styles.tool}
              accessibilityRole="button"
              accessibilityLabel={t('screensMain.recipes.sortA11y', { label: sortLabel })}
            >
              <Ionicons name="swap-vertical" size={18} color={colors.textPrimary} />
              <AppText variant="bodySmall" weight="semibold">{sortLabel}</AppText>
            </Pressable>
            <Pressable
              onPress={() => setPicker('difficulty')}
              style={styles.tool}
              accessibilityRole="button"
              accessibilityLabel={t('screensMain.recipes.difficultyA11y', { label: t(diffFilter.labelKey) })}
            >
              <DifficultyMeter
                level={diffTone ? diffTone.level : 2}
                segment={diffTone ? diffTone.segment : colors.borderStrong}
                empty={colors.m3.surfaceContainerHighest}
              />
              <AppText variant="bodySmall" weight="semibold">{t(diffFilter.labelKey)}</AppText>
            </Pressable>
          </View>
          </>
          )}
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
          title={t('screensMain.recipes.loadErrorTitle')}
          titleEmphasis={t('screensMain.recipes.loadErrorEmphasis')}
          message={error || t('screensMain.recipes.loadErrorFallback')}
          onRetry={reload}
        />
      )}

      {status === 'success' && aiOffline && (
        <View style={[styles.list, styles.offlineWrap, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
          {listHeader}
          <View style={styles.offlineState}>
            <EmptyState
              title={t('screensMain.recipes.offlineTitle')}
              titleEmphasis={t('screensMain.recipes.offlineEmphasis')}
              description={t('screensMain.recipes.offlineDesc')}
              iconName="cloud-offline-outline"
              tone="ai"
              blobSize="md"
              secondaryActionLabel={t('screensMain.recipes.viewSaved')}
              onSecondaryAction={() => {
                setAiOffline(false);
                setActiveTab('saved');
              }}
            />
          </View>
        </View>
      )}

      {status === 'success' && !aiOffline && (
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
                title={t('screensMain.recipes.noRecipesTitle')}
                titleEmphasis={t('screensMain.recipes.noRecipesEmphasis')}
                description={t('screensMain.recipes.noRecipesDesc')}
                iconName="restaurant-outline"
                tone="brand"
                blobDotColors={[colors.tertiaryContainer, 'transparent']}
                actionLabel={t('screensMain.recipes.generateWithAi')}
                actionTone="ai"
                actionIconName="sparkles"
                onAction={handleOpenAiModal}
              />
            ) : (
              <EmptyState
                title={activeTab === 'saved' ? t('screensMain.recipes.savedTitle') : t('screensMain.recipes.noMatchTitle')}
                titleEmphasis={activeTab === 'saved' ? t('screensMain.recipes.savedEmphasis') : t('screensMain.recipes.noMatchEmphasis')}
                description={
                  activeTab === 'saved'
                    ? t('screensMain.recipes.savedDesc')
                    : t('screensMain.recipes.noMatchDesc')
                }
                iconName={activeTab === 'saved' ? 'heart-outline' : 'search-outline'}
                tone="neutral"
                secondaryActionLabel={t('screensMain.recipes.seeAllRecipes')}
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
          accessibilityLabel={t('screensMain.recipes.fabA11y')}
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
          itemNoun={t('screensMain.recipes.itemNoun')}
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
        styleOptions={CUSTOM_STYLE_OPTIONS.map((o) => ({ key: o.key, label: t(o.labelKey), iconName: o.iconName }))}
        onGenerate={handleGenerate}
        onClose={() => setIsAiModalOpen(false)}
      />

      <AiProgressScreen
        visible={isGenerating}
        title={t('screensMain.recipes.chefTitle')}
        emphasis={t('screensMain.recipes.chefEmphasis')}
        steps={progressSteps}
        onCancel={() => {
          cancelledRef.current = true;
          setIsGenerating(false);
        }}
        cancelLabel={t('screensMain.recipes.chefCancel')}
      />

      {/* ── Ordenar / Dificultad ── */}
      <ActionSheetModal
        visible={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === 'sort' ? t('screensMain.recipes.sortTitle') : t('screensMain.recipes.difficultyTitle')}
        variant="action_sheet"
        actions={
          picker === 'sort'
            ? SORT_OPTIONS.map((o) => ({
                label: o.key === sortBy ? `${t(o.labelKey)}  ✓` : t(o.labelKey),
                icon: o.icon,
                onPress: () => setSortBy(o.key),
              }))
            : DIFFICULTY_FILTERS.map((d) => ({
                label: d.key === difficultyFilter ? `${t(d.labelKey)}  ✓` : t(d.labelKey),
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
const useStyles = makeStyles((colors) => ({
  offlineWrap: {
    flex: 1,
  },
  offlineState: {
    flex: 1,
    justifyContent: 'center',
  },
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
}));
