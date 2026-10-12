import React from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { DialogTitle } from './DialogTitle';
import { OptionRow } from './OptionRow';
import { radii, spacing, elevations } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

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
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <DialogTitle title={title} emphasis={emphasis} />
          {!!description && (
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {description}
            </AppText>
          )}
          <ScrollView style={styles.list} accessibilityRole="radiogroup">
            {options.map((o) => (
              <OptionRow
                key={String(o.value)}
                label={o.label}
                hint={o.hint}
                selected={o.value === value}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
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
}));
