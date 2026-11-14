// Tutorial de Zinn-IA: cada paso se muestra UNA vez (se recuerda en localStorage).
import PASOS from '../data/tutorial.json' with { type: 'json' };
import { leer, escribir } from './almacen.js';

export { PASOS };

export const leerVistos = () => leer('tutorial_vistos', []);
export const marcarVisto = (id) => escribir('tutorial_vistos', [...new Set([...leerVistos(), id])]);
export const saltarTodo = () => escribir('tutorial_vistos', PASOS.map((p) => p.id));
export const reiniciar = () => escribir('tutorial_vistos', []);

/** Pasos que corresponden a un evento y que aún no se han visto ni están en cola. */
export function pendientes(evento, vistos, enCola = []) {
  return PASOS.filter((p) => p.disparador === evento && !vistos.includes(p.id) && !enCola.includes(p.id));
}
