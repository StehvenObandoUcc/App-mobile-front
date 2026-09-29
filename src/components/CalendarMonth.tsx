import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, PanResponder } from 'react-native';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { colors, radii, spacing } from '../theme';
import { buildMonthGrid, formatMonthYear, formatLongDate, todayISO } from '../utils/dates';

/**
 * CalendarMonth — molécula del calendario (Organismos.dc.html · M3DatePickerModal).
 * Navegación de mes con IconButton 48, días de la semana Lu–Do y celdas de 48 dp.
 * Seleccionado: círculo cacao. Hoy: anillo cacao. Deslizar a los lados cambia de mes
 * sin propagar el gesto a la navegación de pestañas.
 */
export type CalendarMonthProps = {
  year: number;
  month: number; // 0–11
  selected: string; // 'YYYY-MM-DD' o ''
  onSelect: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function CalendarMonth({ year, month, selected, onSelect, onPrevMonth, onNextMonth }: CalendarMonthProps) {
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = todayISO(); // calculado en cada render: correcto aunque pase la medianoche

  // Refs para que el PanResponder (creado una vez) llame siempre a la versión actual.
  const prevRef = useRef(onPrevMonth);
  const nextRef = useRef(onNextMonth);
  prevRef.current = onPrevMonth;
  nextRef.current = onNextMonth;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -30) nextRef.current();
        else if (g.dx > 30) prevRef.current();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Completar la última semana para que la cuadrícula quede pareja.
  const padded = [...cells];
  while (padded.length % 7 !== 0) padded.push(null);

  return (
    <View {...pan.panHandlers}>
      <View style={styles.nav}>
        <IconButton iconName="chevron-back" variant="neutral" accessibilityLabel="Mes anterior" onPress={onPrevMonth} style={styles.navBtn} />
        <AppText variant="body" weight="semibold" accessibilityRole="header">
          {formatMonthYear(year, month)}
        </AppText>
        <IconButton iconName="chevron-forward" variant="neutral" accessibilityLabel="Mes siguiente" onPress={onNextMonth} style={styles.navBtn} />
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.cell}>
            <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
              {d}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {padded.map((c, i) => {
          if (!c) return <View key={`e${i}`} style={styles.cell} />;
          const isSelected = c.iso === selected;
          const isToday = c.iso === today;
          return (
            <Pressable
              key={c.iso}
              onPress={() => onSelect(c.iso)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatLongDate(c.iso)}${isToday ? ', hoy' : ''}`}
            >
              <View style={[styles.day, isToday && !isSelected && styles.dayToday, isSelected && styles.daySelected]}>
                <AppText
                  variant="body"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? colors.onInk : colors.textPrimary}
                >
                  {c.day}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = 100 / 7;

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${CELL}%`,
    height: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 40,
    height: 40,
    // Radio exacto (mitad del lado): con 999 Android a veces pinta el fondo cuadrado.
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.ink,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
});
