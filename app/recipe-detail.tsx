import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecipes } from '../src/hooks/useRecipes';
import { useInventory } from '../src/hooks/useInventory';
import { useShoppingList } from '../src/hooks/useShoppingList';
import { Recipe, RecipeIngredient } from '../src/types';
import {
  AppText,
  PrimaryButton,
  M3Dialog,
  InlineErrorCard,
  EmptyState,
  StepsLoading,
  AiBadge,
  RecipeCover,
  StatTile,
  RecipeIngredientsCard,
  MissingIngredientsCard,
  StepItem,
  StickyActionBar,
  DifficultyMeter,
} from '../src/components';
import { validateRecipeIngredients } from '../src/utils/recipe-validation';
import { recipeBanner, DIFFICULTY_LABELS, splitRecipeTitle, cleanStepText } from '../src/utils/recipe-visuals';
import { formatQuantity } from '../src/utils/units';
import { daysUntil } from '../src/utils/dates';
import { colors, spacing } from '../src/theme';

type DialogState = {
  visible: boolean;
  title: string;
  titleEmphasis?: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  iconName?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

const qty = (i: RecipeIngredient) => (i.quantity !== null ? formatQuantity(i.quantity, i.unit, { long: true }) : 'Al gusto');

/**
 * Detalle de receta — Receta-Detalle.dc.html.
 * Portada pastel con volver/guardar · coincidencia (IA) · título 300 + 600 · 3 fichas ·
 * ingredientes con progreso y «vence en N d» · faltantes con sustitutos · pasos con progreso
 * (hechos en salvia, el actual con anillo cacao) · barra fija «Preparar receta».
 * Sin «Volver a recetas» (decisión aprobada): se vuelve con la flecha de la portada.
 */
export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { getRecipeById, prepareRecipe, getRecipeSteps, toggleSave } = useRecipes();
  const { items } = useInventory();
  const { addFromRecipe } = useShoppingList();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

  const loadSteps = useCallback(
    async (rec: Recipe) => {
      setIsLoadingSteps(true);
      setStepsError(null);
      try {
        const loaded = await getRecipeSteps(rec);
        setRecipe((prev) => (prev ? { ...prev, steps: loaded } : prev));
      } catch (err: any) {
        setStepsError(err?.message || 'No pudimos cargar los pasos en este momento.');
      } finally {
        setIsLoadingSteps(false);
      }
    },
    [getRecipeSteps]
  );

  useEffect(() => {
    if (!recipeId) return;
    getRecipeById(recipeId).then((rec) => {
      setRecipe(rec);
      setNotFound(!rec);
      // Pasos bajo demanda: si la receta aún no los tiene, se piden a la IA.
      if (rec && (!rec.steps || rec.steps.length === 0)) loadSteps(rec);
    });
  }, [recipeId, getRecipeById, loadSteps]);

  // «vence en N d» para ingredientes que tienes y vencen pronto (según tu despensa).
  const expiryFor = useCallback(
    (ing: RecipeIngredient) => {
      const match =
        items.find((i) => i.id === ing.inventoryIngredientId) ??
        items.find((i) => i.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
      const d = match ? daysUntil(match.expirationDate) : null;
      if (d === null || d > 3) return undefined;
      if (d < 0) return { label: 'vencido', tone: colors.functional.expired };
      return { label: d === 0 ? 'vence hoy' : `vence en ${d} d`, tone: colors.functional.expiringSoon };
    },
    [items]
  );

  const steps = useMemo(() => (recipe?.steps ?? []).map(cleanStepText), [recipe?.steps]);

  if (!recipe && notFound) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <EmptyState
          title="No encontramos"
          titleEmphasis="esta receta"
          description="Puede que la hayas borrado o que ya no esté disponible."
          iconName="restaurant-outline"
          tone="neutral"
          actionLabel="Ver mis recetas"
          onAction={() => router.replace('/recipes')}
        />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.ink} />
        <AppText variant="bodySmall" color={colors.textSecondary}>
          Cargando receta…
        </AppText>
      </View>
    );
  }

  const validation = validateRecipeIngredients(recipe);
  const banner = recipeBanner(recipe.id);
  const { lead, emphasis } = splitRecipeTitle(recipe.title);
  const available = recipe.availableIngredients.length;
  const total = available + recipe.missingIngredients.length;
  const diff = colors.difficulty[recipe.difficulty] ?? colors.difficulty.easy;
  const currentStep = steps.findIndex((_, i) => !completedSteps.includes(i));

  const toggleStep = (index: number) =>
    setCompletedSteps((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));

  const handleAddMissing = async () => {
    let res: { addedCount: number; mergedCount: number };
    try {
      res = await addFromRecipe(recipe.missingIngredients, recipe.title);
    } catch {
      setDialog({
        visible: true,
        title: 'No se pudieron',
        titleEmphasis: 'agregar',
        message: 'Inténtalo de nuevo en un momento.',
        type: 'error',
        confirmText: 'Entendido',
        onConfirm: closeDialog,
      });
      return;
    }
    setDialog({
      visible: true,
      title: '¡Listo! Faltantes en tu',
      titleEmphasis: 'lista de compras',
      message: `${res.addedCount} ${res.addedCount === 1 ? 'agregado' : 'agregados'}${res.mergedCount ? ` y ${res.mergedCount} sumados a lo que ya tenías` : ''}.`,
      type: 'success',
      iconName: 'cart-outline',
      confirmText: 'Ir a compras',
      cancelText: 'Seguir aquí',
      onConfirm: () => {
        closeDialog();
        router.navigate('/shopping-list');
      },
      onCancel: closeDialog,
    });
  };

  /** Descuenta de la despensa lo que la receta usa y muestra el resultado. */
  const runPrepare = async () => {
    closeDialog();
    setIsFinishing(true);
    try {
      const { consumed, skipped } = await prepareRecipe(recipe.id);
      const parts = [
        consumed.length > 0
          ? `Se descontaron de tu despensa: ${consumed.join(', ')}.`
          : 'No se descontó nada de tu despensa.',
        skipped.length > 0
          ? `Revisa a mano ${skipped.join(', ')}: la receta usa otra unidad o no indica cantidad.`
          : '',
      ].filter(Boolean);
      setDialog({
        visible: true,
        title: '¡Buen',
        titleEmphasis: 'provecho!',
        message: parts.join('\n\n'),
        type: 'success',
        iconName: 'checkmark-circle-outline',
        confirmText: 'Ver despensa',
        onConfirm: () => {
          closeDialog();
          router.replace('/inventory');
        },
      });
    } catch {
      setDialog({
        visible: true,
        title: 'No se pudo',
        titleEmphasis: 'descontar',
        message: 'Tus ingredientes siguen en la despensa. Inténtalo de nuevo.',
        type: 'error',
        confirmText: 'Entendido',
        onConfirm: closeDialog,
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleFinishCooking = () => {
    // Nada que descontar: no tienes ninguno de los ingredientes.
    if (!validation.willDeductFromInventory) {
      setDialog({
        visible: true,
        title: '¡Buen',
        titleEmphasis: 'provecho!',
        message: validation.inventoryDeductionNotice,
        type: 'success',
        iconName: 'restaurant-outline',
        confirmText: 'Ver recetas',
        onConfirm: () => {
          closeDialog();
          router.replace('/recipes');
        },
      });
      return;
    }

    const partial = !validation.canPrepare;
    setDialog({
      visible: true,
      title: partial ? '¿Preparar sin todos los' : '¿Terminaste de',
      titleEmphasis: partial ? 'ingredientes?' : 'cocinar?',
      message: validation.inventoryDeductionNotice,
      type: partial ? 'warning' : 'info',
      iconName: partial ? undefined : 'restaurant-outline',
      confirmText: partial ? 'Preparar y descontar' : 'Sí, descontar',
      cancelText: 'Todavía no',
      onCancel: closeDialog,
      onConfirm: runPrepare,
    });
  };

  const note = validation.willDeductFromInventory
    ? `Al terminar se descontarán ${available} ${available === 1 ? 'ingrediente' : 'ingredientes'} de tu despensa`
    : 'No tienes estos ingredientes: no se descontará nada';

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 170 + insets.bottom }}>
        <RecipeCover
          banner={banner}
          imageUri={recipe.imageUri}
          isSaved={recipe.isSaved}
          topInset={insets.top}
          onBack={() => router.back()}
          onToggleSave={() => {
            toggleSave(recipe.id);
            setRecipe((r) => (r ? { ...r, isSaved: !r.isSaved } : r));
          }}
        />

        <View style={styles.content}>
          {/* ── Encabezado ── */}
          <View style={styles.intro}>
            <AiBadge label={`${recipe.matchScore} % coincide con tu despensa`} />
            <AppText weight="light" style={styles.title} accessibilityRole="header">
              {lead ? `${lead} ` : ''}
              <AppText weight="semibold">{emphasis}</AppText>
            </AppText>
            {!!recipe.description && (
              <AppText variant="body" color={colors.textSecondary} style={styles.description}>
                {recipe.description}
              </AppText>
            )}
            <View style={styles.stats}>
              <StatTile iconName="time-outline" value={recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : '—'} label="preparación" />
              <StatTile iconName="people-outline" value={recipe.servings ? String(recipe.servings) : '—'} label="porciones" />
              <StatTile
                value={DIFFICULTY_LABELS[recipe.difficulty] ?? DIFFICULTY_LABELS.easy}
                label="dificultad"
                tone={{ background: diff.background, text: diff.text }}
                top={<DifficultyMeter level={diff.level} segment={diff.segment} empty={colors.surface} />}
              />
            </View>
          </View>

          {/* ── Ingredientes ── */}
          <RecipeIngredientsCard
            available={available}
            total={total}
            rows={recipe.availableIngredients.map((i) => ({ id: i.id, name: i.name, quantity: qty(i), badge: expiryFor(i) }))}
          />
          {recipe.missingIngredients.length > 0 && (
            <MissingIngredientsCard
              rows={recipe.missingIngredients.map((i) => ({
                id: i.id,
                name: i.name,
                quantity: qty(i),
                optional: i.isOptional,
                substitutions: i.substitutions,
              }))}
              onAddToShopping={handleAddMissing}
            />
          )}

          {/* ── Pasos ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="sectionTitle" accessibilityRole="header">
                Pasos
                {steps.length > 0 ? (
                  <AppText weight="regular" color={colors.textSecondary}>{` · ${completedSteps.length} de ${steps.length}`}</AppText>
                ) : null}
              </AppText>
              <AiBadge label="Generados por IA" size="sm" />
            </View>

            {isLoadingSteps && <StepsLoading />}

            {stepsError && !isLoadingSteps && (
              <InlineErrorCard
                title="No pudimos generar los pasos"
                message="Revisa tu conexión. Los ingredientes de la receta siguen disponibles."
                onRetry={() => loadSteps(recipe)}
              />
            )}

            {!isLoadingSteps && !stepsError && steps.length === 0 && (
              <AppText variant="bodySmall" color={colors.textSecondary}>
                Esta receta aún no tiene pasos.
              </AppText>
            )}

            {steps.map((s, i) => (
              <StepItem
                key={i}
                index={i + 1}
                text={s}
                state={completedSteps.includes(i) ? 'done' : i === currentStep ? 'current' : 'pending'}
                onPress={() => toggleStep(i)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <StickyActionBar note={note} bottomInset={insets.bottom}>
        <PrimaryButton title="Preparar receta" onPress={handleFinishCooking} isLoading={isFinishing} style={styles.cta} />
      </StickyActionBar>

      <M3Dialog
        visible={dialog.visible}
        title={dialog.title}
        titleEmphasis={dialog.titleEmphasis}
        message={dialog.message}
        type={dialog.type}
        iconName={dialog.iconName}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  content: {
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.background,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.screenGutter,
    gap: spacing.xxl,
  },
  intro: {
    gap: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.tertiaryContainer,
  },
  flex: {
    flex: 1,
  },
  cta: {
    minHeight: 56,
  },
});
