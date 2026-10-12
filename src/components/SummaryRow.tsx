import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { radii } from '../theme';
import { makeStyles } from '../theme/ThemeProvider';

/** SummaryRow — fila de desglose en diálogos de éxito: cifra grande + texto («3 alimentos nuevos»). */
export function SummaryRow({ value, label }: { value: number | string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${value} ${label}`}>
      <AppText variant="sectionTitle" weight="medium">
        {String(value)}
      </AppText>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radii.fields,
    backgroundColor: colors.m3.surfaceContainerLow,
  },
  label: {
    flex: 1,
  },
}));
