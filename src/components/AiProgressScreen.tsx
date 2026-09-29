import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { SecondaryButton } from './SecondaryButton';
import { HeroArt } from './HeroArt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme';

/**
 * AiProgressScreen — pantalla completa de «IA trabajando» por pasos (Recetas-Estados.dc.html · A).
 * Se reutiliza en el Escaneo («Analizando»). Los pasos se completan uno a uno cada `stepMs`;
 * el último queda activo (girando) hasta que la pantalla se cierra.
 * Sin `onCancel` no hay salida hasta terminar (decisión para el Escaneo).
 */
export type AiProgressScreenProps = {
  visible: boolean;
  title: string;
  emphasis: string;
  steps: string[];
  iconName?: keyof typeof Ionicons.glyphMap;
  stepMs?: number;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Píldora superior (p. ej. QuotaPill «Foto 3 de 5 de prueba»). */
  topSlot?: React.ReactNode;
  /** Nota bajo los pasos (p. ej. «Esto tarda unos segundos…»). */
  footnote?: string;
};

export function AiProgressScreen({
  visible,
  title,
  emphasis,
  steps,
  iconName = 'sparkles',
  stepMs = 1400,
  onCancel,
  cancelLabel = 'Cancelar',
  topSlot,
  footnote,
}: AiProgressScreenProps) {
  const [active, setActive] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setActive(0);
      return;
    }
    setActive(0);
    const timers = steps.slice(0, -1).map((_, i) => setTimeout(() => setActive(i + 1), stepMs * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [visible, steps.length, stepMs]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => onCancel?.()}>
      <View style={styles.screen} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
        {topSlot && <View style={[styles.top, { top: insets.top + 24 }]}>{topSlot}</View>}
        <HeroArt iconName={iconName} blobColor={colors.tertiaryContainer} tileColor={colors.tertiary} iconColor={colors.m3.onTertiary} />

        <AppText weight="light" align="center" style={styles.title} accessibilityRole="header">
          {`${title} `}
          <AppText weight="semibold">{emphasis}</AppText>
        </AppText>

        <View style={styles.steps}>
          {steps.map((s, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <View key={s} style={[styles.step, current && styles.stepCurrent]}>
                {done ? (
                  <View style={styles.doneDot}>
                    <Ionicons name="checkmark" size={14} color={colors.onInk} />
                  </View>
                ) : current ? (
                  <ActivityIndicator size="small" color={colors.tertiary} style={styles.spinner} />
                ) : (
                  <View style={styles.pendingDot} />
                )}
                <AppText
                  variant="body"
                  weight={current ? 'semibold' : 'regular'}
                  color={current ? colors.onTertiaryContainer : done ? colors.textPrimary : colors.textSecondary}
                  style={styles.stepText}
                >
                  {s}
                </AppText>
              </View>
            );
          })}
        </View>

        {footnote && (
          <AppText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.footnote}>
            {footnote}
          </AppText>
        )}

        {onCancel && <SecondaryButton title={cancelLabel} variant="outline" onPress={onCancel} style={styles.cancel} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: 22,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footnote: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  steps: {
    alignSelf: 'stretch',
    gap: 10,
  },
  step: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: radii.fields,
    backgroundColor: colors.surfaceVariant,
  },
  stepCurrent: {
    backgroundColor: colors.tertiaryContainer,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
  },
  doneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  spinner: {
    width: 24,
    height: 24,
  },
  cancel: {
    alignSelf: 'stretch',
  },
});
