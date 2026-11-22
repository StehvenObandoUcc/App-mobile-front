import React from 'react';
import { Pressable, Linking } from 'react-native';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { isAllowedPageUrl } from '../utils/recipe-merge';
import type { RecipeImageCredit } from '../types';

/**
 * PhotoCredit — pastilla de atribución sobre una foto (Unsplash, Pexels o Wikimedia): «{name} · {fuente}» (+ « · {licencia}» en Wikimedia).
 * Va en la esquina inferior izquierda del contenedor de la foto (position absolute) y abre el perfil del
 * fotógrafo (solo hosts de su fuente). Fondo `photoScrim` + texto blanco: ≥ 8:1 incluso sobre una foto blanca.
 * Sin crédito válido no se pinta. Área táctil ≥ 44 dp vía hitSlop.
 */
const PILL_HEIGHT = 24;
const TOUCH_MIN = 44;
const MAX_VISIBLE_NAME_LICENSE = 28;

export function PhotoCredit({ credit }: { credit?: RecipeImageCredit | null }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  if (!credit || !credit.name || !isAllowedPageUrl(credit.source, credit.profileUrl)) return null;
  const profileUrl = credit.profileUrl;
  const source = t(`atoms.photoCredit.${credit.source}`);
  const license = credit.source === 'wikimedia' ? credit.license?.trim() : '';
  // La licencia se ve en la pastilla solo si name + licencia caben (≤ 28 caracteres); si no, queda en la etiqueta de accesibilidad
  const showLicense = !!license && credit.name.length + license.length <= MAX_VISIBLE_NAME_LICENSE;
  const slop = (TOUCH_MIN - PILL_HEIGHT) / 2;
  return (
    <Pressable
      onPress={() => Linking.openURL(profileUrl).catch(() => {})}
      hitSlop={{ top: slop, bottom: slop, left: 8, right: 8 }}
      style={styles.pill}
      accessibilityRole="link"
      accessibilityLabel={license ? t('atoms.photoCredit.a11yLicense', { name: credit.name, source, license }) : t('atoms.photoCredit.a11y', { name: credit.name, source })}
    >
      <AppText variant="caption" weight="medium" color={colors.textInverse} numberOfLines={1}>
        {showLicense ? t('atoms.photoCredit.labelLicense', { name: credit.name, source, license }) : t('atoms.photoCredit.label', { name: credit.name, source })}
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
