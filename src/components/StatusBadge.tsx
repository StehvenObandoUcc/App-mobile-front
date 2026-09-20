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
  { bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap; defaultLabel: string }
> = {
  fresh: {
    bg: '#EAF4ED',
    border: '#C2DFCB',
    text: '#28613C',
    icon: 'checkmark-circle-outline',
    defaultLabel: 'Fresco',
  },
  expiringSoon: {
    bg: '#FFF2D7',
    border: '#F8DC9E',
    text: '#8A5A00',
    icon: 'time-outline',
    defaultLabel: 'Próximo a vencer',
  },
  expired: {
    bg: '#FBE5E3',
    border: '#F4BCB8',
    text: '#A93632',
    icon: 'alert-circle-outline',
    defaultLabel: 'Vencido',
  },
  unknown: {
    bg: '#F1ECE7',
    border: '#DED6CE',
    text: '#665B54',
    icon: 'help-circle-outline',
    defaultLabel: 'Sin fecha',
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}
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
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
});
