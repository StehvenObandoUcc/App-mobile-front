/**
 * Utilidades compartidas de normalización y coincidencia léxica 100% local.
 * Cero costos de red, cero tokens consumidos.
 */

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'con', 'sin', 'para', 'por', 'del', 'al', 'alimento', 'producto', 'botella', 'lata',
  'paquete', 'fresco', 'fresca', 'natural',
]);

export function getKeywords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export type MatchResult<T> = {
  item: T;
  score: number;
  isExact: boolean;
  isAmbiguous: boolean;
};

/**
 * Busca si un nombre tiene un ítem coincidente dentro de una lista.
 * - `isExact = true`: Coincidencia idéntica o de plural (ej. "tomate" vs "tomates"). Fusión segura automática.
 * - `isAmbiguous = true`: Coincidencia parcial con palabras diferenciadoras (ej. "leche entera" vs "leche deslactosada"). No fusionar sin confirmación.
 */
export function findSimilarItem<T extends { name: string }>(
  targetName: string,
  existingItems: T[]
): MatchResult<T> | null {
  const normTarget = normalizeText(targetName);
  const targetWords = getKeywords(targetName);

  if (!normTarget && targetWords.length === 0) return null;

  let bestMatch: T | null = null;
  let bestScore = 0;
  let isExact = false;

  for (const item of existingItems) {
    const normItem = normalizeText(item.name);
    const itemWords = getKeywords(item.name);

    // 1. Coincidencia idéntica exacta
    if (normTarget === normItem) {
      return { item, score: 1.0, isExact: true, isAmbiguous: false };
    }

    // 2. Coincidencia de plural/singular simple (ej: tomate / tomates)
    const isPlural1 = normTarget.endsWith('s') && normTarget.slice(0, -1) === normItem;
    const isPlural2 = normItem.endsWith('s') && normItem.slice(0, -1) === normTarget;
    const isPluralEs1 = normTarget.endsWith('es') && normTarget.slice(0, -2) === normItem;
    const isPluralEs2 = normItem.endsWith('es') && normItem.slice(0, -2) === normTarget;

    if (isPlural1 || isPlural2 || isPluralEs1 || isPluralEs2) {
      return { item, score: 0.98, isExact: true, isAmbiguous: false };
    }

    // 3. Contención de subcadena
    if (normTarget.includes(normItem) || normItem.includes(normTarget)) {
      const score = 0.85;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // 4. Coincidencia por palabras clave
    if (targetWords.length > 0 && itemWords.length > 0) {
      const commonWords = targetWords.filter((w) => itemWords.includes(w));
      const score = (commonWords.length * 2) / (targetWords.length + itemWords.length);
      if (score >= 0.5 && score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }
  }

  if (!bestMatch || bestScore < 0.5) return null;

  // Si no fue exacto pero tiene score alto, es ambiguo
  return {
    item: bestMatch,
    score: bestScore,
    isExact: false,
    isAmbiguous: true,
  };
}
