import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * ScanHero — tarjeta principal del Inicio (Inicio.dc.html).
 * Fondo ciruela (color de la IA), título 300 + 600 y botón de pastilla claro «Escanear». Sin anillo ni etiqueta
 * «IA DE VISIÓN» sobre el título: eran adorno y el título ya dice qué hace.
 * Toda la tarjeta abre el escáner. Junto al botón dice cuántas fotos de prueba quedan; sin fotos, la tarjeta
 * deja de prometer el escáner y pasa a «Agregar a mano» (antes se descubría el límite al tocar «Escanear»).
 */
export type ScanHeroProps = {
  onPress: () => void;
  /** Fotos de prueba que quedan. undefined mientras se lee el conteo (no se muestra nada). */
  remaining?: number;
  /** Se usa cuando ya no quedan fotos. */
  onAddByHand: () => void;
  /**
   * Fila de una línea para cuando la despensa ya tiene alimentos: escanear sigue a mano, pero deja
   * de empujar hacia abajo lo que vence y lo que se puede cocinar.
   */
  compact?: boolean;
};

export function ScanHero({ onPress, remaining, onAddByHand, compact = false }: ScanHeroProps) {
  const { colors } = useTheme();
  const { t, tp } = useI18n();
  const styles = useStyles();
  const done = remaining === 0;
  const press = done ? onAddByHand : onPress;

  if (compact) {
    const title = t(done ? 'organisms.scanHero.doneCta' : 'organisms.scanHero.compactTitle');
    const hint = done
      ? t('organisms.scanHero.compactDoneHint')
      : remaining !== undefined
        ? tp('organisms.scanHero.quotaLeft', remaining)
        : null;
    return (
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={[title, hint].filter(Boolean).join('. ')}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.rowIcon}>
          <Ionicons name={done ? 'create-outline' : 'scan-outline'} size={22} color={colors.onAiHero} />
        </View>
        <View style={styles.rowTexts}>
          <AppText weight="semibold" color={colors.onAiHero} numberOfLines={1}>
            {title}
          </AppText>
          {hint ? (
            <AppText variant="metadata" color={colors.aiHeroMuted} numberOfLines={1}>
              {hint}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.onAiHero} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={press}
      accessible={false}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <AppText variant="headline" weight="light" color={colors.onAiHero}>
          {t(done ? 'organisms.scanHero.doneTitle' : 'organisms.scanHero.title')}{' '}
          <AppText weight="semibold">{t(done ? 'organisms.scanHero.doneTitleBold' : 'organisms.scanHero.titleBold')}</AppText>
        </AppText>
        <AppText variant="bodySmall" color={colors.aiHeroMuted}>
          {t(done ? 'organisms.scanHero.doneDescription' : 'organisms.scanHero.description')}
        </AppText>
      </View>

      <View style={styles.ctaRow}>
        <PrimaryButton
          tone="inverse"
          title={t(done ? 'organisms.scanHero.doneCta' : 'organisms.scanHero.cta')}
          iconName={done ? 'create-outline' : 'scan-outline'}
          onPress={press}
          accessibilityLabel={
            done
              ? t('organisms.scanHero.doneA11y')
              : remaining !== undefined
                ? `${t('organisms.scanHero.a11y')} ${tp('organisms.scanHero.quotaLeft', remaining)}.`
                : t('organisms.scanHero.a11y')
          }
          style={styles.cta}
        />
        {!done && remaining !== undefined && (
          <AppText variant="metadata" weight="semibold" color={colors.aiHeroMuted} style={styles.quota} importantForAccessibility="no">
            {tp('organisms.scanHero.quotaLeft', remaining)}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}


const useStyles = makeStyles((colors) => ({
  card: {
    borderRadius: radii.tiles,
    backgroundColor: colors.aiHero,
    padding: 22,
    gap: 10,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: colors.aiHeroPressed,
  },
  texts: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 16,
    borderRadius: radii.tiles,
    backgroundColor: colors.aiHero,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.aiHeroChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  cta: {
    height: 52,
  },
  quota: {
    flexShrink: 1,
  },
}));
