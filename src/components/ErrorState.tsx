import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { colors, typography, spacing, radii } from '../theme';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry: () => void;
};

export function ErrorState({
  title = 'Algo salió mal',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.error.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonWrap}>
        <PrimaryButton title="Reintentar" onPress={onRetry} iconName="refresh-outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radii.circular,
    backgroundColor: colors.error.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 220,
  },
});
