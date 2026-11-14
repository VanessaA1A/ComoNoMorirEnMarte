// Ranuras de guardado en el navegador (localStorage, una clave por ranura: cnmm_ranura_0 … cnmm_ranura_3).
//   0 = autoguardado (en cada cambio de escena y después de cada decisión) · 1–3 = manuales.
// Se guarda el estado del motor TAL CUAL + la línea del diálogo: al cargar NO se repite el efecto de la escena.
import { infoCapitulo } from '../engine/guion.js';
import { leer, escribir, borrar } from './almacen.js';

export const RANURAS = [0, 1, 2, 3];
export const AUTOGUARDADO = 0;

export const leerRanura = (n) => {
  const r = leer(`ranura_${n}`);
  return r?.estado?.escena ? r : null; // una ranura dañada cuenta como vacía
};

/**
 * Guarda una ranura. Devuelve la ranura guardada, o null si el navegador no permitió guardar.
 * `jugado` = segundos de juego acumulados en esa partida (se muestran en el panel de Cargar).
 */
export function escribirRanura(n, estado, linea = 0, jugado = 0) {
  const ranura = {
    version: 1,
    estado,                                   // estado completo del motor
    linea,                                    // línea del diálogo donde estaba
    jugado,                                   // segundos de juego
    escena: estado.escena,                    // para mostrar en Cargar sin abrir el estado
    nombre: estado.nombre ?? '',
    pronombre: estado.pronombre ?? 'el',
    capitulo: estado.capitulo,
    titulo: infoCapitulo(estado.capitulo)?.titulo ?? '',
    fecha: new Date().toISOString(),
  };
  return escribir(`ranura_${n}`, ranura) ? ranura : null;
}

export const borrarRanura = (n) => borrar(`ranura_${n}`);
export const hayAutoguardado = () => Boolean(leerRanura(AUTOGUARDADO));
