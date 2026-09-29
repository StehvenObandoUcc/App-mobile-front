import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { HeroArt, HeroArtProps } from './HeroArt';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, spacing } from '../theme';

/**
 * StatusScreen — estado a pantalla completa (Escaneo-Estados · B «Límite» y C «Error»; mismo estilo que el Chef IA).
 * Píldora arriba, ilustración, título 300 con énfasis 600, mensaje y dos acciones apiladas.
 */
export type StatusScreenAction = {
  title: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export type StatusScreenProps = {
  art: HeroArtProps;
  title: string;
  emphasis?: string;
  message: string;
  primary: StatusScreenAction;
  secondary?: StatusScreenAction;
  /** Píldora superior (QuotaPill). */
  topSlot?: React.ReactNode;
  role?: 'alert' | 'none';
};

export function StatusScreen({ art, title, emphasis, message, primary, secondary, topSlot, role = 'none' }: StatusScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
      accessibilityRole={role === 'alert' ? 'alert' : undefined}
    >
      {topSlot && <View style={[styles.top, { top: insets.top + 24 }]}>{topSlot}</View>}
      <HeroArt {...art} />
      <AppText weight="light" align="center" style={styles.title} accessibilityRole="header">
        {emphasis ? `${title} ` : title}
        {emphasis ? <AppText weight="semibold">{emphasis}</AppText> : null}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} align="center" style={styles.message}>
        {message}
      </AppText>
      <View style={styles.actions}>
        <PrimaryButton title={primary.title} iconName={primary.iconName} onPress={primary.onPress} />
        {secondary && (
          <SecondaryButton title={secondary.title} iconName={secondary.iconName} variant="outline" onPress={secondary.onPress} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: 20,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 4,
  },
});
