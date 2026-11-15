// Chat con Zinn-IA. El historial vive en memoria (no se guarda en ningún lado) y se envían solo los últimos 12.
// Con IA: POST /api/zinnia/chat. RESPALDO (sin conexión, 503, 429, error o tiempo agotado): respuestas fijas
// de los datos del juego (glosario, fichas, guía y preguntas frecuentes) + "(modo sin conexión)".
// Nada de esto cambia el estado ni las reglas del juego.
import { chatZinnia } from '../api.js';
import { formatear, pronombreElegido } from '../engine/texto.js';
import { BARRAS, colorBarra } from '../engine/reglas.js';
import { comoVoy } from './comoVoy.js';
import GLOSARIO from '../data/glosario.json' with { type: 'json' };
import DATOS from '../data/datos.json' with { type: 'json' };
import CHISTES from '../data/chistes.json' with { type: 'json' };
import RESPUESTAS from '../data/zinnia_respuestas.json' with { type: 'json' };
import GUIA from '../../public/data/guia_supervivencia.json' with { type: 'json' };
import { fragmentosGuia } from './guiaConocimiento.js';

export const MAX_TEXTO = 500;
export const MAX_ENVIADOS = 12;
export const SIN_CONEXION = '(modo sin conexión)';
export const PEDIR_CHISTE = 'Cuéntame un chiste malo';
// Regla del juego: con la batería en 0 Zinn-IA "se apaga" (modo semilla) y no responde preguntas libres
export const SEMILLA = 'Batería en cero: no puedo pensar bien. Busca en la Guía o cambia la batería.';
export const enSemilla = (p) => Boolean(p?.hud && !p.final && p.bateria <= 0);

// ---------- historial en memoria (sobrevive a cerrar y abrir el panel; no a recargar la página) ----------
// modo: de dónde vino la última respuesta ('ia' = IA en vivo, 'respaldo' = sin conexión, null = todavía nada)
let estado = { mensajes: [], pensando: false, modo: null };
const oyentes = new Set();
const cambiar = (c) => { estado = { ...estado, ...c }; oyentes.forEach((f) => f()); };
export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const leerChat = () => estado;
export const reiniciarChat = () => { estado = { mensajes: [], pensando: false, modo: null }; ultimosChistes = []; fijas = 0; oyentes.forEach((f) => f()); };
let siguienteId = 1;

// ---------- contexto para el agente (sale de la partida; sin datos personales más allá del nombre elegido) ----------
export function contextoDe(p, fichas = []) {
  if (!p) return { fichasDesbloqueadas: fichas };
  const c = { capitulo: p.capitulo, escenaId: p.escena, nombre: p.nombre || null, pronombre: pronombreElegido(p) ? p.pronombre : null, fichasDesbloqueadas: fichas.slice(0, 100) };
  if (p.hud) { BARRAS.forEach((b) => { c[b] = Math.round(p[b]); }); c.minutos = p.minutos; c.muestras = p.muestras?.length ?? 0; }
  return c;
}

// ---------- RESPALDO ----------
// Busca en las preguntas frecuentes, el glosario, las fichas (datos.json) y la Guía de supervivencia.
// Tres salidas: dato encontrado (con su fuente) · tema de Marte sin dato verificado (lo dice y sugiere una parte
// de la Guía) · fuera de tema (responde con cariño y vuelve a Marte). Nunca un error técnico.
const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const VACIAS = new Set(('a al como con cual cuales de del donde el en es esta este esto hay la las lo los me mi no o para por que se si su te tu un una y yo'
  + ' son ser fue era muy mas pero sin sobre cuanto cuanta cuantos cuantas quien quienes cuando dime cuentame sabes puedes explica explicame quiero saber'
  + ' hazme haz dame algo eso esa ese hola gracias marte paso pasa pasaron ocurrio ocurre significa tiene tienen llama puedo puede pueden hago hace'
  + ' the a an of in on is are what how why does do tell me about mars many much there was were has have').split(' '));
// Un poco de inglés: la palabra se cambia por la que sí aparece en los datos (se responde en español)
const INGLES = {
  day: 'dia', long: 'dura', dust: 'polvo', storm: 'tormenta', radiation: 'radiacion', water: 'agua', life: 'vida', map: 'mapa',
  layer: 'capa', gravity: 'gravedad', moon: 'luna', moons: 'luna', cold: 'frio', temperature: 'temperatura', ice: 'hielo', red: 'rojo',
  rock: 'roca', rocks: 'roca', sand: 'arena', oxygen: 'oxigeno', battery: 'bateria', suit: 'traje', air: 'aire', breathe: 'respirar',
  highest: 'alto', mountain: 'montana', volcano: 'olympus', year: 'ano', pressure: 'presion', soil: 'suelo', wind: 'viento',
};
const raiz = (w) => (w.length > 5 ? w.replace(/(es|s)$/, '') : w);
const palabras = (t) => normalizar(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VACIAS.has(w)).map((w) => raiz(INGLES[w] ?? w));
const prefijo = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const parecidas = (a, b) => a === b || (a.length > 4 && b.length > 4 && prefijo(a, b) >= Math.max(5, Math.ceil(Math.min(a.length, b.length) * 0.75)));

const ENTRADAS = [
  ...RESPUESTAS.filter((r) => !r.dinamica).map((r) => ({ clave: `${r.pregunta} ${r.respuesta}`, titulo: r.pregunta, texto: r.respuesta, fuente: r.fuente || null })),
  ...GLOSARIO.map((g) => ({ clave: `${g.termino} ${g.definicion}`, titulo: g.termino, texto: `${g.termino}: ${g.definicion}`, fuente: null })),
  ...DATOS.map((d) => ({ clave: d.texto, titulo: d.id, texto: d.texto, fuente: d.fuente, ficha: d.id })),
  ...fragmentosGuia(GUIA).map((f) => ({ clave: `${f.subtitulo ?? ''} ${f.texto}`, titulo: f.lema ?? f.subtitulo ?? f.parte, texto: f.texto, fuente: f.fuente, parte: f.parte })),
].map((e) => ({ ...e, bolsa: [...new Set(palabras(e.clave))], tit: new Set(palabras(e.titulo)) }));

// Rareza de cada palabra (las raras pesan más: "perclorato" vale más que "agua")
const DF = new Map();
ENTRADAS.forEach((e) => e.bolsa.forEach((w) => DF.set(w, (DF.get(w) ?? 0) + 1)));
const peso = (w) => Math.log((ENTRADAS.length + 1) / (1 + (DF.get(w) ?? 0)));
const enBolsa = (e, w) => e.bolsa.some((b) => parecidas(b, w));
// Vocabulario SOLO de Marte, sus misiones y el juego: si la pregunta lo tiene y no hay dato, se dice
// "eso no está en mis datos verificados". Cualquier otro tema (la Tierra, el espacio en general, ciencia,
// matemáticas…) se responde con IA; sin IA, Zinn-IA dice con amabilidad que esa pregunta necesita conexión.
const TEMA = new RegExp(String.raw`\b(marte|mars|marcian\w*|nasa|rover\w*|curiosity|perseverance|opportunity|spirit|zhurong|viking|phoenix|gale|jezero`
  + String.raw`|mount sharp|aeolis|olympus|valles marineris|hellas|boxwork|cresta\w*|hondonada\w*|perclorat\w*|fobos|deimos|areoide|hirise|mola|themis|crism|rad|rems`
  + String.raw`|oxigeno|radiacion|bateria|traje|barras?|reloj|mapas?|capas?|zinn-ia|zinnia|capitulo|muestras?|guia|fichas?|base aurora|aurora-1|modulo de regreso|deposito)\b`);
const TAREA = /\b(tarea|tareas|deberes|homework|examen|ecuacion|resuelve|resolver)\b/;
// Preguntas de cantidad ("¿cuántos…?"): el dato tiene que tener TODAS las palabras, si no se inventaría una cifra
const CANTIDAD = /\b(cuant[oa]s?|how (many|much))\b/;

/** Mejor entrada para la pregunta, o { parcial } con la entrada que más se acercó (para sugerir dónde buscar). */
export function buscarRespaldo(pregunta) {
  const q = [...new Set(palabras(pregunta))];
  if (!q.length) return { entrada: null, parcial: null, palabras: q };
  let mejor = null;
  for (const e of ENTRADAS) {
    const halladas = q.filter((w) => enBolsa(e, w));
    if (!halladas.length) continue;
    const puntos = halladas.reduce((s, w) => s + peso(w) + (e.tit.has(w) ? peso(w) / 2 : 0), 0);
    // cobertura ponderada: las palabras raras cuentan más que las comunes
    const cobertura = halladas.reduce((s, w) => s + peso(w), 0) / q.reduce((s, w) => s + peso(w), 0);
    const todas = halladas.length === q.length;
    const enTitulo = halladas.some((w) => e.tit.has(w));
    if (!mejor || cobertura > mejor.cobertura + 1e-9 || (Math.abs(cobertura - mejor.cobertura) < 1e-9 && puntos > mejor.puntos)) mejor = { e, puntos, cobertura, todas, enTitulo };
  }
  // Preguntas de cantidad: todas las palabras y el tema en el título del dato. Las demás: al menos 70 % del peso de la pregunta.
  const basta = mejor && (CANTIDAD.test(normalizar(pregunta)) ? mejor.todas && mejor.enTitulo : mejor.cobertura >= 0.7);
  return { entrada: basta ? mejor.e : null, parcial: mejor?.e ?? null, palabras: q };
}

export const SIN_DATO = 'Eso no está en mis datos verificados';
export const NECESITA_CONEXION = 'necesita conexión';
// Otros temas sin IA: con amabilidad, dice que esa pregunta necesita conexión (con IA sí la responde) y sugiere la Guía
const FUERA_DE_TEMA = [
  '¡Qué buena pregunta! Para pensarla bien necesito conexión con la Tierra, y ahora no la tengo.',
  'Jiji, esa pregunta necesita conexión: sin señal solo me queda mi memoria de Marte.',
  'Ay, me encantaría responderte, pero esa pregunta necesita conexión con la Tierra.',
];
const PRESENTACION = 'Soy Zinn-IA, una inteligencia artificial con forma de flor. Te acompaño en tu caminata por Marte: leo tus barras, te explico el mapa y te cuento datos verificados de la NASA. Y chistes malos, muy malos.';
const PARTES_GENERALES = ['Parte 5 · Para mentes científicas: qué buscar', 'Parte 4 · Marte en datos'];

// Remates bobos cortos (1 de cada 3 respuestas fijas). Blanco: Marte, los rovers o Zinn-IA. Sin género hacia el jugador.
export const REMATES = [
  '¡Jiji! Me emocioné tanto que se me movieron los pétalos.',
  'Perdón, es que me encantan las rocas. Sigo.',
  'Si los rovers tuvieran pétalos, estarían tan felices como yo.',
  'Lo anoto en mi tallo para no olvidarlo. Bueno, en mi memoria. En mi tallo-memoria.',
  'Dato verificado y flor emocionada: combinación perfecta.',
  'Esto es casi tan emocionante como una roca con forma de corazón. Casi.',
];
let ultimosChistes = [];
let fijas = 0;
const esPeligro = (p) => Boolean(p?.hud && (BARRAS.some((b) => colorBarra(b, p[b]) === 'rojo') || p.minutos < 20));
export const pideChiste = (t) => /chiste|broma|joke/i.test(normalizar(t));

/** Respuesta fija sin IA. Devuelve { texto, fuente?, chiste? } (chiste = { id, ficha } para el botón "¿Es verdad?"). */
export function respaldo(pregunta, p, azar = Math.random) {
  if (pideChiste(pregunta)) {
    const posibles = CHISTES.filter((c) => !ultimosChistes.includes(c.id));
    const c = posibles[Math.floor(azar() * posibles.length)] ?? CHISTES[0];
    ultimosChistes = [...ultimosChistes, c.id].slice(-3);
    return { texto: c.texto, chiste: { id: c.id, ficha: c.dato ?? null } };
  }
  const t = normalizar(pregunta);
  let r;
  if (/como voy|me alcanza|cuanto (tiempo|me queda)|como estoy|how am i/.test(t)) r = { texto: comoVoy(p).map((x) => formatear(x, p ?? null)).join(' ') };
  else if (/quien eres|que eres|como te llamas|who are you/.test(t)) r = { texto: PRESENTACION };
  else {
    const { entrada, parcial, palabras: q } = buscarRespaldo(pregunta);
    const tarea = TAREA.test(t);
    if (entrada && !tarea) r = { texto: formatear(entrada.texto, p ?? null), fuente: entrada.fuente, ficha: entrada.ficha ?? null };
    else if (!tarea && TEMA.test(t)) {
      // De Marte, pero sin dato verificado: lo dice y sugiere dónde buscar en la Guía
      const donde = parcial?.parte ?? 'Parte 4 · Marte en datos';
      r = { texto: `${SIN_DATO}, así que no te voy a inventar una cifra. Busca en la Guía de supervivencia (ícono del libro), en «${donde}», o pregúntame por las barras, las capas del mapa o los peligros de Marte.`, sinDato: true };
    } else {
      // Otro tema (o una tarea) sin IA: con cariño, dice que necesita conexión y sugiere partes de la Guía relacionadas
      const partes = [...new Set([parcial?.parte, ...PARTES_GENERALES].filter(Boolean))].slice(0, 2);
      const inicio = tarea
        ? 'Me encantaría explicarte esa tarea paso a paso, pero para eso necesito conexión con la Tierra.'
        : FUERA_DE_TEMA[Math.floor(azar() * FUERA_DE_TEMA.length)];
      r = { texto: `${inicio} Mientras tanto, en la Guía de supervivencia (ícono del libro) tienes «${partes.join('» y «')}».`, fueraDeTema: true };
    }
  }
  fijas += 1;
  if (fijas % 3 === 0 && !esPeligro(p)) r.texto += ` ${REMATES[Math.floor(azar() * REMATES.length)]}`;
  return r;
}

const MOTIVO = {
  limite: null, // usa el mensaje de la API ("Mis pétalos necesitan recargar…")
  sin_api: SIN_CONEXION, sin_conexion: SIN_CONEXION, sin_ia: SIN_CONEXION, error: SIN_CONEXION,
};

/** Envía un mensaje. Devuelve la respuesta de Zinn-IA (ya agregada al historial). */
export async function enviar(texto, { partida = null, fichas = [] } = {}) {
  const limpio = String(texto ?? '').trim().slice(0, MAX_TEXTO);
  if (!limpio || estado.pensando) return null;
  if (enSemilla(partida)) return { id: siguienteId++, rol: 'zinnia', texto: SEMILLA, acciones: [], modo: 'semilla' }; // ni API ni respaldo
  const mensajes = [...estado.mensajes, { id: siguienteId++, rol: 'usuario', texto: limpio }];
  cambiar({ mensajes, pensando: true });
  const r = await chatZinnia({ mensajes: mensajes.slice(-MAX_ENVIADOS).map(({ rol, texto: t }) => ({ rol, texto: t })), contexto: contextoDe(partida, fichas) });
  let respuesta;
  if (r.modo === 'ia' || r.modo === 'semilla') respuesta = { id: siguienteId++, rol: 'zinnia', texto: r.texto, acciones: r.acciones ?? [], modo: r.modo };
  else {
    const f = respaldo(limpio, partida);
    const nota = r.motivo === 'limite' ? (r.error || 'Mis pétalos necesitan recargar, ¡pregúntame en un ratito!') : MOTIVO[r.motivo] ?? SIN_CONEXION;
    respuesta = { id: siguienteId++, rol: 'zinnia', texto: r.motivo === 'limite' ? `${nota} Mientras tanto: ${f.texto}` : `${f.texto} ${nota}`, fuente: f.fuente ?? null, chiste: f.chiste ?? null, acciones: [], modo: 'respaldo' };
  }
  cambiar({ mensajes: [...estado.mensajes, respuesta], pensando: false, modo: respuesta.modo === 'semilla' ? estado.modo : respuesta.modo });
  return respuesta;
}
