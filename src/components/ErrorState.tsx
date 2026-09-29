import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { SecondaryButton } from './SecondaryButton';
import { IllustrationBlob } from './IllustrationBlob';
import { colors, spacing } from '../theme';

/**
 * ErrorState — Componentes.dc.html / Despensa-Estados.dc.html
 * Mancha chile + alerta, título 300 con énfasis 600, mensaje y «Reintentar» con borde.
 */
export type ErrorStateProps = {
  title?: string;
  titleEmphasis?: string;
  message: string;
  onRetry: () => void;
};

export function ErrorState({ title: titleProp, titleEmphasis: emphasisProp, message, onRetry }: ErrorStateProps) {
  // Si la pantalla pasa su propio título, no se le agrega el énfasis por defecto.
  const title = titleProp ?? 'Algo salió';
  const titleEmphasis = titleProp === undefined ? emphasisProp ?? 'mal' : emphasisProp;
  return (
    <View style={styles.container} accessibilityRole="alert">
      <IllustrationBlob iconName="alert-circle-outline" tone="error" size="md" />
      <AppText variant="headline" weight="light" align="center">
        {title}
        {titleEmphasis ? <AppText weight="semibold">{` ${titleEmphasis}`}</AppText> : null}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} align="center" style={styles.message}>
        {message}
      </AppText>
      <View style={styles.actions}>
        <SecondaryButton title="Reintentar" iconName="refresh-outline" variant="outline" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
});
