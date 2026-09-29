import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PrimaryButton, ButtonTone } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { IllustrationBlob, BlobTone } from './IllustrationBlob';
import { colors, spacing } from '../theme';

/**
 * EmptyState — Componentes.dc.html / Despensa-Estados.dc.html
 * Ilustración pastel + título 300 con énfasis 600 + descripción + hasta 2 botones a lo ancho.
 * `title` se muestra fino; `titleEmphasis` (opcional) va en seminegrita al final: «Tu despensa está **vacía**».
 */
export type EmptyStateProps = {
  title: string;
  titleEmphasis?: string;
  description: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: BlobTone;
  actionLabel?: string;
  onAction?: () => void;
  /** 'ink' (defecto) · 'brand' (escanear) · 'ai' · 'tint' (durazno, p. ej. «Agregar "mango"») */
  actionTone?: ButtonTone | 'tint';
  actionIconName?: keyof typeof Ionicons.glyphMap;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function EmptyState({
  title,
  titleEmphasis,
  description,
  iconName = 'basket-outline',
  tone = 'fresh',
  actionLabel,
  onAction,
  actionTone = 'ink',
  actionIconName,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  const hasPrimary = Boolean(actionLabel && onAction);
  const hasSecondary = Boolean(secondaryActionLabel && onSecondaryAction);

  return (
    <View style={styles.container}>
      <IllustrationBlob iconName={iconName} tone={tone} size="lg" />
      <AppText variant="headline" weight="light" align="center" style={styles.title}>
        {title}
        {titleEmphasis ? <AppText weight="semibold">{` ${titleEmphasis}`}</AppText> : null}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} align="center" style={styles.description}>
        {description}
      </AppText>
      {(hasPrimary || hasSecondary) && (
        <View style={styles.actions}>
          {hasPrimary &&
            (actionTone === 'tint' ? (
              <SecondaryButton title={actionLabel!} onPress={onAction!} iconName={actionIconName} />
            ) : (
              <PrimaryButton title={actionLabel!} onPress={onAction!} tone={actionTone} iconName={actionIconName} />
            ))}
          {hasSecondary && (
            <SecondaryButton title={secondaryActionLabel!} onPress={onSecondaryAction!} variant="outline" />
          )}
        </View>
      )}
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
  title: {
    marginTop: 2,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 6,
  },
});
