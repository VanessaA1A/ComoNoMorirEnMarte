// Reemplaza marcadores del guion:
//   {nombre}   -> nombre del jugador
//   {muestras} -> número de muestras
//   {a|b|c}    -> forma para él / ella / elle (cualquier palabra: list{o|a|e}, {el|la|le}...)
//   Si el jugador todavía no eligió pronombre (sin partida, o en c01_01 / c01_02), se muestran
//   las 3 formas (viv{o|a|e} -> "vivo/a/e") en vez de suponer "él".
const INDICE = { el: 0, ella: 1, elle: 2 };
export const ANTES_DEL_PRONOMBRE = new Set(['c01_01', 'c01_02']);

export const pronombreElegido = (estado) =>
  Boolean(estado && estado.pronombre in INDICE && !ANTES_DEL_PRONOMBRE.has(estado.escena));

export function formatear(texto, estado) {
  if (!texto) return '';
  const i = pronombreElegido(estado) ? INDICE[estado.pronombre] : null;
  return texto
    .replaceAll('{nombre}', estado?.nombre || 'astronauta')
    .replaceAll('{muestras}', String(estado?.muestras?.length ?? 0))
    .replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, (_, a, b, c) => (i === null ? `${a}/${b}/${c}` : [a, b, c][i]));
}
