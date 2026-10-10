import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { AppText } from './AppText';
import { Chip } from './Chip';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { CalendarMonth } from './CalendarMonth';
import { radii, spacing, elevations } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { todayISO, addDaysISO, parseLocalDate, formatPickerHeader } from '../utils/dates';
import { useI18n } from '../i18n';

/**
 * M3DatePickerModal — organismo (Organismos.dc.html).
 * «VENCE EL / viernes, **2 de oct.**» · atajos Hoy / +3 días / +1 sem / +1 mes (Chip choice) ·
 * CalendarMonth · «Sin fecha» (borde) + «Confirmar» (cacao).
 * Fechas SIEMPRE en calendario local (utils/dates.ts); «hoy» se recalcula cada vez que se abre.
 */
export interface M3DatePickerModalProps {
  visible: boolean;
  value: string; // 'YYYY-MM-DD' o ''
  onChange: (dateStr: string) => void; // '' = sin fecha
  onClose: () => void;
}

const SHORTCUTS = [
  { labelKey: 'sheets.m3DatePicker.shortcut.today', days: 0 },
  { labelKey: 'sheets.m3DatePicker.shortcut.plus3Days', days: 3 },
  { labelKey: 'sheets.m3DatePicker.shortcut.plus1Week', days: 7 },
  { labelKey: 'sheets.m3DatePicker.shortcut.plus1Month', days: 30 },
] as const;

export function M3DatePickerModal({ visible, value, onChange, onClose }: M3DatePickerModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
  const [selected, setSelected] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  // Al abrir: mostrar el mes de la fecha elegida; si no hay fecha o ya venció, el mes actual.
  useEffect(() => {
    if (!visible) return;
    const today = todayISO();
    const valid = parseLocalDate(value);
    const start = valid && value >= today ? value : '';
    const anchor = parseLocalDate(start || today)!;
    setSelected(start);
    setYear(anchor.getFullYear());
    setMonth(anchor.getMonth());
  }, [visible, value]);

  const showMonthOf = (iso: string) => {
    const d = parseLocalDate(iso);
    if (!d) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const header = formatPickerHeader(selected);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('sheets.m3DatePicker.closeA11y')} />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <AppText variant="label" uppercase color={colors.textSecondary}>
              {t('sheets.m3DatePicker.eyebrow')}
            </AppText>
            <AppText variant="headline" weight="light" accessibilityLiveRegion="polite">
              {header ? (
                <>
                  {`${header.weekday}, `}
                  <AppText weight="semibold">{header.dayMonth}</AppText>
                </>
              ) : (
                t('sheets.m3DatePicker.noDate')
              )}
            </AppText>
          </View>

          <View style={styles.shortcuts}>
            {SHORTCUTS.map((s) => {
              const iso = addDaysISO(s.days);
              return (
                <Chip
                  key={s.labelKey}
                  variant="choice"
                  label={t(s.labelKey)}
                  selected={selected === iso}
                  onPress={() => {
                    setSelected(iso);
                    showMonthOf(iso);
                  }}
                />
              );
            })}
          </View>

          <CalendarMonth
            year={year}
            month={month}
            selected={selected}
            onSelect={setSelected}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />

          <View style={styles.footer}>
            <SecondaryButton
              title={t('sheets.m3DatePicker.noDate')}
              variant="outline"
              onPress={() => {
                onChange('');
                onClose();
              }}
              style={styles.footerBtn}
            />
            <PrimaryButton
              title={t('sheets.m3DatePicker.confirm')}
              disabled={!selected}
              onPress={() => {
                onChange(selected);
                onClose();
              }}
              style={styles.footerBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    ...elevations.xl,
  },
  header: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  footerBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
}));
