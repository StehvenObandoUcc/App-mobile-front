/**
 * Descuento de ingredientes al preparar una receta y disponibilidad de recetas frente a la despensa
 * (lógica pura, sin imports para poder probarla con node --test).
 *
 * - Empareja cada ingrediente de la receta con uno de la despensa: primero por `inventoryIngredientId`,
 *   luego por nombre exacto (sin tildes ni mayúsculas) y por último por nombre contenido.
 * - Convierte unidades de la misma familia: g ↔ kg y ml ↔ L. «500 g» de 1 kg deja 500 g.
 * - Si las unidades no son compatibles (p. ej. «2 unidades» contra «1 kg»), si la receta no dice cantidad
 *   o si la despensa no tiene cantidad, NO toca ese alimento y lo reporta en `skipped` para que el usuario lo ajuste.
 * - Si lo que queda es 0 o menos, el alimento NO se borra: queda en 0 («Sin stock») para que el usuario
 *   decida si lo repone o lo elimina. Los que ya están en 0 no se emparejan.
 */
type Unit = 'units' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'package' | 'unknown';

export type ConsumptionInventoryItem = { id: string; name: string; quantity: number | null; unit: Unit };
export type ConsumptionRequest = {
  name: string;
  quantity: number | null;
  unit: Unit;
  inventoryIngredientId?: string | null;
};

export type ConsumptionPlan = {
  updates: { id: string; quantity: number; unit: Unit }[];
  /** Se mantiene por compatibilidad: siempre vacío (ya no se borra nada al descontar). */
  deletes: string[];
  /** Alimentos que quedaron en 0 (agotados). */
  depleted: string[];
  /** Nombres de la despensa que se descontaron (para el mensaje final). */
  consumed: string[];
  /** Nombres de la receta que no se pudieron descontar automáticamente. */
  skipped: string[];
};

const FACTOR: Partial<Record<Unit, { family: 'mass' | 'volume'; toBase: number }>> = {
  grams: { family: 'mass', toBase: 1 },
  kilograms: { family: 'mass', toBase: 1000 },
  milliliters: { family: 'volume', toBase: 1 },
  liters: { family: 'volume', toBase: 1000 },
};

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convierte `quantity` de `from` a `to`. Devuelve null si no son convertibles. */
export function convertQuantity(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to || from === 'unknown') return quantity; // «unknown» = la IA no dio unidad: se asume la de la despensa
  const a = FACTOR[from];
  const b = FACTOR[to];
  if (!a || !b || a.family !== b.family) return null;
  return (quantity * a.toBase) / b.toBase;
}

const round = (n: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/** Expresa el sobrante en la unidad más legible: 0,5 kg → 500 g; 0,25 L → 250 ml. */
export function tidyQuantity(quantity: number, unit: Unit): { quantity: number; unit: Unit } {
  if (unit === 'kilograms' && quantity < 1) return { quantity: round(quantity * 1000, 0), unit: 'grams' };
  if (unit === 'liters' && quantity < 1) return { quantity: round(quantity * 1000, 0), unit: 'milliliters' };
  if (unit === 'grams' || unit === 'milliliters') return { quantity: round(quantity, 0), unit };
  if (unit === 'kilograms' || unit === 'liters') return { quantity: round(quantity, 3), unit };
  return { quantity: round(quantity, 2), unit };
}

/**
 * Alimento de la despensa que corresponde a un ingrediente de receta, o undefined.
 * Es la MISMA regla para «¿lo tienes?» (disponibilidad de recetas) y para «¿de dónde descuento?» (preparar):
 * si la app dice que lo tienes, es porque al cocinar lo descontará de ese alimento.
 * Solo cuenta lo que tiene existencias (los agotados, en 0, no se pueden usar).
 */
export function findPantryMatch<T extends { id: string; name: string; quantity: number | null }>(
  pantry: T[],
  req: { name: string; inventoryIngredientId?: string | null }
): T | undefined {
  const alive = pantry.filter((i) => i.quantity !== 0);
  if (req.inventoryIngredientId) {
    const byId = alive.find((i) => i.id === req.inventoryIngredientId);
    if (byId) return byId;
  }
  const target = normalizeName(req.name);
  if (!target) return undefined;
  return (
    alive.find((i) => normalizeName(i.name) === target) ??
    alive.find((i) => {
      const current = normalizeName(i.name);
      return current.includes(target) || target.includes(current);
    })
  );
}

export function planConsumption(
  inventory: ConsumptionInventoryItem[],
  requests: ConsumptionRequest[]
): ConsumptionPlan {
  // Copia de trabajo: dos ingredientes de la receta pueden descontar del mismo alimento.
  const working = new Map(inventory.map((i) => [i.id, { ...i }]));
  const depleted = new Set<string>();
  const consumed: string[] = [];
  const skipped: string[] = [];

  for (const req of requests) {
    const match = findPantryMatch([...working.values()], req);
    if (!match) continue; // no está en la despensa: nada que descontar
    if (req.quantity === null || req.quantity <= 0 || match.quantity === null) {
      skipped.push(req.name);
      continue;
    }
    const used = convertQuantity(req.quantity, req.unit, match.unit);
    if (used === null) {
      skipped.push(req.name);
      continue;
    }
    const left = match.quantity - used;
    if (!consumed.includes(match.name)) consumed.push(match.name);
    if (left <= 1e-6) {
      match.quantity = 0;
      depleted.add(match.id);
    } else {
      const tidy = tidyQuantity(left, match.unit);
      match.quantity = tidy.quantity;
      match.unit = tidy.unit;
    }
  }

  const updates: ConsumptionPlan['updates'] = [];
  for (const original of inventory) {
    const w = working.get(original.id)!;
    if (w.quantity !== original.quantity || w.unit !== original.unit) {
      updates.push({ id: w.id, quantity: w.quantity as number, unit: w.unit });
    }
  }
  return { updates, deletes: [], depleted: [...depleted], consumed, skipped };
}

// Disponibilidad de recetas frente a la despensa actual: el «matchScore» de la IA queda congelado al generar,
// así que se recalcula en cada uso con el mismo emparejamiento que el descuento al preparar.

type AvailabilityIngredient = { name: string; isOptional?: boolean; inventoryIngredientId?: string | null };

export type RecipeAvailability<I> = {
  available: I[];
  missing: I[];
  /** Ingredientes obligatorios que no tienes (los opcionales no bloquean). */
  missingRequired: number;
  requiredTotal: number;
  /** % de ingredientes obligatorios que tienes (0–100). */
  score: number;
};


export function computeRecipeAvailability<I extends AvailabilityIngredient>(
  ingredients: I[],
  pantry: { id: string; name: string; quantity: number | null }[]
): RecipeAvailability<I> {
  const available: I[] = [];
  const missing: I[] = [];
  for (const ing of ingredients) {
    const match = findPantryMatch(pantry, ing);
    // El vínculo con la despensa se actualiza: si el alimento original ya no está, apunta al que sí coincide.
    if (match) available.push({ ...ing, isAvailable: true, inventoryIngredientId: match.id });
    else missing.push({ ...ing, isAvailable: false });
  }
  const requiredTotal = ingredients.filter((i) => !i.isOptional).length;
  const missingRequired = missing.filter((i) => !i.isOptional).length;
  const score = requiredTotal === 0 ? 0 : Math.round(((requiredTotal - missingRequired) / requiredTotal) * 100);
  return { available, missing, missingRequired, requiredTotal, score };
}

/**
 * Receta con sus listas «tienes / te falta» y su porcentaje recalculados contra la despensa actual.
 * Si la receta no trae ingredientes (datos antiguos), se deja tal cual.
 */
export function withLiveAvailability<
  I extends AvailabilityIngredient,
  R extends { availableIngredients: I[]; missingIngredients: I[]; matchScore: number }
>(recipe: R, pantry: { id: string; name: string; quantity: number | null }[]): R {
  const all = [...(recipe.availableIngredients || []), ...(recipe.missingIngredients || [])];
  if (all.length === 0) return recipe;
  const a = computeRecipeAvailability(all, pantry);
  return { ...recipe, availableIngredients: a.available, missingIngredients: a.missing, matchScore: a.score } as R;
}

/** Faltantes obligatorios de una receta ya recalculada (para ordenar y filtrar). */
export const missingRequiredOf = (recipe: { missingIngredients: AvailabilityIngredient[] }) =>
  (recipe.missingIngredients || []).filter((i) => !i.isOptional).length;

/** Regla ÚNICA de «la puedes cocinar»: no te falta ningún ingrediente obligatorio. */
export const isCookable = (recipe: { missingIngredients: AvailabilityIngredient[] }) => missingRequiredOf(recipe) === 0;

/** Regla ÚNICA de «te falta poco»: a lo sumo un ingrediente obligatorio (Inicio y filtro «Mayor coincidencia»). */
export const ALMOST_MISSING_MAX = 1;
export const isAlmostCookable = (recipe: { missingIngredients: AvailabilityIngredient[] }) =>
  missingRequiredOf(recipe) <= ALMOST_MISSING_MAX;
