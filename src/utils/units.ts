import { IngredientUnit } from '../types';

/**
 * Unidades en español (Etapa 3 · Implementación de mockups).
 * `unitShortLabel` es lo que se muestra junto a la cantidad ("500 g", "4 u", "1 L").
 * `unitFullLabel` es lo que se muestra en los selectores del formulario.
 */
const SHORT_LABELS: Record<IngredientUnit, string> = {
  units: 'u',
  grams: 'g',
  kilograms: 'kg',
  milliliters: 'ml',
  liters: 'L',
  package: 'paq',
  unknown: '',
};

const FULL_LABELS: Record<IngredientUnit, string> = {
  units: 'Unidades',
  grams: 'Gramos',
  kilograms: 'Kilogramos',
  milliliters: 'Mililitros',
  liters: 'Litros',
  package: 'Paquete',
  unknown: 'Sin unidad',
};

export function unitShortLabel(unit: IngredientUnit): string {
  return SHORT_LABELS[unit] ?? unit;
}

export function unitFullLabel(unit: IngredientUnit): string {
  return FULL_LABELS[unit] ?? unit;
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
  if (options.long && unit === 'units') return `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`;
  if (options.long && unit === 'package') return `${quantity} ${quantity === 1 ? 'paquete' : 'paquetes'}`;
  const short = unitShortLabel(unit);
  return short ? `${quantity} ${short}` : `${quantity}`;
}
