import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationStatus } from '../types';

export type StatusBadgeProps = {
  status: ExpirationStatus;
  label?: string;
};

const STATUS_CONFIG: Record<
  ExpirationStatus,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap; defaultLabel: string }
> = {
  fresh: {
    bg: '#ECFDF5',
    text: '#059669',
    icon: 'checkmark-circle-outline',
    defaultLabel: 'Fresco',
  },
  expiringSoon: {
    bg: '#FFFBEB',
    text: '#D97706',
    icon: 'time-outline',
    defaultLabel: 'Próximo a vencer',
  },
  expired: {
    bg: '#FEF2F2',
    text: '#DC2626',
    icon: 'alert-circle-outline',
    defaultLabel: 'Vencido',
  },
  unknown: {
    bg: '#F3F4F6',
    text: '#6B7280',
    icon: 'help-circle-outline',
    defaultLabel: 'Sin fecha',
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${label || config.defaultLabel}`}
    >
      <Ionicons name={config.icon} size={13} color={config.text} style={{ marginRight: 4 }} />
      <Text style={[styles.text, { color: config.text }]}>{label || config.defaultLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
});
