/**
 * Visibilidad de la barra de navegación inferior (AppBottomNav).
 *
 * La nav vive en app/_layout.tsx por encima de todas las pantallas, así que una barra flotante
 * de una pantalla (p. ej. la de acciones del modo selección) quedaría debajo. Mientras una
 * pantalla la necesite oculta, llama a `hideBottomNav()`; la función devuelta la vuelve a mostrar.
 * Se cuentan las peticiones para que dos pantallas no se pisen.
 */
type Listener = () => void;

let hideRequests = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function hideBottomNav(): () => void {
  hideRequests += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    hideRequests = Math.max(0, hideRequests - 1);
    emit();
  };
}

export function isBottomNavHidden(): boolean {
  return hideRequests > 0;
}

export function subscribeBottomNav(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
