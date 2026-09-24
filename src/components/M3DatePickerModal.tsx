import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, typography, spacing, radii } from '../theme';

export interface M3DatePickerModalProps {
  visible: boolean;
  value: string; // Formato YYYY-MM-DD
  onChange: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function M3DatePickerModal({
  visible,
  value,
  onChange,
  onClose,
}: M3DatePickerModalProps) {
  const getTodayStr = () => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
  };

  const todayStr = useMemo(() => getTodayStr(), []);

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(value || '');

  // Sincronización robusta: al abrirse el modal, asegurar que la vista del calendario
  // NUNCA quede anclada en meses pasados o fechas caducadas antiguas
  React.useEffect(() => {
    if (!visible) return;

    const now = new Date();
    const currentTodayStr = getTodayStr();

    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      // Si la fecha del alimento ya caducó (anterior a hoy),
      // abrimos directamente en el mes y día ACTUAL para facilitar su actualización
      if (value < currentTodayStr) {
        setCurrentYear(now.getFullYear());
        setCurrentMonth(now.getMonth());
        setSelectedDateStr(currentTodayStr);
      } else {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
        setSelectedDateStr(value);
      }
    } else {
      // Sin fecha previa: inicializar siempre en el día y mes actual
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth());
      setSelectedDateStr(currentTodayStr);
    }
  }, [visible, value]);

  const handleGoToToday = () => {
    const now = new Date();
    const currentTodayStr = getTodayStr();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(currentTodayStr);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const days: ({ day: number; dateStr: string; isCurrentMonth: boolean } | null)[] = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      days.push({
        day,
        dateStr: `${currentYear}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handleQuickSelect = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const str = `${target.getFullYear()}-${m}-${d}`;
    setSelectedDateStr(str);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
  };

  const handleConfirm = () => {
    if (selectedDateStr) {
      onChange(selectedDateStr);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar selector de fecha"
        />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={22} color={colors.primary} />
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={styles.headerTitle}>Fecha de Vencimiento</Text>
              <Text style={styles.headerSubtitle}>
                {selectedDateStr || 'Selecciona un día'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Atajos Rápidos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {[
              { label: 'Hoy', days: 0 },
              { label: '+3 días', days: 3 },
              { label: '+1 sem', days: 7 },
              { label: '+2 sem', days: 14 },
              { label: '+1 mes', days: 30 },
              { label: '+3 meses', days: 90 },
            ].map((shortcut, idx) => (
              <Pressable
                key={idx}
                style={styles.quickPill}
                onPress={() => handleQuickSelect(shortcut.days)}
                accessibilityRole="button"
                accessibilityLabel={shortcut.label}
              >
                <Text style={styles.quickPillText}>{shortcut.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.monthNav}>
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={10}
              style={styles.navArrow}
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              {(currentMonth !== new Date().getMonth() || currentYear !== new Date().getFullYear()) && (
                <Pressable
                  onPress={handleGoToToday}
                  style={styles.todayPill}
                  accessibilityRole="button"
                  accessibilityLabel="Volver al mes actual"
                >
                  <Text style={styles.todayPillText}>Hoy</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={10}
              style={styles.navArrow}
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((d, i) => (
              <Text key={i} style={styles.dayLabelText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map((cell, index) => {
              if (!cell) {
                return <View key={index} style={styles.dayCell} />;
              }

              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDateStr(cell.dateStr)}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.day} de ${MONTH_NAMES[currentMonth]}`}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footerRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <SecondaryButton
                title="Cancelar"
                variant="outline"
                onPress={onClose}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Guardar"
                onPress={handleConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  todayPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.circular,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayPillText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.circular,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  quickScroll: {
    marginBottom: 14,
  },
  quickPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.circular,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  quickPillText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    marginBottom: spacing.sm,
  },
  navArrow: {
    padding: 6,
    borderRadius: radii.cards,
    backgroundColor: colors.surfaceVariant,
  },
  monthTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayLabelText: {
    width: 38,
    textAlign: 'center',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: radii.circular,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: typography.sizes.metadata,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.textInverse,
    fontWeight: typography.weights.heavy,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: typography.weights.heavy,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});
