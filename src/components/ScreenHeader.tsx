import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

/**
 * ScreenHeader — encabezado de pantalla de los mockups.
 * «Mi **Despensa**»: `title` en peso 300 + `emphasis` en 600 (32/40). Subtítulo 14 debajo
 * y un texto opcional encima (`overline`, p. ej. «Aprovecha mejor tu despensa hoy»).
 * `right`: acciones a la derecha (IconButton de perfil, ajustes…).
 */
export type ScreenHeaderProps = {
  title?: string;
  emphasis?: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  /** Por defecto 'screenTitle' (32). 'headline' (24) para cabeceras compactas. */
  size?: 'screenTitle' | 'headline';
};

export function ScreenHeader({ title, emphasis, subtitle, overline, right, size = 'screenTitle' }: ScreenHeaderProps) {
  const a11y = [overline, [title, emphasis].filter(Boolean).join(' '), subtitle].filter(Boolean).join('. ');
  return (
    <View style={styles.row}>
      <View style={styles.texts} accessible accessibilityRole="header" accessibilityLabel={a11y}>
        {overline ? (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {overline}
          </AppText>
        ) : null}
        <AppText variant={size} weight="light" numberOfLines={2}>
          {title}
          {emphasis ? <AppText weight="semibold">{title ? ` ${emphasis}` : emphasis}</AppText> : null}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
