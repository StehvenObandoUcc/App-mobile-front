import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Text,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRecipes } from '../src/hooks/useRecipes';
import { useInventory } from '../src/hooks/useInventory';
import { Recipe, RecipeSortOption, RecipeDifficultyFilter, RecipeDifficulty } from '../src/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppScreen,
  RecipeCard,
  SkeletonCard,
  EmptyState,
  ErrorState,
  SearchInput,
  PrimaryButton,
  ActionSheetModal,
  StaggerView,
  getBottomContentPadding,
  Chip,
} from '../src/components';
import { sortRecipes } from '../src/utils/recipe-sorter';
import { getValidTimeOptionsForFocus } from '../src/utils/recipe-validation';
import { colors, radii, spacing, typography } from '../src/theme';

type FilterTab = 'all' | 'high_match' | 'quick' | 'saved';

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useInventory();
  const {
    recipes,
    status,
    error,
    reload,
    toggleSave,
    deleteRecipe,
    deleteRecipes,
    generateWithAi,
  } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<RecipeSortOption>('createdAt_desc');
  const [difficultyFilter, setDifficultyFilter] = useState<RecipeDifficultyFilter>('all');

  // Modal Chef IA
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number>(20);
  const [selectedFocus, setSelectedFocus] = useState<string>('waste_reduction');
  const [selectedDifficulty, setSelectedDifficulty] = useState<RecipeDifficulty>('easy');
  const [selectedCount, setSelectedCount] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modo Selección Múltiple (idéntico a Inventario)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Opciones de tiempo válidas según la lógica de compatibilidad
  const validTimes = useMemo(() => {
    return getValidTimeOptionsForFocus(selectedFocus, selectedDifficulty);
  }, [selectedFocus, selectedDifficulty]);

  // Asegurar que el tiempo seleccionado siempre sea válido cuando cambie el foco o dificultad
  React.useEffect(() => {
    if (!validTimes.includes(selectedTime)) {
      setSelectedTime(validTimes[0]);
    }
  }, [validTimes, selectedTime]);

  const handleGenerate = async () => {
    if (items.length === 0) {
      setIsAiModalOpen(false);
      Alert.alert(
        'Despensa vacía',
        'Añade al menos un alimento a tu inventario para que el Chef IA pueda crear recetas con lo que tienes disponible.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateWithAi(
        items,
        selectedTime,
        selectedFocus,
        selectedCount,
        selectedDifficulty
      );
      setIsAiModalOpen(false);
      Alert.alert(
        'Recetas Creadas',
        `El Chef IA generó ${generated.length} receta(s) personalizadas con tus ingredientes.`,
        [{ text: 'Ver Recetas', style: 'default' }]
      );
    } catch (err: any) {
      Alert.alert(
        'No se pudieron generar recetas',
        err?.message || 'Ocurrió un error al comunicarse con el Chef IA. Intenta de nuevo más tarde.',
        [{ text: 'Entendido', style: 'default' }]
      );
      setIsAiModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectRecipe = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
  };

  // Entrada directa a selección en long-press (sin modal emergente)
  const handleLongPress = (recipe: Recipe) => {
    setIsSelectMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(recipe.id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredRecipes.length && filteredRecipes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Eliminar recetas seleccionadas',
      `¿Deseas descartar permanentemente las ${selectedIds.size} receta(s) seleccionadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Eliminar (${selectedIds.size})`,
          style: 'destructive',
          onPress: async () => {
            await deleteRecipes(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  const filteredRecipes = useMemo(() => {
    const matched = recipes.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'high_match' && r.matchScore < 80) return false;
      if (activeTab === 'quick' && (r.prepTimeMinutes || 99) > 20) return false;
      if (activeTab === 'saved' && !r.isSaved) return false;
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) return false;

      return true;
    });

    return sortRecipes(matched, sortBy);
  }, [recipes, searchQuery, activeTab, difficultyFilter, sortBy]);

  return (
    <AppScreen style={styles.screen}>
      {/* ── Banner Principal IA ── */}
      <View style={styles.aiBannerWrapper}>
        <Pressable
          onPress={() => setIsAiModalOpen(true)}
          style={({ pressed }) => [styles.aiBanner, pressed && styles.aiBannerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Abrir generador de recetas con inteligencia artificial"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiBannerGradient}
          >
            <View style={styles.aiBannerIconWrap}>
              <Ionicons name="sparkles" size={24} color={colors.surface} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={styles.aiTagBadge}>
                <Text style={styles.aiTagText}>CHEF INTELIGENTE IA</Text>
              </View>
              <Text style={styles.aiBannerTitle}>Generar con IA</Text>
              <Text style={styles.aiBannerSubtitle}>
                {items.length > 0
                  ? `Combina tus ${items.length} alimentos guardados`
                  : 'Sugerencias basadas en tus ingredientes'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Buscador y Control de Selección ── */}
      <View style={styles.searchSection}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar recetas por nombre o ingrediente..."
          />
        </View>
        <Pressable
          onPress={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedIds(new Set());
          }}
          style={[styles.selectToggleBtn, isSelectMode && styles.selectToggleBtnActive]}
          hitSlop={8}
        >
          <Ionicons
            name={isSelectMode ? 'close' : 'checkmark-done-outline'}
            size={18}
            color={isSelectMode ? colors.surface : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* ── Tabs de Filtro Rápido con Chip ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
          <Chip
            label="Todas"
            selected={activeTab === 'all'}
            onPress={() => setActiveTab('all')}
            variant="filter"
          />
          <Chip
            label="Mayor coincidencia"
            icon="sparkles"
            selected={activeTab === 'high_match'}
            onPress={() => setActiveTab('high_match')}
            variant="filter"
          />
          <Chip
            label="Rápidas (≤20 min)"
            icon="time-outline"
            selected={activeTab === 'quick'}
            onPress={() => setActiveTab('quick')}
            variant="filter"
          />
          <Chip
            label={`Favoritas (${recipes.filter((r) => r.isSaved).length})`}
            icon="heart"
            selected={activeTab === 'saved'}
            onPress={() => setActiveTab('saved')}
            variant="filter"
          />
        </ScrollView>
      </View>

      {/* ── Barra de Ordenamiento (Recientes, Coincidencia, Tiempo) ── */}
      <View style={styles.sortBarWrapper}>
        <Text style={styles.sortBarLabel}>Ordenar:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortList}>
          {[
            { key: 'createdAt_desc', label: 'Más recientes' },
            { key: 'matchScore_desc', label: 'Mayor coincidencia' },
            { key: 'prepTime_asc', label: 'Más rápidas' },
            { key: 'difficulty_asc', label: 'Menor dificultad' },
          ].map((opt) => {
            const isSelected = sortBy === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSortBy(opt.key as RecipeSortOption)}
                style={[styles.sortPill, isSelected && styles.sortPillActive]}
              >
                <Text style={[styles.sortText, isSelected && styles.sortTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Estados de carga / error / lista ── */}
      {status === 'loading' && (
        <View style={styles.listContainer}>
          <SkeletonCard variant="recipe" />
          <SkeletonCard variant="recipe" />
        </View>
      )}

      {status === 'error' && (
        <ErrorState
          title="No pudimos cargar las recetas"
          message={error || 'Ocurrió un problema al leer las recetas disponibles.'}
          onRetry={reload}
        />
      )}

      {/* ── Barra de Gestión y Selección Rápida (Idéntica a Inventario) ── */}
      {status === 'success' && filteredRecipes.length > 0 && (
        <View style={styles.bulkToolbar}>
          <View style={styles.bulkTopRow}>
            <View style={styles.bulkInfo}>
              <Text style={styles.bulkCountText}>
                {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receta' : 'recetas'}
              </Text>
              {isSelectMode && (
                <Text style={styles.bulkSelectedText}>
                  ({selectedIds.size} seleccionadas)
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleSelectAll}
              style={styles.bulkActionBtn}
              accessibilityRole="button"
              accessibilityLabel={
                selectedIds.size === filteredRecipes.length
                  ? 'Deseleccionar todas las recetas'
                  : 'Seleccionar todas las recetas'
              }
            >
              <Ionicons
                name={
                  selectedIds.size === filteredRecipes.length && filteredRecipes.length > 0
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={16}
                color={colors.primary}
                style={{ marginRight: 5 }}
              />
              <Text style={styles.bulkActionBtnText}>
                {selectedIds.size === filteredRecipes.length && filteredRecipes.length > 0
                  ? 'Deseleccionar todas'
                  : 'Seleccionar todas'}
              </Text>
            </Pressable>
          </View>

          {isSelectMode && (
            <View style={styles.bulkBottomRow}>
              <Pressable
                onPress={handleDeleteSelected}
                style={styles.bulkDeleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Eliminar recetas seleccionadas"
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

      {status === 'success' && (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(110, getBottomContentPadding(insets.bottom)) },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <StaggerView index={Math.min(index, 8)}>
              <RecipeCard
                recipe={item}
                onPress={() =>
                  router.push({
                    pathname: '/recipe-detail',
                    params: { recipeId: item.id },
                  })
                }
                onSave={() => toggleSave(item.id)}
                onLongPress={() => handleLongPress(item)}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelectRecipe(item.id)}
              />
            </StaggerView>
          )}
          ListEmptyComponent={
            searchQuery.trim() || activeTab !== 'all' ? (
              <EmptyState
                title="Sin recetas que coincidan"
                description={
                  activeTab === 'saved'
                    ? 'Aún no has guardado recetas favoritas. Toca el icono de corazón en cualquier receta para guardarla aquí.'
                    : 'Prueba con otro término de búsqueda o cambia de filtro.'
                }
                actionLabel="Ver todas"
                onAction={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                iconName={activeTab === 'saved' ? 'heart-outline' : 'search-outline'}
              />
            ) : (
              <EmptyState
                title="No hay recetas disponibles"
                description="Genera recetas con el Chef IA o añade más alimentos a tu inventario."
                actionLabel="Generar con IA"
                onAction={() => setIsAiModalOpen(true)}
                iconName="restaurant-outline"
              />
            )
          }
        />
      )}

      {/* ── Modal Bottom Sheet de Generación con IA ── */}
      <Modal
        visible={isAiModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAiModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setIsAiModalOpen(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="sparkles" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.modalTitle}>Chef Inteligente IA</Text>
                <Text style={styles.modalSubtitle}>
                  {items.length} alimentos detectados en tu despensa
                </Text>
              </View>
              <Pressable
                onPress={() => setIsAiModalOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar generador de recetas con IA"
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Selector de Nivel de Dificultad */}
            <Text style={styles.modalSectionLabel}>Nivel de Dificultad</Text>
            <View style={styles.pillSelectorRow}>
              {[
                { key: 'easy', label: 'Fácil' },
                { key: 'medium', label: 'Media' },
                { key: 'hard', label: 'Difícil' },
              ].map((d) => (
                <Pressable
                  key={d.key}
                  onPress={() => setSelectedDifficulty(d.key as RecipeDifficulty)}
                  style={[
                    styles.timePill,
                    selectedDifficulty === d.key && styles.timePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePillText,
                      selectedDifficulty === d.key && styles.timePillTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Selector de Enfoque */}
            <Text style={styles.modalSectionLabel}>Enfoque Culinario</Text>
            <View style={styles.focusOptions}>
              <Pressable
                onPress={() => setSelectedFocus('waste_reduction')}
                style={[
                  styles.focusCard,
                  selectedFocus === 'waste_reduction' && styles.focusCardActive,
                ]}
              >
                <Ionicons
                  name="leaf-outline"
                  size={20}
                  color={selectedFocus === 'waste_reduction' ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.focusTitle,
                      selectedFocus === 'waste_reduction' && styles.focusTitleActive,
                    ]}
                  >
                    Aprovechar por vencer (Cero Desperdicio)
                  </Text>
                  <Text style={styles.focusDesc}>
                    Prioriza ingredientes próximos a caducar para no botar comida.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedFocus('quick')}
                style={[
                  styles.focusCard,
                  selectedFocus === 'quick' && styles.focusCardActive,
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={20}
                  color={selectedFocus === 'quick' ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.focusTitle,
                      selectedFocus === 'quick' && styles.focusTitleActive,
                    ]}
                  >
                    Rápida y Express
                  </Text>
                  <Text style={styles.focusDesc}>
                    Platos sencillos con menor cantidad de pasos y utensilios.
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Selector de Tiempo con Bloqueo Lógico */}
            <View style={styles.labelWithHint}>
              <Text style={styles.modalSectionLabel}>Tiempo Máximo de Preparación</Text>
              {selectedFocus === 'quick' && (
                <Text style={styles.validationHintText}>Máx. 20 min en modo Express</Text>
              )}
              {selectedDifficulty === 'hard' && (
                <Text style={styles.validationHintText}>Mín. 30 min en recetas complejas</Text>
              )}
            </View>
            <View style={styles.pillSelectorRow}>
              {[15, 20, 30, 45, 60].map((mins) => {
                const isAllowed = validTimes.includes(mins);
                const isSelected = selectedTime === mins;
                return (
                  <Pressable
                    key={mins}
                    disabled={!isAllowed}
                    onPress={() => setSelectedTime(mins)}
                    style={[
                      styles.timePill,
                      isSelected && styles.timePillActive,
                      !isAllowed && styles.timePillDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        isSelected && styles.timePillTextActive,
                        !isAllowed && styles.timePillTextDisabled,
                      ]}
                    >
                      {mins} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Selector de Cantidad de Recetas (mitigación temporal BUG-04) */}
            <Text style={styles.modalSectionLabel}>¿Cuántas recetas deseas generar?</Text>
            <View style={styles.pillSelectorRow}>
              {[1, 2, 3].map((cnt) => (
                <Pressable
                  key={cnt}
                  onPress={() => setSelectedCount(cnt)}
                  style={[
                    styles.timePill,
                    selectedCount === cnt && styles.timePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePillText,
                      selectedCount === cnt && styles.timePillTextActive,
                    ]}
                  >
                    {cnt} {cnt === 1 ? 'Receta' : 'Recetas'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 16 }} />

            <PrimaryButton
              title={`Generar ${selectedCount} ${selectedCount === 1 ? 'Receta' : 'Recetas'} con IA`}
              onPress={handleGenerate}
              isLoading={isGenerating}
              iconName="sparkles"
            />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  aiBannerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  aiBanner: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  aiBannerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  aiBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 18,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.containers,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTagBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.circular,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  aiTagText: {
    color: colors.textInverse,
    fontSize: typography.sizes.micro,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiBannerTitle: {
    color: colors.textInverse,
    fontSize: typography.sizes.body,
    fontWeight: '800',
  },
  aiBannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.sizes.label,
    marginTop: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: spacing.sm,
  },
  selectToggleBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabsWrapper: { marginBottom: spacing.sm },
  tabsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sortBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    marginBottom: spacing.xs,
  },
  sortBarLabel: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortList: {
    gap: 6,
  },
  sortPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortText: {
    fontSize: typography.sizes.label,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  labelWithHint: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  validationHintText: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    color: colors.functional.expiringSoon.text,
    marginTop: 2,
  },
  timePillDisabled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    opacity: 0.4,
  },
  timePillTextDisabled: {
    color: colors.textMuted,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xxl,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: '90%',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    fontSize: typography.sizes.metadata,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timePill: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 9,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  timePillText: {
    fontSize: typography.sizes.label,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timePillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  focusOptions: {
    gap: 10,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.containers,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusCardActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  focusTitle: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  focusTitleActive: {
    color: colors.primaryDark,
  },
  focusDesc: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    marginTop: 2,
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
});
