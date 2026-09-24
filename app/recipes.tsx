import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRecipes } from '../src/hooks/useRecipes';
import { useInventory } from '../src/hooks/useInventory';
import {
  Recipe,
  RecipeSortOption,
  RecipeDifficultyFilter,
  RecipeDifficulty,
  DietaryPreference,
  DIETARY_OPTIONS,
  RecipeFocus,
  RECIPE_FOCUS_OPTIONS,
} from '../src/types';
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
import { getExpirationStatus } from '../src/utils/expiration';
import { colors, radii, spacing, typography } from '../src/theme';

type FilterTab = 'all' | 'high_match' | 'quick' | 'saved';

interface CustomStyleOption {
  key: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  description: string;
}

const CUSTOM_STYLE_OPTIONS: readonly CustomStyleOption[] = [
  {
    key: 'Gourmet',
    label: 'Gourmet',
    iconName: 'sparkles-outline',
    description: 'Técnicas refinadas, salsas elaboradas y emplatado de alta cocina.',
  },
  {
    key: 'Cena Ligera',
    label: 'Cena Ligera',
    iconName: 'leaf-outline',
    description: 'Bajo impacto calórico, digestión suave y porciones balanceadas.',
  },
  {
    key: 'Guiso o Sopa',
    label: 'Guiso o Sopa',
    iconName: 'water-outline',
    description: 'Cocción a fuego lento, caldos concentrados y platos reconfortantes.',
  },
  {
    key: 'Al Horno',
    label: 'Al Horno',
    iconName: 'flame-outline',
    description: 'Cocción envolvente, texturas crujientes o dorados gratinados.',
  },
  {
    key: 'Dulce o Postre',
    label: 'Dulce o Postre',
    iconName: 'cafe-outline',
    description: 'Preparaciones dulces, bocadillos o repostería con frutas.',
  },
] as const;

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
  const [selectedFocus, setSelectedFocus] = useState<RecipeFocus>('waste_reduction');
  const [customNote, setCustomNote] = useState('');
  const [selectedStyleTag, setSelectedStyleTag] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<RecipeDifficulty>('easy');
  const [selectedDietaryPreference, setSelectedDietaryPreference] = useState<DietaryPreference>('any');
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [selectedCount, setSelectedCount] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializar selección de ingredientes limpiamente al pulsar abrir modal (evita deselecciones accidentales por sincronización en segundo plano)
  const handleOpenAiModal = () => {
    if (items.length > 0) {
      setSelectedIngredientIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIngredientIds(new Set());
    }
    setCustomNote('');
    setSelectedStyleTag(null);
    setIsAiModalOpen(true);
  };

  const toggleSelectIngredient = (id: string) => {
    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllIngredients = () => {
    setSelectedIngredientIds(new Set(items.map((i) => i.id)));
  };

  const handleClearAllIngredients = () => {
    setSelectedIngredientIds(new Set());
  };

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

    const chosenIngredients = items.filter((i) => selectedIngredientIds.has(i.id));
    if (chosenIngredients.length === 0) {
      Alert.alert(
        'Selecciona ingredientes',
        'Por favor selecciona al menos un alimento o vegetal de tu despensa para crear recetas.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    setIsGenerating(true);
    try {
      let effectiveFocus: string = selectedFocus;
      if (selectedFocus === 'custom') {
        const parts = [selectedStyleTag, customNote.trim()].filter(Boolean);
        effectiveFocus = parts.length > 0 ? `custom: ${parts.join(', ')}` : 'custom';
      }

      const generated = await generateWithAi(
        chosenIngredients,
        selectedTime,
        effectiveFocus,
        selectedCount,
        selectedDifficulty,
        selectedDietaryPreference
      );
      setIsAiModalOpen(false);
      Alert.alert(
        'Recetas Creadas',
        `El Chef IA generó ${generated.length} receta(s) personalizadas con tus ingredientes seleccionados.`,
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

  const renderRecipeItem = useCallback(
    ({ item, index }: { item: Recipe; index: number }) => (
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
    ),
    [router, toggleSave, isSelectMode, selectedIds]
  );

  return (
    <AppScreen style={styles.screen}>
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

      {status === 'success' && (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(120, getBottomContentPadding(insets.bottom) + 16) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {/* ── Cabecera Editorial Recetas ── */}
              <View style={styles.headerSection}>
                <Text style={styles.screenTitle}>Recetas</Text>
                <Text style={styles.screenSubtitle}>
                  Inspiración culinaria según tus alimentos disponibles
                </Text>
              </View>

              {/* ── Banner Principal IA ── */}
              <View style={styles.aiBannerWrapper}>
                <Pressable
                  onPress={handleOpenAiModal}
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
                    placeholder="Buscar recetas o ingredientes..."
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

              {/* ── Barra de Gestión y Selección Rápida ── */}
              {filteredRecipes.length > 0 && (
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
            </View>
          }
          renderItem={renderRecipeItem}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
                onAction={handleOpenAiModal}
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
        onRequestClose={() => {
          if (!isGenerating) setIsAiModalOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissArea}
            disabled={isGenerating}
            onPress={() => {
              if (!isGenerating) setIsAiModalOpen(false);
            }}
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
                disabled={isGenerating}
                onPress={() => {
                  if (!isGenerating) setIsAiModalOpen(false);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar generador de recetas con IA"
                style={{ opacity: isGenerating ? 0.3 : 1 }}
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flexShrink: 1 }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* ── 1. Preferencia Dietaria con Ajuste Flexible y Ergonómico ── */}
                <Text style={styles.modalSectionLabel}>Preferencia Dietaria</Text>
                <View style={styles.dietaryPillsWrap}>
                  {DIETARY_OPTIONS.map((diet) => {
                    const isSelected = selectedDietaryPreference === diet.key;
                    return (
                      <Pressable
                        key={diet.key}
                        onPress={() => setSelectedDietaryPreference(diet.key)}
                        style={[
                          styles.dietaryPill,
                          isSelected && styles.dietaryPillActive,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Preferencia ${diet.label}`}
                      >
                        <Text
                          style={[
                            styles.dietaryPillText,
                            isSelected && styles.dietaryPillTextActive,
                          ]}
                        >
                          {diet.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ── 2. Selector de Ingredientes de la Despensa ── */}
                <View style={styles.ingredientSectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSectionLabel}>Ingredientes a Utilizar</Text>
                    <Text style={styles.ingredientCountHint}>
                      {items.length > 0
                        ? `${selectedIngredientIds.size} de ${items.length} seleccionados`
                        : 'Sin ingredientes disponibles'}
                    </Text>
                  </View>

                  {items.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Pressable
                        onPress={handleSelectAllIngredients}
                        style={styles.ingredientActionBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Seleccionar todos los ingredientes"
                      >
                        <Text style={styles.ingredientActionBtnText}>Todos</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleClearAllIngredients}
                        style={styles.ingredientActionBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Deseleccionar todos los ingredientes"
                      >
                        <Text style={styles.ingredientActionBtnText}>Ninguno</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {items.length === 0 ? (
                  <View style={styles.emptyPantryModalCard}>
                    <Ionicons name="basket-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyPantryModalTitle}>Tu despensa está vacía</Text>
                    <Text style={styles.emptyPantryModalDesc}>
                      Agrega ingredientes en tu inventario o escanea un ticket antes de crear recetas personalizadas.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ingredientChipsWrap}>
                    {items.map((ing) => {
                      const isSelected = selectedIngredientIds.has(ing.id);
                      const exp = getExpirationStatus(ing.expirationDate);
                      const isUrgent = exp.status === 'expiringSoon' || exp.status === 'expired';
                      return (
                        <Pressable
                          key={ing.id}
                          onPress={() => toggleSelectIngredient(ing.id)}
                          style={[
                            styles.ingredientChip,
                            isSelected && styles.ingredientChipSelected,
                            isUrgent && styles.ingredientChipUrgent,
                          ]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isSelected }}
                          accessibilityLabel={`${ing.name} ${isSelected ? 'seleccionado' : 'no seleccionado'}${isUrgent ? `, ${exp.label}` : ''}`}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={15}
                            color={isSelected ? colors.primary : colors.textMuted}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.ingredientChipText,
                              isSelected && styles.ingredientChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {ing.name}{ing.quantity ? ` (${ing.quantity} ${ing.unit || ''})` : ''}
                          </Text>
                          {isUrgent && (
                            <View style={styles.urgentBadge}>
                              <Ionicons
                                name="time-outline"
                                size={10}
                                color={colors.functional.expiringSoon.text}
                                style={{ marginRight: 3 }}
                              />
                              <Text style={styles.urgentBadgeText}>{exp.label}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {items.length > 0 && selectedIngredientIds.size === 0 && (
                  <View style={styles.ingredientWarningRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={colors.functional.expiringSoon.text}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.validationHintText}>
                      Selecciona al menos 1 alimento o vegetal de tu despensa.
                    </Text>
                  </View>
                )}

                {/* ── 3. Selector de Nivel de Dificultad ── */}
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
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedDifficulty === d.key }}
                      accessibilityLabel={`Dificultad ${d.label}`}
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

                {/* ── 4. Selector de Enfoque Culinario ── */}
                <Text style={styles.modalSectionLabel}>Enfoque Culinario</Text>
                <View style={styles.focusOptions}>
                  {RECIPE_FOCUS_OPTIONS.map((f) => {
                    const isActive = selectedFocus === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setSelectedFocus(f.key)}
                        style={[
                          styles.focusCard,
                          isActive && styles.focusCardActive,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`Enfoque ${f.title}`}
                      >
                        <Ionicons
                          name={f.iconName}
                          size={20}
                          color={isActive ? colors.primary : colors.textSecondary}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text
                            style={[
                              styles.focusTitle,
                              isActive && styles.focusTitleActive,
                            ]}
                          >
                            {f.title}
                          </Text>
                          <Text style={styles.focusDesc}>
                            {f.description}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Sub-opciones cuando el enfoque es Personalizada y Creativa */}
                {selectedFocus === 'custom' && (
                  <View style={styles.customOptionsContainer}>
                    <Text style={styles.customSubLabel}>Estilo o Técnica Culinaria (Opcional)</Text>
                    <View style={styles.customTagsWrap}>
                      {CUSTOM_STYLE_OPTIONS.map((opt) => {
                        const isTagSelected = selectedStyleTag === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => setSelectedStyleTag(isTagSelected ? null : opt.key)}
                            style={[
                              styles.customTagChip,
                              isTagSelected && styles.customTagChipActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isTagSelected }}
                            accessibilityLabel={`Estilo culinario ${opt.label}`}
                          >
                            <Ionicons
                              name={opt.iconName}
                              size={14}
                              color={isTagSelected ? colors.primaryDark : colors.textSecondary}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.customTagText,
                                isTagSelected && styles.customTagTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {selectedStyleTag && (() => {
                      const activeOpt = CUSTOM_STYLE_OPTIONS.find((o) => o.key === selectedStyleTag);
                      if (!activeOpt) return null;
                      return (
                        <View style={styles.styleFeedbackBox}>
                          <View style={styles.styleFeedbackHeader}>
                            <Ionicons
                              name={activeOpt.iconName}
                              size={15}
                              color={colors.primary}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.styleFeedbackTitle}>
                              Enfoque culinario: {activeOpt.label}
                            </Text>
                          </View>
                          <Text style={styles.styleFeedbackDesc}>{activeOpt.description}</Text>
                        </View>
                      );
                    })()}

                    <Text style={styles.customSubLabel}>Indicación o antojo especial (Opcional)</Text>
                    <TextInput
                      value={customNote}
                      onChangeText={setCustomNote}
                      placeholder="Ej. salsa cremosa, cena ligera, plato caliente..."
                      placeholderTextColor={colors.textMuted}
                      maxLength={60}
                      style={styles.customTextInput}
                      returnKeyType="done"
                      accessibilityLabel="Indicación o antojo especial para la receta"
                    />
                  </View>
                )}

                {/* ── 5. Selector de Tiempo con Bloqueo Lógico ── */}
                <View style={styles.labelWithHint}>
                  <Text style={styles.modalSectionLabel}>Tiempo Máximo de Preparación</Text>
                  {selectedFocus === 'quick' && (
                    <Text style={styles.validationHintText}>Máx. 20 min en modo Express</Text>
                  )}
                  {selectedDifficulty === 'hard' && selectedFocus !== 'quick' && (
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
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected, disabled: !isAllowed }}
                        accessibilityLabel={`${mins} minutos`}
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

                {/* ── 6. Selector de Cantidad de Recetas ── */}
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
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedCount === cnt }}
                      accessibilityLabel={`${cnt} ${cnt === 1 ? 'receta' : 'recetas'}`}
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

                <View style={{ height: 18 }} />

                <PrimaryButton
                  title={`Generar ${selectedCount} ${selectedCount === 1 ? 'Receta' : 'Recetas'} con IA`}
                  onPress={handleGenerate}
                  isLoading={isGenerating}
                  disabled={selectedIngredientIds.size === 0 || isGenerating}
                  iconName="sparkles"
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  headerSection: {
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
  aiBannerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  ingredientSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  ingredientCountHint: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  ingredientActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientActionBtnText: {
    fontSize: typography.sizes.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  dietaryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  dietaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dietaryPillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  dietaryPillText: {
    fontSize: typography.sizes.label,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dietaryPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyPantryModalCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.cards,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyPantryModalTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyPantryModalDesc: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  ingredientChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientChipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  ingredientChipText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: '600',
    maxWidth: 180,
  },
  ingredientChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  ingredientChipUrgent: {
    borderColor: colors.functional.expiringSoon.border,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.functional.expiringSoon.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.circular,
    marginLeft: 6,
  },
  urgentBadgeText: {
    fontSize: typography.sizes.micro,
    color: colors.functional.expiringSoon.text,
    fontWeight: '700',
  },
  ingredientWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  customOptionsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customSubLabel: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 6,
  },
  customTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customTagChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  customTagText: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customTagTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  styleFeedbackBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: spacing.sm,
  },
  styleFeedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  styleFeedbackTitle: {
    fontSize: typography.sizes.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  styleFeedbackDesc: {
    fontSize: typography.sizes.micro,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  customTextInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.buttons,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.bodySmall,
    color: colors.textPrimary,
    minHeight: 44,
  },
});
