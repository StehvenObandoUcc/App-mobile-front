import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * ScanHero — tarjeta principal del Inicio (Inicio.dc.html).
 * Fondo ciruela (color de la IA), anillo decorativo, chip «IA de visión», título 26/32 300 + 600 y botón squircle claro 64.
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
      accessibilityRole="button"
      accessibilityLabel={t('organisms.scanHero.a11y')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.ring} pointerEvents="none" />

      <View style={styles.badge}>
        <Ionicons name="sparkles" size={14} color={colors.onAiHero} />
        <AppText variant="label" uppercase color={colors.onAiHero} style={styles.badgeText}>
          {t('organisms.scanHero.badge')}
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.texts}>
          <AppText variant="headline" weight="light" color={colors.onAiHero}>
            {t('organisms.scanHero.title')} <AppText weight="semibold">{t('organisms.scanHero.titleBold')}</AppText>
          </AppText>
          <AppText variant="bodySmall" color={colors.aiHeroMuted}>
            {t('organisms.scanHero.description')}
          </AppText>
        </View>
        <View style={styles.fab}>
          <Ionicons name="scan-outline" size={30} color={colors.aiHero} />
          <View style={styles.fabLens} />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.onAiHero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLens: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.aiHero,
  },
}));
