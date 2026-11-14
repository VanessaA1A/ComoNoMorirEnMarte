// Reemplaza marcadores del guion:
//   {nombre}   -> nombre del jugador
//   {muestras} -> número de muestras
//   {a|b|c}    -> forma para él / ella / elle (cualquier palabra: list{o|a|e}, {el|la|le}...)
const INDICE = { el: 0, ella: 1, elle: 2 };

export function formatear(texto, estado) {
  if (!texto) return '';
  const i = INDICE[estado?.pronombre] ?? 0;
  return texto
    .replaceAll('{nombre}', estado?.nombre || 'astronauta')
    .replaceAll('{muestras}', String(estado?.muestras?.length ?? 0))
    .replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, (_, a, b, c) => [a, b, c][i]);
}
