import React from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { DialogTitle } from './DialogTitle';
import { colors, radii, spacing, elevations } from '../theme';

/** OptionSheet — hoja para elegir una opción (Configuración: dieta, porciones, días…). Filas de 56 con radio. */
export type OptionSheetProps<V extends string | number | null> = {
  visible: boolean;
  title: string;
  emphasis?: string;
  description?: string;
  options: { value: V; label: string; hint?: string }[];
  value: V;
  onSelect: (value: V) => void;
  onClose: () => void;
};

export function OptionSheet<V extends string | number | null>({ visible, title, emphasis, description, options, value, onSelect, onClose }: OptionSheetProps<V>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <DialogTitle title={title} emphasis={emphasis} size={24} lineHeight={30} />
          {!!description && (
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {description}
            </AppText>
          )}
          <ScrollView style={styles.list} accessibilityRole="radiogroup">
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={String(o.value)}
                  onPress={() => {
                    onSelect(o.value);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={o.hint ? `${o.label}. ${o.hint}` : o.label}
                >
                  <View style={styles.texts}>
                    <AppText variant="body" weight={selected ? 'semibold' : 'regular'}>
                      {o.label}
                    </AppText>
                    {!!o.hint && (
                      <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
                        {o.hint}
                      </AppText>
                    )}
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected && <Ionicons name="checkmark" size={14} color={colors.onInk} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.containers,
    borderTopRightRadius: radii.containers,
    paddingTop: 10,
    paddingHorizontal: spacing.screenGutter,
    gap: 10,
    ...elevations.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.m3.outline,
    marginBottom: 6,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.fields,
  },
  rowSelected: {
    backgroundColor: colors.surfaceVariant,
  },
  rowPressed: {
    backgroundColor: colors.m3.surfaceContainer,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.m3.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
