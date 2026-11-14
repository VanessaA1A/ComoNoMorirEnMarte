// Ranuras de guardado en el navegador. 0 = autoguardado, 1–3 = manuales.
// Se guarda el estado del motor TAL CUAL + la línea del diálogo: al cargar no se repiten efectos.
import { infoCapitulo } from '../engine/guion.js';
import { leer, escribir, borrar } from './almacen.js';

export const RANURAS = [0, 1, 2, 3];

export const leerRanura = (n) => leer(`ranura_${n}`);

export function escribirRanura(n, estado, linea = 0) {
  const ranura = {
    estado, linea,
    fecha: new Date().toISOString(),
    capitulo: estado.capitulo,
    titulo: infoCapitulo(estado.capitulo)?.titulo ?? '',
  };
  escribir(`ranura_${n}`, ranura);
  return ranura;
}

export const borrarRanura = (n) => borrar(`ranura_${n}`);
export const hayAutoguardado = () => !!leerRanura(0);
