import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * CountBadge (NUEVO) — contador numérico (nav de Compras, avisos).
 * Fundamentos.dc.html: 20 dp de alto, acento #E86B45 con texto cacao, micro 11/700.
 */
export type CountBadgeProps = {
  count: number;
  /** Tope visible: 99 → «99+». */
  max?: number;
};

export function CountBadge({ count, max = 99 }: CountBadgeProps) {
  if (count <= 0) return null;
  const text = count > max ? `${max}+` : String(count);
  return (
    <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AppText variant="micro" color={colors.ink} align="center">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 20,
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: radii.circular,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
