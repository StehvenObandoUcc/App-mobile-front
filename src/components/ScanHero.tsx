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
 * Fondo ciruela (color de la IA), anillo decorativo, chip «IA de visión», título 26/32 300 + 600 y botón de pastilla claro «Escanear».
 * Toda la tarjeta abre el escáner.
 */
export type ScanHeroProps = {
  onPress: () => void;
};

export function ScanHero({ onPress }: ScanHeroProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessible={false}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.ring} pointerEvents="none" />

      <View style={styles.badge}>
        <Ionicons name="sparkles" size={14} color={colors.onAiHero} />
        <AppText variant="label" uppercase color={colors.onAiHero} style={styles.badgeText}>
          {t('organisms.scanHero.badge')}
        </AppText>
      </View>

      <View style={styles.texts}>
        <AppText variant="headline" weight="light" color={colors.onAiHero}>
          {t('organisms.scanHero.title')} <AppText weight="semibold">{t('organisms.scanHero.titleBold')}</AppText>
        </AppText>
        <AppText variant="bodySmall" color={colors.aiHeroMuted}>
          {t('organisms.scanHero.description')}
        </AppText>
      </View>

      <PrimaryButton
        tone="inverse"
        title={t('organisms.scanHero.cta')}
        iconName="scan-outline"
        onPress={onPress}
        accessibilityLabel={t('organisms.scanHero.a11y')}
        style={styles.cta}
      />
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
  ring: {
    position: 'absolute',
    right: -36,
    top: -36,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 22,
    borderColor: colors.aiHeroChip,
  },
  badge: {
    alignSelf: 'flex-start',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.aiHeroChip,
  },
  badgeText: {
    letterSpacing: 0.8,
  },
  texts: {
    gap: 6,
  },
  cta: {
    alignSelf: 'flex-start',
    height: 52,
    marginTop: 4,
  },
}));
