import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

/**
 * SectionHeader — título de sección 20/600 con enlace tomate a la derecha («Ver todos (3)»).
 * El enlace tiene 48 dp de alto táctil.
 */
export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="sectionTitle" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
        >
          <AppText variant="bodySmall" weight="semibold" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  link: {
    height: spacing.touchTargetMin,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
