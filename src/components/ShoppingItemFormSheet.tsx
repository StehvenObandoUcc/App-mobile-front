import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { TextInput } from './Text';
import { IconButton } from './IconButton';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { Chip } from './Chip';
import { QuantityStepper } from './QuantityStepper';
import { DialogTitle } from './DialogTitle';
import { M3Dialog } from './M3Dialog';
import { IngredientCategory, IngredientUnit } from '../types';
import { colors, radii, spacing, typography, elevations, CATEGORY_LIST } from '../theme';
import { unitFullLabel } from '../utils/units';

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

const UNIT_OPTIONS: { key: IngredientUnit; label: string }[] = [
  { key: 'units', label: 'unid.' },
  { key: 'grams', label: 'g' },
  { key: 'kilograms', label: 'kg' },
  { key: 'milliliters', label: 'ml' },
  { key: 'liters', label: 'L' },
  { key: 'package', label: 'paquete' },
];

export function ShoppingItemFormSheet({ visible, values, onChange, onSubmit, onClose }: ShoppingItemFormSheetProps) {
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(false);
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
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel="Cerrar formulario" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <DialogTitle title="Nuevo" emphasis="producto" size={24} lineHeight={30} />
              </View>
              <IconButton iconName="close" variant="neutral" accessibilityLabel="Cerrar formulario de nuevo producto" onPress={requestClose} style={styles.closeBtn} />
            </View>

            <View style={styles.field}>
              <AppText variant="bodySmall" weight="semibold">
                Nombre
              </AppText>
              <TextInput
                value={values.name}
                onChangeText={(v) => onChange('name', v)}
                placeholder="Ej. Leche, tomates, huevos"
                placeholderTextColor={colors.textMuted}
                maxLength={60}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, focused && styles.inputFocused]}
                accessibilityLabel="Nombre del producto"
                returnKeyType="done"
              />
            </View>

            <View style={styles.qtyRow}>
              <AppText variant="bodySmall" weight="semibold" style={styles.flex}>
                Cantidad
              </AppText>
              <QuantityStepper value={values.quantity} onChange={(v) => onChange('quantity', v)} />
            </View>

            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Unidad">
              {UNIT_OPTIONS.map((u) => (
                <Chip
                  key={u.key}
                  variant="choice"
                  label={u.label}
                  accessibilityLabel={unitFullLabel(u.key)}
                  selected={values.unit === u.key}
                  onPress={() => onChange('unit', u.key)}
                />
              ))}
            </View>

            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Categoría">
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

            <View style={styles.actions}>
              <SecondaryButton title="Cancelar" variant="outline" onPress={requestClose} style={styles.flex} />
              <PrimaryButton title="Guardar" iconName="checkmark" onPress={onSubmit} style={styles.flex} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <M3Dialog
        visible={confirmExit}
        type="warning"
        title="Este producto"
        titleEmphasis="no se ha guardado"
        message="Si sales ahora, lo que escribiste no se guardará."
        cancelText="Salir sin guardar"
        onCancel={() => {
          setConfirmExit(false);
          onClose();
        }}
        confirmText="Guardar"
        onConfirm={() => {
          setConfirmExit(false);
          onSubmit();
        }}
        onDismiss={() => setConfirmExit(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  content: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  field: {
    gap: 6,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});
