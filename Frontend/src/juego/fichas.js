// Fichas = datos del banco (datos.json) con uso "F". Se desbloquean así:
//   - al entrar a un capítulo: los datos cuyo "capitulo" incluye ese número ("2, 9" sirve para 2 y 9)
//   - al abrir el Mapa de Marte: los de "Mapa"
//   - al ver un final: los de "Final"
import DATOS from '../data/datos.json' with { type: 'json' };

export const esFicha = (d) => /F/.test(d.uso || '');

export const fichasDe = (datos = DATOS) => datos.filter(esFicha);

/** ids de las fichas que se desbloquean con una clave: número de capítulo, "Mapa" o "Final". */
export function fichasPara(clave, datos = DATOS) {
  const buscada = String(clave);
  return fichasDe(datos)
    .filter((d) => String(d.capitulo ?? '').split(',').map((s) => s.trim()).includes(buscada))
    .map((d) => d.id);
}
