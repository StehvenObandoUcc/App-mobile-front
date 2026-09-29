import React from 'react';
import { StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme';

/**
 * AvatarButton — botón de perfil de 48 dp (Inicio.dc.html): frambuesa claro con icono,
 * o la foto del usuario si existe.
 */
export type AvatarButtonProps = {
  uri?: string | null;
  signedIn?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

export function AvatarButton({ uri, signedIn = false, onPress, accessibilityLabel }: AvatarButtonProps) {
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
        <Ionicons name={signedIn ? 'person' : 'person-outline'} size={22} color={colors.onTertiaryContainer} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: spacing.touchTargetMin / 2,
    backgroundColor: colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  image: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
  },
});
