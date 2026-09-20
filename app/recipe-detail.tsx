import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../src/hooks/useRecipes';
import { Recipe } from '../src/types';
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';

import { validateRecipeIngredients } from '../src/utils/recipe-validation';
import { useShoppingList } from '../src/hooks/useShoppingList';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { getRecipeById, prepareRecipe, getRecipeSteps } = useRecipes();
  const { addFromRecipe } = useShoppingList();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);

  useEffect(() => {
    if (recipeId) {
      getRecipeById(recipeId).then(async (rec) => {
        setRecipe(rec);
        // Si la receta no tiene pasos generados aún (Fase 2 bajo demanda), solicitarlos a la IA
        if (rec && (!rec.steps || rec.steps.length === 0)) {
          setIsLoadingSteps(true);
          setStepsError(null);
          try {
            const loadedSteps = await getRecipeSteps(rec);
            setRecipe((prev) => (prev ? { ...prev, steps: loadedSteps } : prev));
          } catch (err: any) {
            setStepsError(err?.message || 'No pudimos cargar los pasos en este momento.');
          } finally {
            setIsLoadingSteps(false);
          }
        }
      });
    }
  }, [recipeId, getRecipeById, getRecipeSteps]);

  if (!recipe) {
    return (
      <AppScreen style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando detalle de la receta...</Text>
      </AppScreen>
    );
  }

  const validation = validateRecipeIngredients(recipe);

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleFinishCooking = () => {
    if (!validation.canPrepare) {
      Alert.alert(
        'Preparar receta',
        'No cuentas con todos los ingredientes necesarios en tu inventario. ¿Deseas preparar la receta de todos modos? (No se descontará ningún ingrediente de tu despensa).',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Preparar de todos modos',
            style: 'default',
            onPress: () => {
              Alert.alert(
                '¡Buen provecho!',
                'Has preparado esta receta. Tu inventario se mantiene intacto ya que faltaban algunos ingredientes.',
                [{ text: 'Ver recetas', onPress: () => router.replace('/recipes') }]
              );
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      '¿Finalizar preparación?',
      validation.inventoryDeductionNotice,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, finalizar y descontar',
          style: 'default',
          onPress: async () => {
            setIsFinishing(true);
            try {
              const consumed = await prepareRecipe(recipe.id);
              Alert.alert(
                'Preparación completada',
                `Receta preparada con éxito. Se descontaron: ${
                  consumed.join(', ') || 'los ingredientes utilizados'
                }.`,
                [{ text: 'Ver inventario', onPress: () => router.replace('/inventory') }]
              );
            } catch {
              Alert.alert('Aviso', 'No se pudieron descontar los ingredientes.');
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen scrollable style={styles.screen}>
      {/* ── Banner Superior ── */}
      <View style={styles.heroCard}>
        <View style={styles.matchBadge}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.matchText}>{recipe.matchScore}% Coincidencia con tu inventario</Text>
        </View>

        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Metadatos en píldoras */}
        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes && (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{recipe.servings} porciones</Text>
            </View>
          )}
          <View style={styles.metaPill}>
            <Ionicons name="flame-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>Dificultad {recipe.difficulty}</Text>
          </View>
        </View>
      </View>

      {/* ── Sección de Ingredientes Disponibles ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            Ingredientes en tu cocina ({recipe.availableIngredients.length})
          </Text>
        </View>

        {recipe.availableIngredients.map((ing) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <Ionicons name="checkmark-outline" size={16} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.ingName}>{ing.name}</Text>
            <Text style={styles.ingQty}>
              {ing.quantity !== null ? `${ing.quantity} ${ing.unit}` : 'Al gusto'}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Sección de Ingredientes Faltantes (con sustituciones) ── */}
      {recipe.missingIngredients.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>
              Ingredientes que te faltan ({recipe.missingIngredients.length})
            </Text>
          </View>

          {recipe.missingIngredients.map((ing) => (
            <View key={ing.id} style={styles.missingRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.missingName}>{ing.name}</Text>
                  {ing.isOptional && <Text style={styles.optionalTag}> (Opcional)</Text>}
                </View>
                {ing.substitutions.length > 0 && (
                  <Text style={styles.subText}>
                    Puedes sustituir por: {ing.substitutions.join(', ')}
                  </Text>
                )}
              </View>
              <Text style={styles.missingQty}>
                {ing.quantity !== null ? `${ing.quantity} ${ing.unit}` : ''}
              </Text>
            </View>
          ))}

          <Pressable
            style={styles.addMissingButton}
            onPress={async () => {
              const res = await addFromRecipe(recipe.missingIngredients, recipe.title);
              Alert.alert(
                'Lista de compras',
                `Se procesaron ${recipe.missingIngredients.length} ingredientes: ${res.addedCount} agregados y ${res.mergedCount} fusionados sin duplicados.`,
                [
                  { text: 'Ir a la lista', onPress: () => router.push('/shopping-list') },
                  { text: 'Entendido', style: 'cancel' },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Añadir ingredientes faltantes a la lista de compras"
          >
            <Ionicons name="cart-outline" size={18} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.addMissingButtonText}>Añadir faltantes a Lista de Compras</Text>
          </Pressable>
        </View>
      )}

      {/* ── Sección de Pasos Interactivos (Cooking Checklist) ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list-outline" size={20} color="#374151" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            Pasos de preparación {recipe.steps.length > 0 ? `(${completedSteps.length}/${recipe.steps.length})` : ''}
          </Text>
        </View>

        {isLoadingSteps && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
              El Chef IA está redactando las instrucciones paso a paso...
            </Text>
          </View>
        )}

        {stepsError && (
          <View style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#FEF2F2', borderRadius: 10, marginVertical: 8 }}>
            <Text style={{ fontSize: 13, color: '#DC2626', marginBottom: 8 }}>{stepsError}</Text>
            <Pressable
              onPress={async () => {
                if (!recipe) return;
                setIsLoadingSteps(true);
                setStepsError(null);
                try {
                  const loadedSteps = await getRecipeSteps(recipe);
                  setRecipe((prev) => (prev ? { ...prev, steps: loadedSteps } : prev));
                } catch (err: any) {
                  setStepsError(err?.message || 'Error reintentando cargar los pasos.');
                } finally {
                  setIsLoadingSteps(false);
                }
              }}
              style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#EF4444', borderRadius: 6 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingSteps && !stepsError && recipe.steps.length === 0 && (
          <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', paddingVertical: 10 }}>
            No hay pasos registrados para esta receta.
          </Text>
        )}

        {recipe.steps.map((step, idx) => {
          const isDone = completedSteps.includes(idx);
          return (
            <Pressable
              key={idx}
              onPress={() => toggleStep(idx)}
              style={[styles.stepCard, isDone && styles.stepCardDone]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
            >
              <View style={[styles.stepNumber, isDone && styles.stepNumberDone]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepText, isDone && styles.stepTextDone]}>{step}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Acción de Finalizar Preparación ── */}
      <View style={styles.actionSection}>
        {!validation.canPrepare && (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={20} color="#D97706" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Ingredientes incompletos</Text>
              <Text style={styles.noticeText}>
                No cuentas con todos los ingredientes registrados. Puedes preparar la receta igualmente sin alterar las existencias de tu inventario.
              </Text>
            </View>
          </View>
        )}

        <PrimaryButton
          title={validation.canPrepare ? 'Finalizar preparación y descontar' : 'Preparar receta'}
          onPress={handleFinishCooking}
          isLoading={isFinishing}
          iconName="restaurant"
        />
        <View style={{ height: 10 }} />
        <SecondaryButton
          title="Volver a recetas"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F9FAFB' },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  ingName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  ingQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  missingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  missingName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  optionalTag: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  missingQty: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepCardDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberDone: {
    backgroundColor: '#10B981',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  stepText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    flex: 1,
  },
  stepTextDone: {
    color: '#065F46',
    textDecorationLine: 'line-through',
  },
  actionSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    paddingBottom: 40,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  addMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  addMissingButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
