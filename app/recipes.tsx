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
import {
  AppScreen,
  RecipeCard,
  SkeletonCard,
  EmptyState,
  ErrorState,
  SearchInput,
  PrimaryButton,
  ActionSheetModal,
} from '../src/components';
import { sortRecipes } from '../src/utils/recipe-sorter';
import { getValidTimeOptionsForFocus } from '../src/utils/recipe-validation';

type FilterTab = 'all' | 'high_match' | 'quick' | 'saved';

export default function RecipesScreen() {
  const router = useRouter();
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
            colors={['#B94E35', '#863626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiBannerGradient}
          >
            <View style={styles.aiBannerIconWrap}>
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
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
        <View style={{ flex: 1, marginRight: 8 }}>
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
            color={isSelectMode ? '#FFFFFF' : '#4B5563'}
          />
        </Pressable>
      </View>

      {/* ── Tabs de Filtro Rápido (Cero emojis, vector icons limpios) ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsList}>
          <Pressable
            onPress={() => setActiveTab('all')}
            style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Todas</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('high_match')}
            style={[styles.tabPill, activeTab === 'high_match' && styles.tabPillActive]}
          >
            <Ionicons
              name="sparkles"
              size={13}
              color={activeTab === 'high_match' ? '#FFFFFF' : '#B94E35'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabText, activeTab === 'high_match' && styles.tabTextActive]}>
              Mayor coincidencia
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('quick')}
            style={[styles.tabPill, activeTab === 'quick' && styles.tabPillActive]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeTab === 'quick' ? '#FFFFFF' : '#6B7280'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
              Rápidas (≤20 min)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('saved')}
            style={[styles.tabPill, activeTab === 'saved' && styles.tabPillActive]}
          >
            <Ionicons
              name="heart"
              size={13}
              color={activeTab === 'saved' ? '#FFFFFF' : '#EF4444'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              Favoritas ({recipes.filter((r) => r.isSaved).length})
            </Text>
          </Pressable>
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
                color="#B94E35"
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

      {status === 'success' && (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
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
                <Ionicons name="sparkles" size={22} color="#B94E35" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Chef Inteligente IA</Text>
                <Text style={styles.modalSubtitle}>
                  {items.length} alimentos detectados en tu despensa
                </Text>
              </View>
              <Pressable onPress={() => setIsAiModalOpen(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
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
                  color={selectedFocus === 'waste_reduction' ? '#B94E35' : '#66534A'}
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
                  color={selectedFocus === 'quick' ? '#B94E35' : '#66534A'}
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
  screen: { backgroundColor: '#FFF9F2' },
  aiBannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  aiBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#B94E35',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  aiBannerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  aiBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aiBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTagBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  aiTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  aiBannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  selectToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectToggleBtnActive: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
  },
  tabsWrapper: { marginBottom: 8 },
  tabsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  tabPillActive: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#66534A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sortBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  sortBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#66534A',
    marginRight: 8,
  },
  sortList: {
    gap: 6,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  sortPillActive: {
    backgroundColor: '#B94E35',
    borderColor: '#B94E35',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  sortTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelWithHint: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  validationHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A5A00',
    marginTop: 2,
  },
  timePillDisabled: {
    backgroundColor: '#F8EDE2',
    borderColor: '#EBDDD2',
    opacity: 0.4,
  },
  timePillTextDisabled: {
    color: '#96857C',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#2B211D',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EBDDD2',
    alignSelf: 'center',
    marginBottom: 16,
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
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B211D',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#66534A',
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B211D',
    marginBottom: 8,
    marginTop: 8,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  timePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  timePillActive: {
    backgroundColor: '#FBE9E2',
    borderColor: '#B94E35',
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66534A',
  },
  timePillTextActive: {
    color: '#B94E35',
    fontWeight: '700',
  },
  focusOptions: {
    gap: 10,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBDDD2',
  },
  focusCardActive: {
    backgroundColor: '#FBE9E2',
    borderColor: '#B94E35',
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B211D',
  },
  focusTitleActive: {
    color: '#863626',
  },
  focusDesc: {
    fontSize: 12,
    color: '#66534A',
    marginTop: 2,
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
});
