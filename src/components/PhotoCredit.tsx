import React from 'react';
import { Pressable, Linking } from 'react-native';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { isUnsplashPageUrl } from '../utils/recipe-merge';
import type { RecipeImageCredit } from '../types';

/**
 * PhotoCredit — pastilla de atribución sobre una foto de Unsplash: «{name} · Unsplash».
 * Va en la esquina inferior izquierda del contenedor de la foto (position absolute) y abre el perfil del
 * fotógrafo (solo https://unsplash.com/…). Fondo `photoScrim` + texto blanco: ≥ 8:1 incluso sobre una foto blanca.
 * Sin crédito válido no se pinta. Área táctil ≥ 44 dp vía hitSlop.
 */
const PILL_HEIGHT = 24;
const TOUCH_MIN = 44;

export function PhotoCredit({ credit }: { credit?: RecipeImageCredit | null }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  if (!credit || !credit.name || !isUnsplashPageUrl(credit.profileUrl)) return null;
  const profileUrl = credit.profileUrl;
  const slop = (TOUCH_MIN - PILL_HEIGHT) / 2;
  return (
    <Pressable
      onPress={() => Linking.openURL(profileUrl).catch(() => {})}
      hitSlop={{ top: slop, bottom: slop, left: 8, right: 8 }}
      style={styles.pill}
      accessibilityRole="link"
      accessibilityLabel={t('atoms.photoCredit.a11y', { name: credit.name })}
    >
      <AppText variant="caption" weight="medium" color={colors.textInverse} numberOfLines={1}>
        {t('atoms.photoCredit.label', { name: credit.name })}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  pill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: '75%',
    height: PILL_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.photoScrim,
    justifyContent: 'center',
  },
}));
