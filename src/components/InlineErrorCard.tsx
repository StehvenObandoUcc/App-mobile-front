import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * InlineErrorCard — error dentro de una sección (Recetas-Estados · D «No pudimos generar los pasos»).
 * Tarjeta chile radio 20, icono en círculo blanco, título 15/600, detalle 13/18 y «Reintentar» oscuro a lo ancho.
 */
export type InlineErrorCardProps = {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
};

export function InlineErrorCard({ title, message, onRetry, retryLabel }: InlineErrorCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.m3.error} />
        </View>
        <View style={styles.texts}>
          <AppText weight="semibold" color={colors.m3.onErrorContainer} style={styles.title}>
            {title}
          </AppText>
          <AppText weight="regular" color={colors.m3.onErrorContainer} style={styles.message}>
            {message}
          </AppText>
        </View>
      </View>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={18} color={colors.m3.errorContainer} />
        <AppText weight="semibold" color={colors.m3.errorContainer} style={styles.retryText}>
          {retryLabel ?? t('molecules.inlineErrorCard.retry')}
        </AppText>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    borderRadius: radii.alerts,
    backgroundColor: colors.m3.errorContainer,
    padding: 16,
    gap: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.m3.onErrorContainer,
  },
  pressed: {
    opacity: 0.88,
  },
  retryText: {
    fontSize: 15,
  },
}));
