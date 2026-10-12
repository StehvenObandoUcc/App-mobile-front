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
  RecipePhotoCredit,
  StatTile,
  RecipeIngredientsCard,
  MissingIngredientsCard,
  StepItem,
  StickyActionBar,
  DifficultyMeter,
} from '../src/components';
import { validateRecipeIngredients } from '../src/utils/recipe-validation';
import { recipeBanner, splitRecipeTitle, cleanStepText } from '../src/utils/recipe-visuals';
import { formatQuantity } from '../src/utils/units';
import { daysUntil } from '../src/utils/dates';
import { spacing } from '../src/theme';
import { useTheme, makeStyles } from '../src/theme/ThemeProvider';
import { useI18n } from '../src/i18n';

type DialogState = {
  visible: boolean;
  title: string;
  titleEmphasis?: string;
  message: string;
  type?: 'neutral' | 'ai' | 'success' | 'warning' | 'error';
  iconName?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

/**
 * Detalle de receta — Receta-Detalle.dc.html.
 * Portada pastel con volver/guardar · coincidencia (IA) · título 300 + 600 · 3 fichas ·
 * ingredientes con progreso y «vence en N d» · faltantes con sustitutos · pasos con progreso
 * (hechos en salvia, el actual con anillo cacao) · barra fija «Preparar receta».
 * Sin «Volver a recetas» (decisión aprobada): se vuelve con la flecha de la portada.
 */
export default function RecipeDetailScreen() {
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const qty = (i: RecipeIngredient) => (i.quantity !== null ? formatQuantity(i.quantity, i.unit, { long: true }) : t('screensMain.recipeDetail.toTaste'));
  const styles = useStyles();
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
        setStepsError(err?.message || t('screensMain.recipeDetail.stepsErrorFallback'));
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
      if (d < 0) return { label: t('screensMain.recipeDetail.expired'), tone: colors.functional.expired };
      return { label: d === 0 ? t('screensMain.recipeDetail.expiresToday') : t('screensMain.recipeDetail.expiresIn', { count: d }), tone: colors.functional.expiringSoon };
    },
    [items, t]
  );

  const steps = useMemo(() => (recipe?.steps ?? []).map(cleanStepText), [recipe?.steps]);

  if (!recipe && notFound) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <EmptyState
          title={t('screensMain.recipeDetail.notFoundTitle')}
          titleEmphasis={t('screensMain.recipeDetail.notFoundEmphasis')}
          description={t('screensMain.recipeDetail.notFoundDesc')}
          iconName="restaurant-outline"
          tone="neutral"
          actionLabel={t('screensMain.recipeDetail.backToRecipes')}
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
          {t('screensMain.recipeDetail.loadingRecipe')}
        </AppText>
      </View>
    );
  }

  const validation = validateRecipeIngredients(recipe);
  const banner = recipeBanner(colors, recipe.id);
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
        title: t('screensMain.recipeDetail.addErrorTitle'),
        titleEmphasis: t('screensMain.recipeDetail.addErrorEmphasis'),
        message: t('screensMain.recipeDetail.addErrorMessage'),
        type: 'error',
        confirmText: t('common.gotIt'),
        onConfirm: closeDialog,
      });
      return;
    }
    setDialog({
      visible: true,
      title: t('screensMain.recipeDetail.addSuccessTitle'),
      titleEmphasis: t('screensMain.recipeDetail.addSuccessEmphasis'),
      message: res.mergedCount
        ? t('screensMain.recipeDetail.addedMerged', { added: tp('screensMain.recipeDetail.addedCount', res.addedCount), merged: res.mergedCount })
        : t('screensMain.recipeDetail.addedOnly', { added: tp('screensMain.recipeDetail.addedCount', res.addedCount) }),
      type: 'success',
      iconName: 'cart-outline',
      confirmText: t('screensMain.recipeDetail.goShopping'),
      cancelText: t('screensMain.recipeDetail.stayHere'),
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
          ? t('screensMain.recipeDetail.prepDeducted', { list: consumed.join(', ') })
          : t('screensMain.recipeDetail.prepNothing'),
        skipped.length > 0
          ? t('screensMain.recipeDetail.prepSkipped', { list: skipped.join(', ') })
          : '',
      ].filter(Boolean);
      setDialog({
        visible: true,
        title: t('screensMain.recipeDetail.enjoyTitle'),
        titleEmphasis: t('screensMain.recipeDetail.enjoyEmphasis'),
        message: parts.join('\n\n'),
        type: 'success',
        iconName: 'checkmark-circle-outline',
        confirmText: t('screensMain.recipeDetail.viewPantry'),
        onConfirm: () => {
          closeDialog();
          router.replace('/inventory');
        },
      });
    } catch {
      setDialog({
        visible: true,
        title: t('screensMain.recipeDetail.prepErrorTitle'),
        titleEmphasis: t('screensMain.recipeDetail.prepErrorEmphasis'),
        message: t('screensMain.recipeDetail.prepErrorMessage'),
        type: 'error',
        confirmText: t('common.gotIt'),
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
        title: t('screensMain.recipeDetail.enjoyTitle'),
        titleEmphasis: t('screensMain.recipeDetail.enjoyEmphasis'),
        message: validation.inventoryDeductionNotice,
        type: 'success',
        iconName: 'restaurant-outline',
        confirmText: t('screensMain.recipes.viewRecipes'),
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
      title: partial ? t('screensMain.recipeDetail.partialTitle') : t('screensMain.recipeDetail.doneTitle'),
      titleEmphasis: partial ? t('screensMain.recipeDetail.partialEmphasis') : t('screensMain.recipeDetail.doneEmphasis'),
      message: validation.inventoryDeductionNotice,
      type: 'neutral',
      iconName: partial ? undefined : 'restaurant-outline',
      confirmText: partial ? t('screensMain.recipeDetail.partialConfirm') : t('screensMain.recipeDetail.doneConfirm'),
      cancelText: t('screensMain.recipeDetail.notYet'),
      onCancel: closeDialog,
      onConfirm: runPrepare,
    });
  };

  const note = validation.willDeductFromInventory
    ? tp('screensMain.recipeDetail.deductNote', available)
    : t('screensMain.recipeDetail.noDeductNote');

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
        {recipe.imageUri && recipe.imageCredit ? <RecipePhotoCredit credit={recipe.imageCredit} /> : null}

        <View style={styles.content}>
          {/* ── Encabezado ── */}
          <View style={styles.intro}>
            <AiBadge label={t('screensMain.recipeDetail.matchLabel', { score: recipe.matchScore })} />
            <AppText variant="screenTitle" weight="light" accessibilityRole="header">
              {lead ? `${lead} ` : ''}
              <AppText weight="semibold">{emphasis}</AppText>
            </AppText>
            {!!recipe.description && (
              <AppText variant="body" color={colors.textSecondary}>
                {recipe.description}
              </AppText>
            )}
            <View style={styles.stats}>
              <StatTile iconName="time-outline" value={recipe.prepTimeMinutes ? t('screensMain.recipeDetail.minutes', { count: recipe.prepTimeMinutes }) : '—'} label={t('screensMain.recipeDetail.statPrep')} />
              <StatTile iconName="people-outline" value={recipe.servings ? String(recipe.servings) : '—'} label={t('screensMain.recipeDetail.statServings')} />
              <StatTile
                value={t(`screensMain.recipeDetail.difficulty.${recipe.difficulty}`)}
                label={t('screensMain.recipeDetail.statDifficulty')}
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
                {t('screensMain.recipeDetail.stepsTitle')}
                {steps.length > 0 ? (
                  <AppText weight="regular" color={colors.textSecondary}>{t('screensMain.recipeDetail.stepsProgress', { done: completedSteps.length, total: steps.length })}</AppText>
                ) : null}
              </AppText>
              <AiBadge label={t('screensMain.recipeDetail.aiGenerated')} size="sm" />
            </View>

            {isLoadingSteps && <StepsLoading />}

            {stepsError && !isLoadingSteps && (
              <InlineErrorCard
                title={t('screensMain.recipeDetail.stepsErrorTitle')}
                message={t('screensMain.recipeDetail.stepsErrorMessage')}
                onRetry={() => loadSteps(recipe)}
              />
            )}

            {!isLoadingSteps && !stepsError && steps.length === 0 && (
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {t('screensMain.recipeDetail.noSteps')}
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
        <PrimaryButton title={t('screensMain.recipeDetail.cookButton')} onPress={handleFinishCooking} isLoading={isFinishing} style={styles.cta} />
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

const useStyles = makeStyles((colors) => ({
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
}));
