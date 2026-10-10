import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';
import { Chip } from './Chip';
import { FocusFolders, FocusFolderOption } from './FocusFolders';
import { StaggerView } from './StaggerView';
import { IngredientToggleChip } from './IngredientToggleChip';
import { DifficultyPicker } from './DifficultyPicker';
import { OptionPills } from './OptionPills';
import { SegmentedControl } from './SegmentedControl';
import { Ingredient, RecipeDifficulty, DietaryPreference, DIETARY_OPTIONS, RecipeFocus, RECIPE_FOCUS_OPTIONS } from '../types';
import { radii, spacing, typography, elevations, getCategoryConfig } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';
import { daysUntil } from '../utils/dates';
import { useI18n, type t as TFn } from '../i18n';

/**
 * ChefIaSheet — hoja «Chef IA» (Chef-IA.dc.html). Solo presentación: el estado vive en app/recipes.tsx.
 * Enfoque en carpetas · ingredientes (los que vencen primero, ya marcados) · dieta · dificultad ·
 * tiempo · cantidad · botón fijo frambuesa «Generar N recetas con IA».
 */
export type ChefIaValues = {
  focus: RecipeFocus;
  ingredientIds: Set<string>;
  diet: DietaryPreference;
  difficulty: RecipeDifficulty;
  time: number;
  count: number;
  styleTag: string | null;
  note: string;
};

export type ChefIaSheetProps = {
  visible: boolean;
  isGenerating: boolean;
  ingredients: Ingredient[];
  values: ChefIaValues;
  onChange: <K extends keyof ChefIaValues>(key: K, value: ChefIaValues[K]) => void;
  onToggleIngredient: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  validTimes: number[];
  timeHint?: string | null;
  /** Aviso de coherencia (p. ej. solo condimentos). */
  coherence?: { message: string; isWarning: boolean } | null;
  styleOptions: readonly { key: string; label: string; iconName: keyof typeof Ionicons.glyphMap }[];
  onGenerate: () => void;
  onClose: () => void;
};

const focusTonesFor = (colors: ThemeColors): Record<RecipeFocus, { background: string; text: string }> => ({
  custom: { background: colors.tertiaryContainer, text: colors.onTertiaryContainer },
  quick: { background: colors.functional.expiringSoon.background, text: colors.functional.expiringSoon.text },
  waste_reduction: { background: colors.functional.fresh.background, text: colors.functional.fresh.text },
});
const FOCUS_TITLE_KEYS: Record<RecipeFocus, string> = {
  custom: 'sheets.chefIa.focusTitle.custom',
  quick: 'sheets.chefIa.focusTitle.quick',
  waste_reduction: 'sheets.chefIa.focusTitle.waste_reduction',
};
// Orden del mockup: las lengüetas de arriba y la elegida desplegada abajo.
const FOCUS_ORDER: RecipeFocus[] = ['custom', 'quick', 'waste_reduction'];
const focusOptionsFor = (colors: ThemeColors, t: typeof TFn): FocusFolderOption<RecipeFocus>[] => FOCUS_ORDER.map((key) => {
  const base = RECIPE_FOCUS_OPTIONS.find((o) => o.key === key)!;
  return { key, title: t(FOCUS_TITLE_KEYS[key]), description: base.description, iconName: base.iconName, tone: focusTonesFor(colors)[key] };
});

const TIMES = [15, 20, 30, 45, 60];
const VISIBLE_INGREDIENTS = 7;

export function ChefIaSheet({
  visible,
  isGenerating,
  ingredients,
  values,
  onChange,
  onToggleIngredient,
  onSelectAll,
  onClearAll,
  validTimes,
  timeHint,
  coherence,
  styleOptions,
  onGenerate,
  onClose,
}: ChefIaSheetProps) {
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);

  // Los que vencen pronto aparecen primero (sin fecha al final).
  const sorted = [...ingredients].sort((a, b) => {
    const da = daysUntil(a.expirationDate);
    const db = daysUntil(b.expirationDate);
    if (da === null && db === null) return a.name.localeCompare(b.name, 'es');
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
  const shown = showAll ? sorted : sorted.slice(0, VISIBLE_INGREDIENTS);
  const hidden = sorted.length - shown.length;
  const canClose = !isGenerating;
  const close = () => canClose && onClose();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} disabled={!canClose} accessibilityLabel={t('sheets.chefIa.closeChefA11y')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={24} color={colors.m3.onTertiary} />
            </View>
            <AppText weight="light" style={styles.title} accessibilityRole="header">
              {t('sheets.chefIa.title')} <AppText weight="semibold">{t('sheets.chefIa.titleEmphasis')}</AppText>
            </AppText>
            <IconButton
              iconName="close"
              variant="neutral"
              accessibilityLabel={t('common.close')}
              onPress={close}
              disabled={!canClose}
              style={styles.closeBtn}
            />
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Enfoque ── */}
            <StaggerView index={0} delayMs={70} duration={320} style={styles.section}>
              <AppText variant="body" weight="semibold" style={styles.label}>
                {t('sheets.chefIa.focusQuestion')}
              </AppText>
              <FocusFolders options={focusOptionsFor(colors, t)} value={values.focus} onChange={(f) => onChange('focus', f)} />
              {values.focus === 'custom' && (
                // Aparece después de que las cartas terminan de moverse, y los estilos entran uno a uno.
                <StaggerView index={3} delayMs={60} duration={300} style={styles.custom}>
                  <View style={styles.wrap}>
                    {styleOptions.map((o, i) => (
                      <StaggerView key={o.key} index={i + 4} delayMs={45} duration={260}>
                      <Chip
                        variant="choice"
                        label={o.label}
                        icon={o.iconName}
                        selected={values.styleTag === o.key}
                        onPress={() => onChange('styleTag', values.styleTag === o.key ? null : o.key)}
                      />
                      </StaggerView>
                    ))}
                  </View>
                  <TextInput
                    value={values.note}
                    onChangeText={(v) => onChange('note', v)}
                    placeholder={t('sheets.chefIa.notePlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    maxLength={60}
                    style={styles.noteInput}
                    accessibilityLabel={t('sheets.chefIa.noteA11y')}
                    returnKeyType="done"
                  />
                </StaggerView>
              )}
            </StaggerView>

            {/* ── Ingredientes ── */}
            <StaggerView index={1} delayMs={70} duration={320} style={styles.section}>
              <View style={styles.rowBetween}>
                <AppText variant="body" weight="semibold" style={styles.label}>
                  {t('sheets.chefIa.ingredientsLabel')}{' '}
                  <AppText weight="regular" color={colors.textSecondary}>{t('sheets.chefIa.ingredientsCount', { selected: values.ingredientIds.size, total: ingredients.length })}</AppText>
                </AppText>
                {ingredients.length > 0 && (
                  <View style={styles.links}>
                    <Pressable onPress={onSelectAll} style={styles.link} accessibilityRole="button" accessibilityLabel={t('sheets.chefIa.selectAllA11y')}>
                      <AppText variant="bodySmall" weight="semibold" color={colors.primary}>{t('sheets.chefIa.all')}</AppText>
                    </Pressable>
                    <Pressable onPress={onClearAll} style={styles.link} accessibilityRole="button" accessibilityLabel={t('sheets.chefIa.clearAllA11y')}>
                      <AppText variant="bodySmall" weight="semibold" color={colors.primary}>{t('sheets.chefIa.none')}</AppText>
                    </Pressable>
                  </View>
                )}
              </View>
              {ingredients.length === 0 ? (
                <AppText variant="bodySmall" color={colors.textSecondary}>
                  {t('sheets.chefIa.emptyPantry')}
                </AppText>
              ) : (
                <>
                  <View style={styles.wrap}>
                    {shown.map((ing) => (
                      <IngredientToggleChip
                        key={ing.id}
                        label={ing.name}
                        iconName={getCategoryConfig(ing.category).icon}
                        daysLeft={daysUntil(ing.expirationDate)}
                        selected={values.ingredientIds.has(ing.id)}
                        onToggle={() => onToggleIngredient(ing.id)}
                      />
                    ))}
                    {hidden > 0 && (
                      <Pressable
                        onPress={() => setShowAll(true)}
                        style={({ pressed }) => [styles.more, pressed && { opacity: 0.8 }]}
                        accessibilityRole="button"
                        accessibilityLabel={t('sheets.chefIa.showMoreA11y', { count: hidden })}
                      >
                        <AppText variant="bodySmall" weight="semibold">{t('sheets.chefIa.more', { count: hidden })}</AppText>
                      </Pressable>
                    )}
                  </View>
                  <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
                    {t('sheets.chefIa.expiringHint')}
                  </AppText>
                  {values.ingredientIds.size === 0 && (
                    <Hint text={t('sheets.chefIa.pickOneHint')} warning />
                  )}
                  {coherence && <Hint text={coherence.message} warning={coherence.isWarning} />}
                </>
              )}
            </StaggerView>

            {/* ── Dieta ── */}
            <StaggerView index={2} delayMs={70} duration={320} style={styles.section}>
              <AppText variant="body" weight="semibold" style={styles.label}>
                {t('sheets.chefIa.dietLabel')}
              </AppText>
              <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={t('sheets.chefIa.dietLabel')}>
                {DIETARY_OPTIONS.map((d) => (
                  <Chip key={d.key} variant="choice" label={t(`common.diets.${d.key}`)} selected={values.diet === d.key} onPress={() => onChange('diet', d.key)} />
                ))}
              </View>
            </StaggerView>

            {/* ── Dificultad ── */}
            <StaggerView index={3} delayMs={70} duration={320} style={styles.section}>
              <AppText variant="body" weight="semibold" style={styles.label}>
                {t('sheets.chefIa.difficultyLabel')}
              </AppText>
              <DifficultyPicker value={values.difficulty} onChange={(d) => onChange('difficulty', d)} />
            </StaggerView>

            {/* ── Tiempo ── */}
            <StaggerView index={4} delayMs={70} duration={320} style={styles.section}>
              <AppText variant="body" weight="semibold" style={styles.label}>
                {t('sheets.chefIa.timeLabel')}
              </AppText>
              <OptionPills
                accessibilityLabel={t('sheets.chefIa.timeA11y')}
                value={values.time}
                onChange={(v) => onChange('time', v)}
                options={TIMES.map((m) => ({
                  value: m,
                  label: `${m}′`,
                  accessibilityLabel: t('sheets.chefIa.minutesA11y', { count: m }),
                  disabled: !validTimes.includes(m),
                }))}
              />
              {timeHint ? <Hint text={timeHint} warning icon="time-outline" /> : null}
            </StaggerView>

            {/* ── Cantidad ── */}
            <StaggerView index={5} delayMs={70} duration={320} style={styles.section}>
              <AppText variant="body" weight="semibold" style={styles.label}>
                {t('sheets.chefIa.howManyLabel')}
              </AppText>
              <SegmentedControl
                accessibilityLabel={t('sheets.chefIa.countA11y')}
                value={values.count}
                onChange={(c) => onChange('count', c)}
                options={[1, 2, 3].map((n) => ({ value: n, label: String(n), accessibilityLabel: tp('sheets.chefIa.recipes', n) }))}
              />
            </StaggerView>
          </ScrollView>

          {/* ── Botón fijo ── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
            <PrimaryButton
              tone="ai"
              iconName="sparkles"
              title={tp('sheets.chefIa.generate', values.count)}
              onPress={onGenerate}
              isLoading={isGenerating}
              disabled={values.ingredientIds.size === 0}
              style={styles.cta}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Hint({ text, warning, icon }: { text: string; warning?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fg = warning ? colors.functional.expiringSoon.text : colors.tertiary;
  return (
    <View style={styles.hint}>
      <Ionicons name={icon ?? (warning ? 'alert-circle-outline' : 'sparkles-outline')} size={16} color={fg} />
      <AppText variant="metadata" weight="regular" color={fg} style={styles.hintText}>
        {text}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    height: '94%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.containers,
    borderTopRightRadius: radii.containers,
    paddingTop: 10,
    ...elevations.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.sm,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
  },
  closeBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  links: {
    flexDirection: 'row',
  },
  link: {
    height: spacing.touchTargetMin,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  more: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
  },
  custom: {
    gap: 10,
    marginTop: 4,
  },
  noteInput: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    flex: 1,
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: spacing.screenGutter,
    borderTopWidth: 1,
    borderTopColor: colors.m3.surfaceContainer,
    backgroundColor: colors.surface,
  },
  cta: {
    minHeight: 56,
  },
}));
