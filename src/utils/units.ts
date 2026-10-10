import { IngredientUnit } from '../types';
import { t, tp } from '../i18n';

/**
 * Unidades (Etapa 3 · Implementación de mockups), traducidas con i18n.
 * `unitShortLabel` es lo que se muestra junto a la cantidad ("500 g", "4 u", "1 L").
 * `unitFullLabel` es lo que se muestra en los selectores del formulario.
 */
const KNOWN_UNITS: readonly string[] = ['units', 'grams', 'kilograms', 'milliliters', 'liters', 'package', 'unknown'];

export function unitShortLabel(unit: IngredientUnit): string {
  return KNOWN_UNITS.includes(unit) ? t(`misc.units.short.${unit}`) : unit;
}

export function unitFullLabel(unit: IngredientUnit): string {
  return KNOWN_UNITS.includes(unit) ? t(`misc.units.full.${unit}`) : unit;
}

/**
 * "500 g", "4 u", "1 L", "—" si no hay cantidad.
 * Con `long: true` las unidades contables se escriben completas: "4 unidades", "1 paquete".
 */
export function formatQuantity(
  quantity: number | null,
  unit: IngredientUnit,
  options: { long?: boolean } = {}
): string {
  if (quantity === null) return '—';
  if (options.long && unit === 'units') return tp('misc.units.unit', quantity);
  if (options.long && unit === 'package') return tp('misc.units.package', quantity);
  const short = unitShortLabel(unit);
  return short ? `${quantity} ${short}` : `${quantity}`;
}
