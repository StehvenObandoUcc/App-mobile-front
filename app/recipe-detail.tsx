import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../src/hooks/useRecipes';
import { Recipe } from '../src/types';
import { AppScreen, PrimaryButton, SecondaryButton, M3Dialog } from '../src/components';

import { validateRecipeIngredients } from '../src/utils/recipe-validation';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { colors, radii, spacing, typography } from '../src/theme';

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

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    iconName?: keyof typeof Ionicons.glyphMap;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Entendido',
    onConfirm: () => {},
  });

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
      setDialogConfig({
        visible: true,
        title: 'Preparar receta',
        message:
          'No cuentas con todos los ingredientes necesarios en tu inventario. ¿Deseas preparar la receta de todos modos? (No se descontará ningún ingrediente de tu despensa).',
        type: 'warning',
        iconName: 'warning-outline',
        confirmText: 'Preparar de todos modos',
        cancelText: 'Cancelar',
        onCancel: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
        onConfirm: () => {
          setDialogConfig({
            visible: true,
            title: '¡Buen provecho!',
            message:
              'Has preparado esta receta. Tu inventario se mantiene intacto ya que faltaban algunos ingredientes.',
            type: 'success',
            iconName: 'restaurant-outline',
            confirmText: 'Ver recetas',
            cancelText: undefined,
            onCancel: undefined,
            onConfirm: () => {
              setDialogConfig((prev) => ({ ...prev, visible: false }));
              router.replace('/recipes');
            },
          });
        },
      });
      return;
    }

    setDialogConfig({
      visible: true,
      title: '¿Finalizar preparación?',
      message: validation.inventoryDeductionNotice,
      type: 'info',
      iconName: 'restaurant-outline',
      confirmText: 'Sí, finalizar y descontar',
      cancelText: 'Cancelar',
      onCancel: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
      onConfirm: async () => {
        setDialogConfig((prev) => ({ ...prev, visible: false }));
        setIsFinishing(true);
        try {
          const consumed = await prepareRecipe(recipe.id);
          setDialogConfig({
            visible: true,
            title: 'Preparación completada',
            message: `Receta preparada con éxito. Se descontaron: ${
              consumed.join(', ') || 'los ingredientes utilizados'
            }.`,
            type: 'success',
            iconName: 'checkmark-circle-outline',
            confirmText: 'Ver inventario',
            cancelText: undefined,
            onCancel: undefined,
            onConfirm: () => {
              setDialogConfig((prev) => ({ ...prev, visible: false }));
              router.replace('/inventory');
            },
          });
        } catch {
          setDialogConfig({
            visible: true,
            title: 'Aviso',
            message: 'No se pudieron descontar los ingredientes.',
            type: 'error',
            iconName: 'alert-circle-outline',
            confirmText: 'Entendido',
            cancelText: undefined,
            onCancel: undefined,
            onConfirm: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
          });
        } finally {
          setIsFinishing(false);
        }
      },
    });
  };

  return (
    <AppScreen scrollable style={styles.screen}>
      {/* ── Banner Superior ── */}
      <View style={styles.heroCard}>
        <View style={styles.matchBadge}>
          <Ionicons name="sparkles" size={14} color={colors.surface} style={{ marginRight: spacing.xs }} />
          <Text style={styles.matchText}>{recipe.matchScore}% Coincidencia con tu inventario</Text>
        </View>

        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Metadatos en píldoras */}
        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes && (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={14} color={colors.primaryDark} style={{ marginRight: spacing.xs }} />
              <Text style={styles.metaText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={14} color={colors.primaryDark} style={{ marginRight: spacing.xs }} />
              <Text style={styles.metaText}>{recipe.servings} porciones</Text>
            </View>
          )}
          <View style={styles.metaPill}>
            <Ionicons name="flame-outline" size={14} color={colors.primaryDark} style={{ marginRight: spacing.xs }} />
            <Text style={styles.metaText}>Dificultad {recipe.difficulty}</Text>
          </View>
        </View>
      </View>

      {/* ── Sección de Ingredientes Disponibles ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.functional.fresh.text} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            Ingredientes en tu cocina ({recipe.availableIngredients.length})
          </Text>
        </View>

        {recipe.availableIngredients.map((ing) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <Ionicons name="checkmark-outline" size={16} color={colors.functional.fresh.text} style={{ marginRight: spacing.sm }} />
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
            <Ionicons name="alert-circle-outline" size={20} color={colors.functional.expiringSoon.text} style={{ marginRight: 6 }} />
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
              setDialogConfig({
                visible: true,
                title: 'Lista de compras',
                message: `Se procesaron ${recipe.missingIngredients.length} ingredientes: ${res.addedCount} agregados y ${res.mergedCount} fusionados sin duplicados.`,
                type: 'success',
                iconName: 'cart-outline',
                confirmText: 'Ir a la lista',
                cancelText: 'Entendido',
                onConfirm: () => {
                  setDialogConfig((prev) => ({ ...prev, visible: false }));
                  router.push('/shopping-list');
                },
                onCancel: () => setDialogConfig((prev) => ({ ...prev, visible: false })),
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Añadir ingredientes faltantes a la lista de compras"
          >
            <Ionicons name="cart-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.addMissingButtonText}>Añadir faltantes a Lista de Compras</Text>
          </Pressable>
        </View>
      )}

      {/* ── Sección de Pasos Interactivos (Cooking Checklist) ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="list-outline" size={20} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>
            Pasos de preparación {(recipe.steps?.length || 0) > 0 ? `(${completedSteps.length}/${recipe.steps?.length})` : ''}
          </Text>
        </View>

        {isLoadingSteps && (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ marginTop: spacing.sm, fontSize: typography.sizes.metadata, color: colors.textSecondary }}>
              El Chef IA está redactando las instrucciones paso a paso...
            </Text>
          </View>
        )}

        {stepsError && (
          <View style={{ paddingVertical: spacing.md, paddingHorizontal: 14, backgroundColor: colors.error.background, borderRadius: radii.chips, marginVertical: spacing.sm }}>
            <Text style={{ fontSize: typography.sizes.metadata, color: colors.error.text, marginBottom: spacing.sm }}>{stepsError}</Text>
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
              style={{
                alignSelf: 'flex-start',
                minHeight: spacing.touchTargetMin,
                paddingHorizontal: spacing.md,
                backgroundColor: colors.error.text,
                borderRadius: radii.buttons,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Reintentar cargar pasos de la receta"
            >
              <Text style={{ fontSize: typography.sizes.label, fontWeight: '600', color: colors.textInverse }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingSteps && !stepsError && (recipe.steps?.length || 0) === 0 && (
          <Text style={{ fontSize: typography.sizes.metadata, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 10 }}>
            No hay pasos registrados para esta receta.
          </Text>
        )}

        {(recipe.steps || []).map((step, idx) => {
          const isDone = completedSteps.includes(idx);
          return (
            <Pressable
              key={idx}
              onPress={() => toggleStep(idx)}
              style={[styles.stepCard, isDone && styles.stepCardDone]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              accessibilityLabel={`Paso ${idx + 1}: ${step}`}
            >
              <View style={[styles.stepNumber, isDone && styles.stepNumberDone]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
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
            <Ionicons name="information-circle-outline" size={20} color={colors.functional.expiringSoon.text} style={{ marginRight: spacing.sm }} />
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

      <M3Dialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        iconName={dialogConfig.iconName}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  heroCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: 14,
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.circular,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  matchText: {
    color: colors.textInverse,
    fontSize: typography.sizes.label,
    fontWeight: '700',
  },
  title: {
    fontSize: typography.sizes.headline,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.circular,
  },
  metaText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  ingName: {
    fontSize: typography.sizes.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  ingQty: {
    fontSize: typography.sizes.metadata,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  missingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  missingName: {
    fontSize: typography.sizes.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionalTag: {
    fontSize: typography.sizes.label,
    color: colors.textMuted,
  },
  subText: {
    fontSize: typography.sizes.label,
    color: colors.primaryDark,
    marginTop: 2,
  },
  missingQty: {
    fontSize: typography.sizes.metadata,
    fontWeight: '500',
    color: colors.textMuted,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radii.buttons,
    backgroundColor: colors.background,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCardDone: {
    backgroundColor: colors.functional.fresh.background,
    borderColor: colors.functional.fresh.border,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumberDone: {
    backgroundColor: colors.functional.fresh.text,
  },
  stepNumberText: {
    fontSize: typography.sizes.label,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepText: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  stepTextDone: {
    color: colors.functional.fresh.text,
    textDecorationLine: 'line-through',
  },
  actionSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingBottom: spacing.section,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.functional.expiringSoon.background,
    borderWidth: 1,
    borderColor: colors.functional.expiringSoon.border,
    borderRadius: radii.cards,
    padding: 14,
    marginBottom: 14,
  },
  noticeTitle: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.functional.expiringSoon.text,
    marginBottom: 2,
  },
  noticeText: {
    fontSize: typography.sizes.label,
    color: colors.functional.expiringSoon.text,
    lineHeight: 18,
  },
  addMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  addMissingButtonText: {
    fontSize: typography.sizes.metadata,
    fontWeight: '700',
    color: colors.primary,
  },
});
