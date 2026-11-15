// El juego es SOLO PARA COMPUTADORA: ventana de al menos 1024 px y un puntero fino (mouse o trackpad).
// En celular o tablet se muestra una pantalla con Zinn-IA y un enlace a guia.html (que nunca se bloquea).
// ?forzar=1 salta el bloqueo, SOLO para pruebas (nunca en enlaces públicos).
export const ANCHO_MINIMO = 1024;

/** Regla pura (se prueba en tools/probar-zinnia.mjs). */
export function puedeJugar({ ancho, punteroFino, buscar = '' }) {
  if (new URLSearchParams(buscar).get('forzar') === '1') return true;
  return ancho >= ANCHO_MINIMO && punteroFino;
}

/** Lee la ventana real. Sin ventana (pruebas en Node) se considera computadora. */
export function puedeJugarAhora() {
  if (typeof window === 'undefined') return true;
  return puedeJugar({
    ancho: window.innerWidth,
    punteroFino: window.matchMedia?.('(any-pointer: fine)').matches ?? true,
    buscar: window.location.search,
  });
}
