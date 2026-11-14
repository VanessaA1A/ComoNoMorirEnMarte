// Lecturas de Zinn-IA a partir del estado de la partida. Solo LEE el estado: nunca lo cambia.
import { infoCapitulo } from '../engine/guion.js';
import { BARRAS, colorBarra } from '../engine/reglas.js';

export const NOMBRE_BARRA = {
  oxigeno: 'oxígeno', bateria: 'batería', alimentacion: 'alimentación',
  integridad: 'integridad del traje', radiacion: 'radiación',
};

const CONSEJO_ROJO = {
  oxigeno: 'evita atajos y pendientes; cada esfuerzo gasta aire',
  bateria: 'si llega a 0 me apago y el oxígeno y la comida se gastan el doble',
  alimentacion: 'come en cuanto puedas: con poca energía caminas lento',
  integridad: 'no cruces crestas de frente; un parche o el kit la suben',
  radiacion: 'busca refugio o vuelve: con 70 o más no podrás hacer el viaje a casa',
};

export const barrasEnRojo = (p) => (p?.hud ? BARRAS.filter((b) => colorBarra(b, p[b]) === 'rojo') : []);

/** Lista de frases cortas: "¿Cómo voy?". */
export function comoVoy(p) {
  if (!p) return ['Todavía no empezamos la misión. Toca "Empezar" y te acompaño todo el camino.'];
  const frases = [];
  const info = infoCapitulo(p.capitulo);
  if (p.final) {
    frases.push('La misión terminó. Revisa el resumen para ver qué cambió el resultado.');
    return frases;
  }
  frases.push(`Estás en el capítulo ${p.capitulo}: «${info.titulo}».`);
  if (!p.hud) {
    frases.push('Todavía no activamos tus barras de vida. Falta poquito.');
    return frases;
  }

  let todoVerde = true;
  for (const b of BARRAS) {
    const color = colorBarra(b, p[b]);
    if (color === 'rojo') frases.push(`Tu ${NOMBRE_BARRA[b]} está en rojo (${p[b]}): ${CONSEJO_ROJO[b]}.`);
    else if (color === 'amarillo') frases.push(`Tu ${NOMBRE_BARRA[b]} está en amarillo (${p[b]}): vigílala.`);
    if (color !== 'verde') todoVerde = false;
  }
  if (p.bateria <= 0) frases.push('Estoy en modo emergencia: sin batería el oxígeno y la alimentación se gastan el doble.');
  if (p.integridad > 0 && p.integridad < 30) frases.push('Tu traje tiene una fuga: pierdes 10 de oxígeno en cada decisión.');
  if (p.alimentacion > 0 && p.alimentacion < 30) frases.push('Con tan poca energía cada tramo te toma 50 % más de tiempo.');

  if (p.capitulo >= 3) {
    if (p.minutos < 0) frases.push('El reloj ya está en negativo: el módulo de regreso no te va a esperar.');
    else frases.push(`Te quedan ${p.minutos} minutos para el despegue${p.capitulo < 10 ? ' y aún falta volver a la Base' : ''}.`);
  }
  if (p.capitulo >= 5) frases.push(`Llevas ${p.muestras.length} de 3 muestras.`);
  if (todoVerde) frases.push('Todas tus barras están en verde. ¡Vas muy bien!');
  return frases;
}

/** Expresión de Zinn-IA en su panel según el estado. */
export function expresionZinnia(p) {
  if (!p) return 'feliz';
  if (p.bateria <= 0) return 'apagada';
  if (barrasEnRojo(p).length) return 'alerta';
  if (p.hud && p.capitulo >= 3 && p.minutos < 30) return 'triste';
  return 'feliz';
}

/** Respuesta de "¿Cómo recupero batería?" según lo que queda en la ruta del guion. */
export function comoRecuperoBateria(p) {
  if (!p) return 'Empiezas con la batería al 100 %. En la ruta hay un depósito de suministros y puedes llevar una batería de repuesto.';
  const opciones = [];
  if (p.capitulo < 7 || (p.capitulo === 7 && ['c07_01', 'c07_02'].includes(p.escena))) {
    opciones.push('el depósito de suministros de las crestas (capítulo 7) recarga +30 de batería a cambio de 15 minutos');
  }
  const yaPasoCambio = p.capitulo > 9 || p.escena === 'c09_06';
  if (p.flags.equipo_bateria && !yaPasoCambio) {
    opciones.push('tu batería de repuesto (+40) se puede cambiar en el capítulo 9');
  }
  if (!opciones.length) return 'Ya no quedan fuentes de batería en la ruta. Llega a la Base Aurora cuanto antes: allí me recargo.';
  return `Para recuperar batería: ${opciones.join('; y ')}.`;
}
