import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii, spacing } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

/**
 * OptionRow — fila de opción única (radio) de las hojas de selección: etiqueta, pista opcional y círculo de marca.
 * Rol «radio», estado marcado y objetivo táctil de al menos 48 dp (56 dp de alto visual).
 */
export type OptionRowProps = {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function OptionRow({ label, hint, selected, onPress, accessibilityLabel }: OptionRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? (hint ? `${label}. ${hint}` : label)}
    >
      <View style={styles.texts}>
        <AppText variant="body" weight={selected ? 'semibold' : 'regular'}>
          {label}
        </AppText>
        {!!hint && (
          <AppText variant="metadata" weight="regular" color={colors.textSecondary}>
            {hint}
          </AppText>
        )}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <Ionicons name="checkmark" size={14} color={colors.onInk} />}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
}));
