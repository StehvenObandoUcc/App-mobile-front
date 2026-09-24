import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { colors, radii, spacing, typography, elevations } from '../theme';

export interface ProfileCardProps {
  user: {
    name: string;
    email: string;
  };
  avatarUri: string | null;
  onPickAvatar: () => void;
  onRemoveAvatar: () => void;
  onReturnToKitchen: () => void;
  onRequestLogout: () => void;
}

/**
 * Organismo ProfileCard (Atomic Design)
 * Encapsula la tarjeta de identidad culinaria, avatar persistente local y acciones de sesión.
 */
export function ProfileCard({
  user,
  avatarUri,
  onPickAvatar,
  onRemoveAvatar,
  onReturnToKitchen,
  onRequestLogout,
}: ProfileCardProps) {
  return (
    <View style={styles.card}>
      {/* ── Avatar Interactivo (Touch Target 96x96 con insignia de cámara) ── */}
      <Pressable
        style={({ pressed }) => [
          styles.avatarContainer,
          pressed && styles.avatarPressed,
        ]}
        onPress={onPickAvatar}
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
        hitSlop={8}
      >
        <View style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={44} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={17} color={colors.textInverse} />
        </View>
      </Pressable>

      {avatarUri && (
        <Pressable
          onPress={onRemoveAvatar}
          style={styles.removePhotoBtn}
          accessibilityRole="button"
          accessibilityLabel="Eliminar foto de perfil"
          hitSlop={8}
        >
          <Text style={styles.removePhotoText}>Eliminar foto</Text>
        </Pressable>
      )}

      {/* ── Información de Usuario ── */}
      <Text style={styles.profileName}>{user.name}</Text>
      <Text style={styles.profileEmail}>{user.email}</Text>

      <View style={styles.securityTag}>
        <Ionicons
          name="shield-checkmark"
          size={16}
          color={colors.primary}
          style={{ marginRight: 6 }}
        />
        <Text style={styles.securityTagText}>Sesión activa con token seguro</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Botones de Acción (52px de altura accesible) ── */}
      <View style={styles.actions}>
        <PrimaryButton
          title="Volver a mi cocina"
          iconName="restaurant-outline"
          onPress={onReturnToKitchen}
        />

        <View style={{ height: spacing.md }} />

        <Pressable
          style={({ pressed }) => [
            styles.logoutButtonDestructive,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={onRequestLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.error.text}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.logoutButtonDestructiveText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...elevations.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2.5,
    borderColor: colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 34,
    height: 34,
    borderRadius: radii.circular,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  removePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  removePhotoText: {
    fontSize: typography.sizes.caption,
    color: colors.error.text,
    fontWeight: '600',
  },
  profileName: {
    fontSize: typography.sizes.headline,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  profileEmail: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.circular,
    marginTop: 14,
  },
  securityTagText: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: spacing.xl,
  },
  actions: {
    width: '100%',
  },
  logoutButtonDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radii.buttons,
    borderWidth: 1.5,
    borderColor: colors.functional.expired.border,
    backgroundColor: colors.error.background,
    width: '100%',
  },
  logoutButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  logoutButtonDestructiveText: {
    color: colors.error.text,
    fontSize: typography.sizes.body,
    fontWeight: '700',
  },
});
