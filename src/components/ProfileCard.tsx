import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * ProfileCard — tarjeta de identidad (Perfil.dc.html).
 * Avatar 112 (rosa frambuesa con silueta, o la foto) con insignia de cámara cacao de 40 y aro blanco,
 * «Chef **Nombre**» 24/30, correo 14 y la píldora salvia «Sesión segura».
 */
export type ProfileCardProps = {
  name: string;
  email: string;
  avatarUri: string | null;
  onPressAvatar: () => void;
};

export function ProfileCard({ name, email, avatarUri, onPressAvatar }: ProfileCardProps) {
  const first = name.trim().split(/\s+/)[0] || 'Chef';
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPressAvatar}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.photo} />
        ) : (
          <Ionicons name="person-outline" size={48} color={colors.onTertiaryContainer} />
        )}
        <View style={styles.badge}>
          <Ionicons name="camera-outline" size={18} color={colors.onInk} />
        </View>
      </Pressable>

      <View style={styles.texts}>
        <AppText weight="light" align="center" style={styles.name} accessibilityRole="header">
          {'Chef '}
          <AppText weight="semibold">{first}</AppText>
        </AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} align="center">
          {email}
        </AppText>
      </View>

      <View style={styles.secure}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.functional.fresh.text} />
        <AppText variant="metadata" weight="semibold" color={colors.functional.fresh.text}>
          Sesión segura
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: 2,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
  },
  secure: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.functional.fresh.background,
  },
});
