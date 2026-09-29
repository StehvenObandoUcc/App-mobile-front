/**
 * Fechas de calendario LOCALES (zona horaria del teléfono). Única fuente para «hoy» y «días que faltan».
 *
 * Regla: las fechas de la app se guardan como 'YYYY-MM-DD' y SIEMPRE se interpretan en hora local.
 * Nunca usar `new Date('YYYY-MM-DD')`: JavaScript la toma como medianoche UTC y en Colombia (UTC-5)
 * cae el día anterior a las 7 p. m., lo que corría un día los vencimientos.
 * «Hoy» se calcula en el momento de usarlo (no se guarda al montar), para que cambie a medianoche.
 */

/** 'YYYY-MM-DD' de una fecha en hora local. */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fecha de hoy en hora local ('YYYY-MM-DD'). */
export function todayISO(now: Date = new Date()): string {
  return toLocalISODate(now);
}

/** Interpreta 'YYYY-MM-DD' como medianoche LOCAL. Acepta también ISO con hora (se toma su día local). */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 'YYYY-MM-DD' desplazada N días desde hoy (hora local). */
export function addDaysISO(days: number, now: Date = new Date()): string {
  return toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

/**
 * Días de calendario desde hoy hasta la fecha: 0 = hoy, 1 = mañana, -1 = ayer.
 * No depende de la hora actual (a las 11 p. m. «mañana» sigue siendo 1). null si no hay fecha válida.
 */
export function daysUntil(value: string | null | undefined, now: Date = new Date()): number | null {
  const target = parseLocalDate(value);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Math.round absorbe los cambios de horario de verano (días de 23 o 25 h).
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «vie, 2 de oct. 2026» (campo de fecha del formulario). '' si no hay fecha válida. */
export function formatShortDate(value: string | null | undefined): string {
  const d = parseLocalDate(value);
  if (!d) return '';
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** «viernes 2 de octubre de 2026» (lectores de pantalla). */
export function formatLongDate(value: string | null | undefined): string {
  const d = parseLocalDate(value);
  if (!d) return '';
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

/** «hoy» · «mañana» · «en 4 días» · «ayer» · «hace 3 días». '' sin fecha. */
export function relativeDayLabel(value: string | null | undefined, now: Date = new Date()): string {
  const n = daysUntil(value, now);
  if (n === null) return '';
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

/** Encabezado del calendario: «viernes» + «2 de oct.» (el día va en seminegrita). */
export function formatPickerHeader(value: string | null | undefined): { weekday: string; dayMonth: string } | null {
  const d = parseLocalDate(value);
  if (!d) return null;
  return { weekday: WEEKDAYS_LONG[d.getDay()], dayMonth: `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}` };
}

/** «octubre 2026» */
export function formatMonthYear(year: number, monthIndex: number): string {
  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

/**
 * Celdas de un mes con semana de lunes a domingo: null = hueco antes del día 1.
 * Cada día trae su fecha 'YYYY-MM-DD' local.
 */
export function buildMonthGrid(year: number, monthIndex: number): ({ day: number; iso: string } | null)[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay(); // 0 = domingo
  const leading = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells: ({ day: number; iso: string } | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: toLocalISODate(new Date(year, monthIndex, day)) });
  }
  return cells;
}

/** La fecha más próxima de dos 'YYYY-MM-DD' (o la que exista). Comparar el texto ISO es seguro y no pasa por UTC. */
export function earliestISODate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (a && b) return a <= b ? a : b;
  return a || b || null;
}
