import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';
import { Chip } from './Chip';
import { QuantityStepper } from './QuantityStepper';
import { CategoryPicker } from './CategoryPicker';
import { DateField } from './DateField';
import { M3Dialog } from './M3Dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IngredientCategory, IngredientUnit } from '../types';
import { radii, spacing, typography, elevations } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * IngredientFormSheet — hoja «Añadir / Editar alimento» (Despensa-Formulario.dc.html).
 * El estado y la validación viven en la pantalla (Despensa, Resultado del escaneo).
 * - «Guardar» queda fijo abajo, siempre visible mientras se edita.
 * - Si hay cambios sin guardar y se intenta cerrar (✕, tocar fuera, atrás), avisa:
 *   «Guardar cambios» o «Salir sin guardar».
 */
export type IngredientFormValues = {
  name: string;
  quantity: string;
  unit: IngredientUnit;
  category: IngredientCategory;
  expirationDate: string; // 'YYYY-MM-DD' o ''
};

export type IngredientFormSheetProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  values: IngredientFormValues;
  onChange: <K extends keyof IngredientFormValues>(key: K, value: IngredientFormValues[K]) => void;
  onSubmit: () => void;
  onClose: () => void;
  onOpenCalendar: () => void;
  onDelete?: () => void;
};

const NAME_MAX = 60;

// Etiquetas cortas de las opciones de unidad (el lector de pantalla usa el nombre completo).
const UNIT_OPTIONS: { key: IngredientUnit; label: string; full: string }[] = [
  { key: 'units', label: 'sheets.ingredientForm.unit.units', full: 'sheets.ingredientForm.unitFull.units' },
  { key: 'grams', label: 'sheets.ingredientForm.unit.grams', full: 'sheets.ingredientForm.unitFull.grams' },
  { key: 'kilograms', label: 'sheets.ingredientForm.unit.kilograms', full: 'sheets.ingredientForm.unitFull.kilograms' },
  { key: 'milliliters', label: 'sheets.ingredientForm.unit.milliliters', full: 'sheets.ingredientForm.unitFull.milliliters' },
  { key: 'liters', label: 'sheets.ingredientForm.unit.liters', full: 'sheets.ingredientForm.unitFull.liters' },
  { key: 'package', label: 'sheets.ingredientForm.unit.package', full: 'sheets.ingredientForm.unitFull.package' },
  { key: 'unknown', label: 'sheets.ingredientForm.unit.unknown', full: 'sheets.ingredientForm.unitFull.unknown' },
];

export function IngredientFormSheet({
  visible,
  mode,
  values,
  onChange,
  onSubmit,
  onClose,
  onOpenCalendar,
  onDelete,
}: IngredientFormSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
  const [nameFocused, setNameFocused] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const insets = useSafeAreaInsets();

  // Foto de los valores al abrir: si cambian, hay algo sin guardar.
  const initialRef = useRef<string>('');
  useEffect(() => {
    if (visible) {
      initialRef.current = JSON.stringify(values);
      setConfirmExit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const isDirty = visible && JSON.stringify(values) !== initialRef.current;

  const requestClose = () => {
    if (isDirty) setConfirmExit(true);
    else onClose();
  };
  const submitLabel = t(mode === 'edit' ? 'sheets.ingredientForm.submitEdit' : 'sheets.ingredientForm.submitAdd');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={requestClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel={t('sheets.ingredientForm.closeFormA11y')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />

          <View style={styles.header}>
            <AppText weight="light" style={styles.title} accessibilityRole="header">
              {mode === 'edit' ? t('sheets.ingredientForm.titleEdit') : t('sheets.ingredientForm.titleAdd')}{' '}
              <AppText weight="semibold">{t('sheets.ingredientForm.titleEmphasis')}</AppText>
            </AppText>
            <IconButton iconName="close" variant="neutral" accessibilityLabel={t('common.close')} onPress={requestClose} style={styles.closeBtn} />
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Nombre ── */}
            <View style={styles.field}>
              <AppText variant="bodySmall" weight="semibold">
                {t('sheets.ingredientForm.nameLabel')} <AppText color={colors.error.text}>*</AppText>
              </AppText>
              <TextInput
                value={values.name}
                onChangeText={(v) => onChange('name', v)}
                placeholder={t('sheets.ingredientForm.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={NAME_MAX}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                style={[styles.input, nameFocused && styles.inputFocused]}
                accessibilityLabel={t('sheets.ingredientForm.nameA11y')}
                returnKeyType="done"
              />
              <View style={styles.helperRow}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t('sheets.ingredientForm.nameHelper')}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>{`${values.name.length}/${NAME_MAX}`}</AppText>
              </View>
            </View>

            {/* ── Cantidad + unidad ── */}
            <View style={styles.fieldWide}>
              <AppText variant="bodySmall" weight="semibold">
                {t('sheets.ingredientForm.quantity')}
              </AppText>
              <QuantityStepper value={values.quantity} onChange={(v) => onChange('quantity', v)} />
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('sheets.ingredientForm.unitA11y')}>
                {UNIT_OPTIONS.map((u) => (
                  <Chip
                    key={u.key}
                    variant="choice"
                    label={t(u.label)}
                    accessibilityLabel={t(u.full)}
                    selected={values.unit === u.key}
                    onPress={() => onChange('unit', u.key)}
                  />
                ))}
              </View>
            </View>

            {/* ── Categoría ── */}
            <View style={styles.fieldWide}>
              <AppText variant="bodySmall" weight="semibold">
                {t('sheets.ingredientForm.category')}
              </AppText>
              <CategoryPicker value={values.category} onChange={(c) => onChange('category', c)} />
            </View>

            {/* ── Vencimiento ── */}
            <View style={styles.fieldWide}>
              <AppText variant="bodySmall" weight="semibold">
                {t('sheets.ingredientForm.expiration')}
              </AppText>
              <DateField
                value={values.expirationDate}
                onChange={(v) => onChange('expirationDate', v)}
                onOpenCalendar={onOpenCalendar}
              />
            </View>

            {mode === 'edit' && onDelete && (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.deletePressed]}
                accessibilityRole="button"
                accessibilityLabel={t('sheets.ingredientForm.deleteLabel')}
              >
                <Ionicons name="trash-outline" size={18} color={colors.m3.onErrorContainer} />
                <AppText variant="body" weight="semibold" color={colors.m3.onErrorContainer}>
                  {t('sheets.ingredientForm.deleteLabel')}
                </AppText>
              </Pressable>
            )}
          </ScrollView>

          {/* Pie fijo: «Guardar» siempre a la vista */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <PrimaryButton title={submitLabel} onPress={onSubmit} style={styles.submit} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <M3Dialog
        visible={confirmExit}
        type="warning"
        title={t(mode === 'edit' ? 'sheets.ingredientForm.exit.titleEdit' : 'sheets.ingredientForm.exit.titleAdd')}
        titleEmphasis={t(mode === 'edit' ? 'sheets.ingredientForm.exit.emphasisEdit' : 'sheets.ingredientForm.exit.emphasisAdd')}
        message={t(mode === 'edit' ? 'sheets.ingredientForm.exit.messageEdit' : 'sheets.ingredientForm.exit.messageAdd')}
        cancelText={t('sheets.ingredientForm.exit.leave')}
        onCancel={() => {
          setConfirmExit(false);
          onClose();
        }}
        confirmText={t(mode === 'edit' ? 'sheets.ingredientForm.submitEdit' : 'common.save')}
        onConfirm={() => {
          setConfirmExit(false);
          onSubmit();
        }}
        onDismiss={() => setConfirmExit(false)}
      />
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '92%',
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
    gap: spacing.sm,
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 26,
    lineHeight: 32,
  },
  closeBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 18,
  },
  field: {
    gap: 6,
  },
  fieldWide: {
    gap: 8,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: 15,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
  },
  footer: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.m3.outlineVariant,
    backgroundColor: colors.surface,
  },
  submit: {
    minHeight: 56,
  },
  deleteBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.error.background,
  },
  deletePressed: {
    opacity: 0.85,
  },
}));
