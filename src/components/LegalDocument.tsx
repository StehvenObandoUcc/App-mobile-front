import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../theme';

/** LegalDocument — tarjeta blanca con secciones numeradas (Legal.dc.html): título 17/24 600 y párrafo 15/23. */
export function LegalDocument({ sections }: { sections: { title: string; body: string }[] }) {
  return (
    <View style={styles.card}>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <AppText weight="semibold" style={styles.title} accessibilityRole="header">
            {s.title}
          </AppText>
          <AppText color={colors.textBody} style={styles.body}>
            {s.body}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 18,
  },
  section: {
    gap: 6,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
  },
});
