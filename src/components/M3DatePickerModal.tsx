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
  // Inicializar año y mes a partir del valor actual o la fecha de hoy
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(value || '');

  // Sincronizar si cambia el value prop
  React.useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setCurrentYear(y);
      setCurrentMonth(m - 1);
      setSelectedDateStr(value);
    }
  }, [value]);

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

  // Generar días del mes para la cuadrícula
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    // Ajustar domingo (0) al final de la semana (6)
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

  const handleQuickAddDays = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const newDateStr = `${y}-${m}-${d}`;
    setSelectedDateStr(newDateStr);
    setCurrentYear(y);
    setCurrentMonth(target.getMonth());
  };

  const handleConfirm = () => {
    onChange(selectedDateStr);
    onClose();
  };

  const handleClear = () => {
    setSelectedDateStr('');
    onChange('');
    onClose();
  };

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={22} color="#B94E35" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Fecha de vencimiento</Text>
              <Text style={styles.headerSubtitle}>
                {selectedDateStr ? `Seleccionada: ${selectedDateStr}` : 'Sin fecha definida'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#66534A" />
            </Pressable>
          </View>

          {/* Píldoras de Acceso Rápido */}
          <Text style={styles.sectionLabel}>Atajos rápidos:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {[
              { label: 'Hoy', days: 0 },
              { label: '+3 días', days: 3 },
              { label: '+1 semana', days: 7 },
              { label: '+2 semanas', days: 14 },
              { label: '+1 mes', days: 30 },
            ].map((shortcut) => (
              <Pressable
                key={shortcut.label}
                onPress={() => handleQuickAddDays(shortcut.days)}
                style={styles.quickPill}
              >
                <Text style={styles.quickPillText}>{shortcut.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Navegación de Mes */}
          <View style={styles.monthNav}>
            <Pressable onPress={handlePrevMonth} style={styles.navArrow} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color="#B94E35" />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navArrow} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color="#B94E35" />
            </Pressable>
          </View>

          {/* Etiquetas de Días (Lu, Ma...) */}
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label) => (
              <Text key={label} style={styles.dayLabelText}>
                {label}
              </Text>
            ))}
          </View>

          {/* Cuadrícula del Calendario */}
          <View style={styles.grid}>
            {calendarDays.map((item, index) => {
              if (!item) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const isSelected = item.dateStr === selectedDateStr;
              const isToday = item.dateStr === todayStr;

              return (
                <Pressable
                  key={item.dateStr}
                  onPress={() => setSelectedDateStr(item.dateStr)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {item.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Acciones */}
          <View style={styles.footerRow}>
            {selectedDateStr ? (
              <View style={{ flex: 1, marginRight: 8 }}>
                <SecondaryButton
                  title="Quitar fecha"
                  variant="outline"
                  onPress={handleClear}
                />
              </View>
            ) : null}
            <View style={{ flex: 1.5 }}>
              <PrimaryButton
                title={selectedDateStr ? 'Confirmar' : 'Cerrar'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    padding: 20,
    shadowColor: '#2B211D',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FBE9E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2B211D',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#66534A',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#66534A',
    marginBottom: 6,
  },
  quickScroll: {
    marginBottom: 14,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F8EDE2',
    borderWidth: 1,
    borderColor: '#EBDDD2',
    marginRight: 8,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#863626',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4ECE4',
    marginBottom: 8,
  },
  navArrow: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8EDE2',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B211D',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayLabelText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#96857C',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#B94E35',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#B94E35',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B211D',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#B94E35',
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});
