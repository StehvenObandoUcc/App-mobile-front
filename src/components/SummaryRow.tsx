import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/** SummaryRow — fila de desglose en diálogos de éxito: cifra grande + texto («3 alimentos nuevos»). */
export function SummaryRow({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${value} ${label}`}>
      <AppText weight="medium" style={styles.value}>
        {String(value)}
      </AppText>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radii.fields,
    backgroundColor: colors.m3.surfaceContainerLow,
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
});
