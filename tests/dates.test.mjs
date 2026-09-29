import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toLocalISODate, todayISO, parseLocalDate, addDaysISO, daysUntil } from '../src/utils/dates.ts';

// Las fechas se construyen con el constructor local para que la prueba no dependa de la zona horaria.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('parseLocalDate interpreta YYYY-MM-DD como medianoche local (no UTC)', () => {
  const d = parseLocalDate('2026-09-30');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 30);
  assert.equal(d.getHours(), 0);
  assert.equal(parseLocalDate(''), null);
  assert.equal(parseLocalDate(null), null);
  assert.equal(parseLocalDate('no-es-fecha'), null);
});

test('daysUntil cuenta días de calendario sin depender de la hora', () => {
  const lateNight = at(2026, 9, 28, 21, 0); // 9 p. m. en Colombia = ya es 29 en UTC
  assert.equal(daysUntil('2026-09-28', lateNight), 0);
  assert.equal(daysUntil('2026-09-29', lateNight), 1);
  assert.equal(daysUntil('2026-09-30', lateNight), 2);
  assert.equal(daysUntil('2026-10-10', lateNight), 12);
  assert.equal(daysUntil('2026-09-27', lateNight), -1);
  const earlyMorning = at(2026, 9, 28, 0, 5);
  assert.equal(daysUntil('2026-09-30', earlyMorning), 2);
  assert.equal(daysUntil(null, lateNight), null);
});

test('daysUntil cruza cambios de mes y de año', () => {
  assert.equal(daysUntil('2026-10-01', at(2026, 9, 30)), 1);
  assert.equal(daysUntil('2027-01-01', at(2026, 12, 31, 23, 59)), 1);
  assert.equal(daysUntil('2028-03-01', at(2028, 2, 28)), 2); // 2028 es bisiesto
});

test('todayISO, toLocalISODate y addDaysISO usan el día local', () => {
  const now = at(2026, 9, 28, 23, 30);
  assert.equal(todayISO(now), '2026-09-28');
  assert.equal(toLocalISODate(at(2026, 1, 5)), '2026-01-05');
  assert.equal(addDaysISO(3, now), '2026-10-01');
  assert.equal(addDaysISO(-1, at(2026, 1, 1)), '2025-12-31');
});

import { formatShortDate, formatLongDate, relativeDayLabel } from '../src/utils/dates.ts';

test('formatos en español para el campo de fecha', () => {
  assert.equal(formatShortDate('2026-10-02'), 'vie, 2 de oct. 2026');
  assert.equal(formatLongDate('2026-10-02'), 'viernes 2 de octubre de 2026');
  assert.equal(formatShortDate(null), '');
  const now = at(2026, 9, 28, 21, 0);
  assert.equal(relativeDayLabel('2026-10-02', now), 'en 4 días');
  assert.equal(relativeDayLabel('2026-09-28', now), 'hoy');
  assert.equal(relativeDayLabel('2026-09-29', now), 'mañana');
  assert.equal(relativeDayLabel('2026-09-25', now), 'hace 3 días');
});

import { formatPickerHeader, formatMonthYear, buildMonthGrid } from '../src/utils/dates.ts';

test('encabezado y cuadrícula del calendario', () => {
  assert.deepEqual(formatPickerHeader('2026-10-02'), { weekday: 'viernes', dayMonth: '2 de oct.' });
  assert.equal(formatPickerHeader(''), null);
  assert.equal(formatMonthYear(2026, 9), 'octubre 2026');
  const oct = buildMonthGrid(2026, 9); // 1 de octubre de 2026 es jueves → 3 huecos (lu, ma, mi)
  assert.equal(oct.slice(0, 3).every((c) => c === null), true);
  assert.deepEqual(oct[3], { day: 1, iso: '2026-10-01' });
  assert.equal(oct.filter(Boolean).length, 31);
  const sep = buildMonthGrid(2026, 8); // 1 de septiembre de 2026 es martes → 1 hueco
  assert.equal(sep[0], null);
  assert.deepEqual(sep[1], { day: 1, iso: '2026-09-01' });
  const feb = buildMonthGrid(2026, 1); // 1 de febrero de 2026 es domingo → 6 huecos
  assert.equal(feb.slice(0, 6).every((c) => c === null), true);
  assert.equal(feb.filter(Boolean).length, 28);
});

test('earliestISODate elige la fecha más próxima sin pasar por UTC', async () => {
  const { earliestISODate } = await import('../src/utils/dates.ts');
  assert.equal(earliestISODate('2026-10-05', '2026-09-30'), '2026-09-30');
  assert.equal(earliestISODate(null, '2026-09-30'), '2026-09-30');
  assert.equal(earliestISODate('2026-10-05', ''), '2026-10-05');
  assert.equal(earliestISODate(null, null), null);
});
