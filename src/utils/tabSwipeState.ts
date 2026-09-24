/**
 * Estado compartido de transición entre pestañas principales.
 * Permite distinguir navegaciones iniciadas por gesto físico (swipe)
 * de pulsaciones directas (tap en barra de navegación), evitando animaciones
 * no deseadas en pulsaciones directas conforme a los estándares de UX y Ponytail.
 */

export const MAIN_TABS = ['/', '/inventory', '/recipes', '/shopping-list'] as const;

export type MainTabPath = (typeof MAIN_TABS)[number];

let isSwipe = false;
let swipeDirection: -1 | 1 = 1;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Marca que la navegación fue originada por un gesto interactivo de deslizamiento.
 * @param direction 1 = hacia la derecha / pestaña siguiente; -1 = hacia la izquierda / pestaña anterior
 */
export function setSwipeNavigation(direction: -1 | 1) {
  isSwipe = true;
  swipeDirection = direction;
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    isSwipe = false;
  }, 320);
}

/**
 * Retorna si la navegación actual fue motivada por un gesto de deslizamiento y su dirección.
 */
export function getSwipeTransition(): { isSwipe: boolean; direction: -1 | 1 } {
  return { isSwipe, direction: swipeDirection };
}
