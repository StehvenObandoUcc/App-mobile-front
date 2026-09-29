import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Chip } from './Chip';
import { colors, radii } from '../theme';
import { formatShortDate, formatLongDate, relativeDayLabel, addDaysISO } from '../utils/dates';
import { getExpirationStatus } from '../utils/expiration';

/**
 * DateField — fecha de vencimiento del formulario (Despensa-Formulario.dc.html).
 * Campo de 56 dp «vie, 2 de oct. 2026» + chip de estado «en 4 días» (color por caducidad).
 * Debajo, atajos: +3 días · +1 sem · +1 mes · Sin fecha. Todas las fechas en calendario local.
 */
export type DateFieldProps = {
  value: string; // 'YYYY-MM-DD' o ''
  onChange: (value: string) => void;
  onOpenCalendar: () => void;
};

const SHORTCUTS = [
  { label: '+3 días', days: 3 },
  { label: '+1 sem', days: 7 },
  { label: '+1 mes', days: 30 },
] as const;

export function DateField({ value, onChange, onOpenCalendar }: DateFieldProps) {
  const has = Boolean(value);
  const status = getExpirationStatus(value || null).status;
  const tone = colors.functional[status];
  const relative = relativeDayLabel(value);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onOpenCalendar}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        accessibilityRole="button"
        accessibilityLabel={
          has
            ? `Fecha de vencimiento: ${formatLongDate(value)}, ${relative}. Cambiar en el calendario`
            : 'Sin fecha de vencimiento. Elegir en el calendario'
        }
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
        <AppText variant="body" color={has ? colors.textPrimary : colors.textMuted} style={styles.value} numberOfLines={1}>
          {has ? formatShortDate(value) : 'Elegir en el calendario'}
        </AppText>
        {has && (
          <View style={[styles.badge, { backgroundColor: tone.background }]}>
            <AppText variant="metadata" weight="semibold" color={tone.text}>
              {relative}
            </AppText>
          </View>
        )}
      </Pressable>

      <View style={styles.shortcuts}>
        {SHORTCUTS.map((s) => {
          const target = addDaysISO(s.days);
          return (
            <Chip key={s.label} variant="choice" label={s.label} selected={value === target} onPress={() => onChange(target)} />
          );
        })}
        <Chip variant="choice" label="Sin fecha" selected={!has} onPress={() => onChange('')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: radii.fields,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  fieldPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  value: {
    flex: 1,
  },
  badge: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
  },
});
