/**
 * Planificador puro de avisos de vencimiento (sin dependencias nativas).
 *
 * Recibe los alimentos de la despensa y devuelve cuándo avisar, agrupando en una sola
 * notificación todos los alimentos que tocan el mismo día. Así evitamos llenar al
 * usuario de avisos y respetamos el límite de notificaciones programadas de iOS (64).
 *
 * El servicio de notificaciones (expo-notifications) solo consume este plan.
 */

export type ReminderSource = { name: string; expirationDate: string | null };

export type ReminderPlanEntry = {
  /** Clave del día del aviso (YYYY-MM-DD, hora local). */
  dayKey: string;
  fireAt: Date;
  itemNames: string[];
  title: string;
  body: string;
};

export type ReminderOptions = {
  daysBefore: number; // 1, 2 o 3
  hour?: number; // hora local del aviso (por defecto 9:00)
  now?: Date;
  maxEntries?: number; // tope de avisos programados (por defecto 30)
};

/** Interpreta 'YYYY-MM-DD' como fecha LOCAL (new Date('2026-10-02') la tomaría en UTC). */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildCopy(names: string[], daysBefore: number) {
  const when = daysBefore === 1 ? 'mañana' : `en ${daysBefore} días`;
  if (names.length === 1) {
    return { title: `${names[0]} vence ${when}`, body: 'Úsalo primero o pide una receta al Chef IA.' };
  }
  const shown = names.slice(0, 3).join(', ');
  const extra = names.length > 3 ? ` y ${names.length - 3} más` : '';
  return {
    title: `${names.length} alimentos vencen ${when}`,
    body: `${shown}${extra}. Aprovéchalos con una receta del Chef IA.`,
  };
}

export function buildExpiryReminderPlan(items: ReminderSource[], options: ReminderOptions): ReminderPlanEntry[] {
  const daysBefore = Math.max(0, Math.floor(options.daysBefore));
  const hour = options.hour ?? 9;
  const now = options.now ?? new Date();
  const maxEntries = options.maxEntries ?? 30;

  const groups = new Map<string, { fireAt: Date; names: string[] }>();
  for (const item of items) {
    const exp = parseLocalDate(item.expirationDate);
    if (!exp) continue;
    const fireAt = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() - daysBefore, hour, 0, 0, 0);
    if (fireAt.getTime() <= now.getTime()) continue; // nunca avisar en el pasado
    const key = toDayKey(fireAt);
    const group = groups.get(key) ?? { fireAt, names: [] };
    const name = item.name.trim();
    if (name && !group.names.includes(name)) group.names.push(name);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, g]) => g.names.length > 0)
    .sort((a, b) => a[1].fireAt.getTime() - b[1].fireAt.getTime())
    .slice(0, maxEntries)
    .map(([dayKey, g]) => ({ dayKey, fireAt: g.fireAt, itemNames: g.names, ...buildCopy(g.names, daysBefore) }));
}
