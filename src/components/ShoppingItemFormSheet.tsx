import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { LabeledField } from './LabeledField';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { Chip } from './Chip';
import { QuantityStepper } from './QuantityStepper';
import { DialogTitle } from './DialogTitle';
import { M3Dialog } from './M3Dialog';
import { IngredientCategory, IngredientUnit } from '../types';
import { radii, spacing, elevations, CATEGORY_LIST } from '../theme';
import { makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * ShoppingItemFormSheet — «Nuevo producto» de Compras (Compras-Agregar.dc.html · derecha).
 * Nombre · Cantidad (stepper a la derecha) · unidad · categoría (pastel + anillo) · Cancelar | Guardar.
 * Si hay cambios sin guardar y se intenta cerrar, avisa («Guardar» / «Salir sin guardar»).
 */
export type ShoppingItemFormValues = {
  name: string;
  quantity: string;
  unit: IngredientUnit;
  category: IngredientCategory;
};

export type ShoppingItemFormSheetProps = {
  visible: boolean;
  values: ShoppingItemFormValues;
  onChange: <K extends keyof ShoppingItemFormValues>(key: K, value: ShoppingItemFormValues[K]) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const UNIT_OPTIONS: { key: IngredientUnit; label: string; full: string }[] = [
  { key: 'units', label: 'sheets.shoppingItemForm.unit.units', full: 'sheets.shoppingItemForm.unitFull.units' },
  { key: 'grams', label: 'sheets.shoppingItemForm.unit.grams', full: 'sheets.shoppingItemForm.unitFull.grams' },
  { key: 'kilograms', label: 'sheets.shoppingItemForm.unit.kilograms', full: 'sheets.shoppingItemForm.unitFull.kilograms' },
  { key: 'milliliters', label: 'sheets.shoppingItemForm.unit.milliliters', full: 'sheets.shoppingItemForm.unitFull.milliliters' },
  { key: 'liters', label: 'sheets.shoppingItemForm.unit.liters', full: 'sheets.shoppingItemForm.unitFull.liters' },
  { key: 'package', label: 'sheets.shoppingItemForm.unit.package', full: 'sheets.shoppingItemForm.unitFull.package' },
];

export function ShoppingItemFormSheet({ visible, values, onChange, onSubmit, onClose }: ShoppingItemFormSheetProps) {
  const { t } = useI18n();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [confirmExit, setConfirmExit] = useState(false);
  const initialRef = useRef('');

  useEffect(() => {
    if (visible) {
      initialRef.current = JSON.stringify(values);
      setConfirmExit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const requestClose = () => {
    if (visible && JSON.stringify(values) !== initialRef.current) setConfirmExit(true);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={requestClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel={t('sheets.shoppingItemForm.closeFormA11y')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <DialogTitle title={t('sheets.shoppingItemForm.title')} emphasis={t('sheets.shoppingItemForm.titleEmphasis')} />
              </View>
              <IconButton iconName="close" variant="neutral" accessibilityLabel={t('sheets.shoppingItemForm.closeA11y')} onPress={requestClose} style={styles.closeBtn} />
            </View>

            <LabeledField
              label={t('sheets.shoppingItemForm.nameLabel')}
              value={values.name}
              onChangeText={(v) => onChange('name', v)}
              placeholder={t('sheets.shoppingItemForm.namePlaceholder')}
              maxLength={60}
              accessibilityLabel={t('sheets.shoppingItemForm.nameA11y')}
              returnKeyType="done"
            />

            <View style={styles.qtyRow}>
              <AppText variant="bodySmall" weight="semibold" style={styles.flex}>
                {t('sheets.shoppingItemForm.quantity')}
              </AppText>
              <QuantityStepper value={values.quantity} onChange={(v) => onChange('quantity', v)} />
            </View>

            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('sheets.shoppingItemForm.unitA11y')}>
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

            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('sheets.shoppingItemForm.categoryA11y')}>
              {CATEGORY_LIST.map((c) => (
                <Chip
                  key={c.key}
                  variant="category"
                  category={c.key}
                  icon={c.icon}
                  label={c.label}
                  selected={values.category === c.key}
                  onPress={() => onChange('category', c.key)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Pie fijo: «Cancelar» y «Guardar» siempre a la vista (como IngredientFormSheet) */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <SecondaryButton title={t('common.cancel')} variant="outline" onPress={requestClose} style={styles.flex} />
            <PrimaryButton title={t('common.save')} iconName="checkmark" onPress={onSubmit} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <M3Dialog
        visible={confirmExit}
        type="error"
        title={t('sheets.shoppingItemForm.exit.title')}
        titleEmphasis={t('sheets.shoppingItemForm.exit.emphasis')}
        message={t('sheets.shoppingItemForm.exit.message')}
        cancelText={t('sheets.shoppingItemForm.exit.leave')}
        onCancel={() => {
          setConfirmExit(false);
          onClose();
        }}
        confirmText={t('common.save')}
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
  flex: { flex: 1 },
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
    backgroundColor: colors.m3.outline,
  },
  body: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.m3.outlineVariant,
    backgroundColor: colors.surface,
  },
}));
