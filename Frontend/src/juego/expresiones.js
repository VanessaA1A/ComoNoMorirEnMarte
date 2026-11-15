// Expresiones de Zinn-IA: lista FIJA (una imagen por expresión en public/zinnia/<expresion>.png)
// y las reglas para elegir cuál mostrar. Lo usan ZinniaAvatar, la escena, el panel, el chat y las pruebas.
import { BARRAS, colorBarra } from '../engine/reglas.js';

export const EXPRESIONES = ['normal', 'ojos-cerrados', 'seria', 'asustada', 'enojada', 'llorona'];
export const POR_DEFECTO = 'normal';

/** Ruta pública de cada expresión (exactamente así se llaman los archivos: minúsculas, sin espacios ni acentos). */
export const RUTA_ZINNIA = '/zinnia';
export const rutaExpresion = (e) => `${RUTA_ZINNIA}/${expresionValida(e)}.png`;

/** Nombres anteriores del guion y del tutorial (feliz, curiosa, alerta, peligro, triste...) → expresión nueva. */
export const DE_ANTES = {
  feliz: 'normal', curiosa: 'normal', inicio: 'normal',
  alerta: 'seria', peligro: 'asustada', triste: 'llorona', apagada: 'ojos-cerrados',
};

/** Cualquier valor → una de las 6. Lo desconocido (o vacío) cae en normal, nunca en otra imagen. */
export function expresionValida(e) {
  if (EXPRESIONES.includes(e)) return e;
  return DE_ANTES[e] ?? POR_DEFECTO;
}

/** Recursos: alguna barra en rojo → asustada; alguna en amarillo → seria; si no, normal. */
export function porRecursos(p) {
  if (!p?.hud) return POR_DEFECTO;
  const colores = BARRAS.map((b) => colorBarra(b, p[b]));
  if (colores.includes('rojo')) return 'asustada';
  if (colores.includes('amarillo')) return 'seria';
  return POR_DEFECTO;
}

const GRAVEDAD = { normal: 0, 'ojos-cerrados': 0, seria: 1, enojada: 2, asustada: 3, llorona: 4 };
const masGrave = (a, b) => (GRAVEDAD[b] > GRAVEDAD[a] ? b : a);

/**
 * Expresión en una escena del guion.
 * - Batería en 0: modo semilla (ojos cerrados, apagada).
 * - Reacción del momento (riesgo elegido, pérdida de recurso) si la hay.
 * - Si Zinn-IA habla: el campo "expresion" de su línea (o normal; con una barra en rojo, asustada).
 * - Si habla otro o es narración: la de la escena y la de los recursos, la más grave.
 */
export function expresionEscena({ partida, escena, linea, reaccion }) {
  if (partida?.bateria <= 0) return { expresion: 'ojos-cerrados', apagada: true };
  if (reaccion) return { expresion: expresionValida(reaccion), apagada: false };
  const recursos = escena?.esFinal ? POR_DEFECTO : porRecursos(partida);
  if (linea?.quien === 'Zinn-IA') {
    const propia = linea.expresion ? expresionValida(linea.expresion) : null;
    return { expresion: propia ?? (recursos === 'asustada' ? 'asustada' : POR_DEFECTO), apagada: false };
  }
  return { expresion: masGrave(expresionValida(escena?.zinnia), recursos), apagada: false };
}

/** Expresión del panel y de la carita flotante: semilla, pensando (ojos cerrados), la de la última respuesta, o la de los recursos. */
export function expresionPanel(p, { pensando, ultima } = {}) {
  if (p?.bateria <= 0) return { expresion: 'ojos-cerrados', apagada: true };
  if (pensando) return { expresion: 'ojos-cerrados', apagada: false };
  const recursos = porRecursos(p);
  if (ultima?.rol === 'zinnia' && ultima.expresion) return { expresion: masGrave(expresionValida(ultima.expresion), recursos === 'asustada' ? 'asustada' : POR_DEFECTO), apagada: false };
  if (p?.hud && p.capitulo >= 3 && p.minutos < 30) return { expresion: masGrave('seria', recursos), apagada: false };
  return { expresion: recursos, apagada: false };
}

/**
 * Chat sin IA (respaldo): reglas simples sobre el texto que va a decir.
 * chiste → normal; tristeza o despedida → llorona; peligro → asustada; advertencia → seria.
 */
export function expresionRespaldo(texto = '', { chiste = false, p = null } = {}) {
  if (p?.bateria <= 0) return 'ojos-cerrados';
  const t = String(texto).toLowerCase();
  if (chiste) return 'normal';
  if (/\b(lo siento|adiós|adios|hasta pronto|te extraño|qué pena|que pena)\b/.test(t)) return 'llorona';
  if (/\b(peligro|tormenta|partículas solares|evento solar|cr[ií]tic|en rojo|fuga|rasgadura|pendiente peligrosa|te desmayas)\b/.test(t)) return 'asustada';
  if (/\b(ojo|cuidado|atención|advertencia|no te|evita|revisa|amarillo|radiación|el reloj|quedan? \d+ min)/.test(t)) return 'seria';
  return porRecursos(p) === 'asustada' ? 'asustada' : 'normal';
}
