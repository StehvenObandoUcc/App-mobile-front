import React from 'react';
import { StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

/**
 * AvatarButton — botón de perfil de 48 dp con la misma apariencia que el botón de ajustes de la cabecera:
 * superficie blanca con filete y icono cacao; con foto, la foto llena el círculo.
 */
export type AvatarButtonProps = {
  uri?: string | null;
  onPress: () => void;
  accessibilityLabel: string;
};

export function AvatarButton({ uri, onPress, accessibilityLabel }: AvatarButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: spacing.touchTargetMin / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
}));
