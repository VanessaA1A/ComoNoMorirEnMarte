// El juego es SOLO PARA COMPUTADORA (mouse o trackpad). En celular o tablet se muestra una pantalla con
// Zinn-IA y un enlace a guia.html (que nunca se bloquea).
// Se decide por el DISPOSITIVO, no por el ancho de la ventana: en una computadora la ventana puede quedar
// angosta (media pantalla, DevTools abierto, zoom del navegador o escala de Windows de 125–150 %), y el
// escenario 16:9 se escala solo. Antes se bloqueaba por debajo de 1024 px y salía el aviso en computadoras.
//   computadora = tiene un puntero fino (mouse o trackpad) Y su puntero principal no es el dedo.
//   (Una laptop con pantalla táctil tiene trackpad como puntero principal: se juega. Un celular con lápiz
//    tiene puntero fino, pero su puntero principal es el dedo: se bloquea.)
// ?forzar=1 salta el bloqueo, SOLO para pruebas (nunca en enlaces públicos).

/** Regla pura (se prueba en tools/probar-zinnia.mjs). */
export function puedeJugar({ punteroFino, principalTactil = false, buscar = '' }) {
  if (new URLSearchParams(buscar).get('forzar') === '1') return true;
  return Boolean(punteroFino) && !principalTactil;
}

/** Lee el dispositivo real. Sin ventana (pruebas en Node) se considera computadora. */
export function puedeJugarAhora() {
  if (typeof window === 'undefined') return true;
  return puedeJugar({
    punteroFino: window.matchMedia?.('(any-pointer: fine)').matches ?? true,
    principalTactil: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    buscar: window.location.search,
  });
}
